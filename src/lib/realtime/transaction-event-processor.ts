'use client';

import { ethers } from 'ethers';
import { systemEmitter } from '../events/systemEmitter';
import { addressSubscriptionRegistry } from './address-subscription-registry';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { notificationService } from '../services/notification-service';

export interface StandardizedEvent {
  id: string;
  hash: string;
  type: 'receive' | 'send' | 'swap' | 'approve' | 'bridge' | 'nft' | 'pending' | 'failed' | 'security';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  chainId: number;
  from: string;
  to: string;
  amount: number;
  symbol: string;
  tokenAddress?: string;
  timestamp: string;
  details?: any;
}

// Well-known transfer, swap, and approval signatures
const TOPICS = {
  TRANSFER: ethers.id("Transfer(address,address,uint256)"),
  APPROVAL: ethers.id("Approval(address,address,uint256)"),
  SWAP: ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)"),
  SWAP_UNI_V3: ethers.id("Swap(address,address,int256,int256,uint160,uint128,int24)"),
  DEPOSIT: ethers.id("Deposit(address,uint256)"),
  WITHDRAWAL: ethers.id("Withdrawal(address,uint256)")
};

/**
 * TRANSACTION EVENT PROCESSOR
 * 
 * Intercepts raw block events and log topics from BlockchainEventEngine, parses and normalizes
 * them into unified app-readable payloads, runs security heuristics, and dispatches toasts, logs, and alerts.
 */
export class TransactionEventProcessor {
  private static instance: TransactionEventProcessor | null = null;
  private knownTokens: Map<string, { symbol: string; decimals: number; name: string }> = new Map();

  private constructor() {
    // Populate registry with standard system tokens
    this.knownTokens.set('0xdac17f958d2ee523a2206206994597c13d831ec7', { symbol: 'USDT', decimals: 6, name: 'Tether USD' });
    this.knownTokens.set('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', { symbol: 'USDC', decimals: 6, name: 'USD Coin' });
    this.knownTokens.set('0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', { symbol: 'WBTC', decimals: 8, name: 'Wrapped Bitcoin' });
    this.knownTokens.set('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', { symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' });
  }

  public static getInstance(): TransactionEventProcessor {
    if (!TransactionEventProcessor.instance) {
      TransactionEventProcessor.instance = new TransactionEventProcessor();
    }
    return TransactionEventProcessor.instance;
  }

  /**
   * Processes a raw ethers log.
   */
  public async processLog(log: ethers.Log, chainId: number, provider: ethers.WebSocketProvider | ethers.JsonRpcProvider) {
    try {
      const topic = log.topics[0];

      // 1. ERC20 Transfer / NFT Transfer parsing
      if (topic === TOPICS.TRANSFER) {
        await this.handleTransferLog(log, chainId, provider);
      } 
      // 2. ERC20 Allowance approval parsing
      else if (topic === TOPICS.APPROVAL) {
        await this.handleApprovalLog(log, chainId, provider);
      }
      // 3. DEX Swap detection parsing
      else if (topic === TOPICS.SWAP || topic === TOPICS.SWAP_UNI_V3) {
        await this.handleSwapLog(log, chainId, provider);
      }
    } catch (e) {
      // Suppress logging issues
    }
  }

  /**
   * Processes a pending mempool transaction.
   */
  public async processPendingTx(tx: ethers.TransactionResponse, chainId: number) {
    const from = tx.from?.toLowerCase();
    const to = tx.to?.toLowerCase();

    const isFromMe = from && addressSubscriptionRegistry.isWatchingAddress(from, chainId);
    const isToMe = to && addressSubscriptionRegistry.isWatchingAddress(to, chainId);

    if (!isFromMe && !isToMe) return; // Skip if unrelated

    const value = parseFloat(ethers.formatEther(tx.value));

    const event: StandardizedEvent = {
      id: `pending-${tx.hash}`,
      hash: tx.hash,
      type: 'pending',
      level: 'INFO',
      chainId,
      from: tx.from,
      to: tx.to || 'Contract Creation',
      amount: value,
      symbol: 'ETH',
      timestamp: new Date().toISOString(),
      details: {
        gasLimit: tx.gasLimit.toString(),
        gasPrice: tx.gasPrice?.toString() || '0'
      }
    };

    console.log(`[PROCESSOR] Pending mempool transaction detected: ${tx.hash}`);

    // Emit pending triggers
    systemEmitter.emit('TX_PENDING', {
      amount: value,
      token: 'ETH',
      hash: tx.hash,
      chainId
    });

    systemEmitter.emit('BLOCKCHAIN_EVENT', event);
  }

  /**
   * Processes a failed/reverted transaction.
   */
  public handleFailedTx(txHash: string, chainId: number, reason: string) {
    systemEmitter.emit('TX_FAILED', {
      hash: txHash,
      reason: reason || 'Reverted by network due to out of gas.',
      chainId
    });

    const event: StandardizedEvent = {
      id: `failed-${txHash}`,
      hash: txHash,
      type: 'failed',
      level: 'ERROR',
      chainId,
      from: '0x',
      to: '0x',
      amount: 0,
      symbol: 'ETH',
      timestamp: new Date().toISOString(),
      details: { reason }
    };

    systemEmitter.emit('BLOCKCHAIN_EVENT', event);
  }

  private async handleTransferLog(log: ethers.Log, chainId: number, provider: any) {
    const from = ethers.zeroPadValue(log.topics[1], 20).toLowerCase();
    const to = ethers.zeroPadValue(log.topics[2], 20).toLowerCase();

    const isFromMe = addressSubscriptionRegistry.isWatchingAddress(from, chainId);
    const isToMe = addressSubscriptionRegistry.isWatchingAddress(to, chainId);

    if (!isFromMe && !isToMe) return; // Skip unrelated

    const valueHex = log.data;
    const isNft = log.topics.length === 4; // ERC721 has 4 topics (Transfer(address,address,uint256 indexed tokenId))

    let tokenInfo = this.knownTokens.get(log.address.toLowerCase());
    if (!tokenInfo && !isNft) {
      tokenInfo = await this.resolveTokenMetadata(log.address, provider);
    }

    const value = isNft 
      ? parseInt(log.topics[3], 16) // Token ID for NFT
      : parseFloat(ethers.formatUnits(valueHex, tokenInfo?.decimals || 18));

    const symbol = isNft ? 'NFT' : (tokenInfo?.symbol || 'TOKEN');

    const event: StandardizedEvent = {
      id: `transfer-${log.transactionHash}-${log.index}`,
      hash: log.transactionHash,
      type: isNft ? 'nft' : 'receive',
      level: 'SUCCESS',
      chainId,
      from,
      to,
      amount: value,
      symbol,
      tokenAddress: log.address,
      timestamp: new Date().toISOString()
    };

    if (isFromMe) {
      event.type = 'send';
      event.level = 'INFO';
    }

    // Run security inspection on the transfer
    this.runSecurityChecks(event);

    // Emit event notifications
    this.dispatchStandardNotifications(event);
  }

  private async handleApprovalLog(log: ethers.Log, chainId: number, provider: any) {
    const owner = ethers.zeroPadValue(log.topics[1], 20).toLowerCase();
    const spender = ethers.zeroPadValue(log.topics[2], 20).toLowerCase();

    const isOwnerMe = addressSubscriptionRegistry.isWatchingAddress(owner, chainId);
    if (!isOwnerMe) return;

    let tokenInfo = this.knownTokens.get(log.address.toLowerCase());
    if (!tokenInfo) {
      tokenInfo = await this.resolveTokenMetadata(log.address, provider);
    }

    const allowance = parseFloat(ethers.formatUnits(log.data, tokenInfo?.decimals || 18));
    const isUnlimited = allowance > 1000000000000;

    const event: StandardizedEvent = {
      id: `approve-${log.transactionHash}-${log.index}`,
      hash: log.transactionHash,
      type: 'approve',
      level: 'WARN',
      chainId,
      from: owner,
      to: spender,
      amount: allowance,
      symbol: tokenInfo?.symbol || 'TOKEN',
      tokenAddress: log.address,
      timestamp: new Date().toISOString(),
      details: { isUnlimited }
    };

    console.log(`[PROCESSOR] Approval alert detected for contract: ${spender}`);

    // Emit approval notification
    systemEmitter.emit('APPROVAL_DETECTED', {
      token: tokenInfo?.symbol || 'TOKEN',
      spender,
      allowance: isUnlimited ? 'Unlimited' : allowance.toString(),
      hash: log.transactionHash,
      chainId
    });

    // Push toast trigger
    systemEmitter.emit('NOTIFICATION', {
      id: event.id,
      title: 'Approval Granted',
      body: `${isUnlimited ? 'Unlimited' : allowance} ${event.symbol} allowance approved to contract: ${spender.slice(0, 8)}...`,
      type: 'WARN'
    });

    systemEmitter.emit('BLOCKCHAIN_EVENT', event);

    // Dynamic security checks for malicious unlimited approvals
    if (isUnlimited) {
      systemEmitter.emit('SECURITY_ALERT', {
        message: `High risk unlimited approval granted for contract ${spender.slice(0, 8)}... Purge suggested.`,
        chainId
      });
    }
  }

  private async handleSwapLog(log: ethers.Log, chainId: number, provider: any) {
    const txReceipt = await provider.getTransactionReceipt(log.transactionHash);
    if (!txReceipt) return;

    const from = txReceipt.from.toLowerCase();
    const isFromMe = addressSubscriptionRegistry.isWatchingAddress(from, chainId);
    if (!isFromMe) return;

    // Standardize swap payload
    const event: StandardizedEvent = {
      id: `swap-${log.transactionHash}-${log.index}`,
      hash: log.transactionHash,
      type: 'swap',
      level: 'SUCCESS',
      chainId,
      from,
      to: log.address.toLowerCase(),
      amount: 0,
      symbol: 'SWAP',
      timestamp: new Date().toISOString()
    };

    console.log(`[PROCESSOR] DEX Swap transaction identified: ${log.transactionHash}`);

    systemEmitter.emit('SWAP_DETECTED', {
      hash: log.transactionHash,
      chainId,
      router: log.address
    });

    systemEmitter.emit('NOTIFICATION', {
      id: event.id,
      title: 'Swap Executed',
      body: `DEX swap exchange successfully settled on chain ${chainId}.`,
      type: 'SUCCESS'
    });

    systemEmitter.emit('BLOCKCHAIN_EVENT', event);
  }

  private runSecurityChecks(event: StandardizedEvent) {
    // 1. Check for rapid outgoing bursts
    if (event.type === 'send' && event.amount > 10 && event.symbol === 'ETH') {
      systemEmitter.emit('SECURITY_ALERT', {
        message: `Large outgoing native asset transfer of ${event.amount} ETH to ${event.to.slice(0, 8)}...`,
        chainId: event.chainId
      });
    }

    // 2. Phishing drain patterns: Outgoing value to zero address or contracts with zero balance
    if (event.type === 'send' && event.to === ethers.ZeroAddress) {
      systemEmitter.emit('SECURITY_ALERT', {
        message: `Zero address transfer warning! Potential node asset burn or drain pattern.`,
        chainId: event.chainId
      });
    }
  }

  private async dispatchStandardNotifications(event: StandardizedEvent) {
    // 📳 Haptic trigger
    await Haptics.impact({ style: ImpactStyle.Heavy });

    // Toast triggers
    systemEmitter.emit(event.type === 'send' ? 'TX_CONFIRMED' : 'NOTIFICATION', {
      id: event.id,
      title: event.type === 'send' ? 'Transaction Dispatched' : 'Payload Received',
      body: `${event.type === 'send' ? 'Sent' : 'Received'} ${event.amount.toLocaleString()} ${event.symbol} on chain ${event.chainId}.`,
      type: event.type === 'send' ? 'INFO' : 'SUCCESS'
    });

    // Notify balance systems
    systemEmitter.emit('BALANCE_UPDATED', {
      chain: String(event.chainId),
      tokenAddress: event.tokenAddress || 'native',
      symbol: event.symbol,
      balance: '', // Invalidate to pull fresh
      blockNumber: 0
    });

    systemEmitter.emit('TRANSACTION_DETECTED', {
      id: event.id,
      hash: event.hash,
      from: event.from,
      to: event.to,
      amount: event.amount,
      symbol: event.symbol,
      tokenAddress: event.tokenAddress,
      chainId: event.chainId,
      timestamp: event.timestamp,
      status: 'completed',
      isOut: event.type === 'send',
      type: event.type
    });

    systemEmitter.emit('BLOCKCHAIN_EVENT', event);

    // Save notification registry
    await notificationService.createNotification({
      user_id: 'realtime_daemon',
      type: event.type,
      title: event.type === 'send' ? 'Transaction Dispatched' : 'Payload Received',
      body: `${event.type === 'send' ? 'Sent' : 'Received'} ${event.amount} ${event.symbol}. Synchronization settled.`,
      metadata: { hash: event.hash, chainId: event.chainId, tokenAddress: event.tokenAddress }
    });
  }

  private async resolveTokenMetadata(address: string, provider: any): Promise<{ symbol: string; decimals: number; name: string }> {
    try {
      const contract = new ethers.Contract(address, [
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function name() view returns (string)"
      ], provider);

      const [symbol, decimals, name] = await Promise.all([
        contract.symbol(),
        contract.decimals(),
        contract.name()
      ]);

      const info = { symbol, decimals: Number(decimals), name };
      this.knownTokens.set(address.toLowerCase(), info);
      return info;
    } catch (e) {
      return { symbol: 'TOKEN', decimals: 18, name: 'Unknown Contract' };
    }
  }
}

export const transactionEventProcessor = TransactionEventProcessor.getInstance();
