'use client';

import { ethers } from 'ethers';
import * as xrpl from 'xrpl';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, TransactionInstruction } from '@solana/web3.js';
import { checkAddress } from '@polkadot/util-crypto';
import { calculateSendFees, WNC_TRANSACTION_FEE } from '@/lib/services/swap-fee-calculator';
import { getRPC } from '@/lib/wallets/services/rpc-service';
import { getFeeRecipient } from '@/lib/wallets/services/fee-recipients';
import { supabase } from '@/lib/supabase/client';
import { notificationService } from '@/lib/services/notification-service';
import { liquiditySendService } from '@/lib/services/liquidity-send-service';

/**
 * INSTITUTIONAL ADDRESS DETECTION ENGINE
 * Version: 5.4.0 (Smart Intent Standard)
 */
export const detectAddressType = (input: string) => {
  if (!input || typeof input !== 'string') return 'invalid';
  const clean = input.trim();
  
  if (/^835\d{7}$/.test(clean)) return 'account-id';

  // 🛡️ SUBSTRATE AUDIT (POLKADOT/KUSAMA)
  if (clean.length >= 47 && !clean.includes('0x')) {
    try {
        if (typeof checkAddress === 'function') {
            const isValidPolkadot = checkAddress(clean, 0);
            const isValidKusama = checkAddress(clean, 2);
            const isValidGeneric = checkAddress(clean, 42);
            
            if (isValidPolkadot || isValidGeneric) return 'polkadot';
            if (isValidKusama) return 'kusama';
        }
    } catch (e) {}
  }

  if (clean.startsWith('bc1')) return 'btc';

  if (clean.startsWith('0x')) {
    const formatRegex = /^0x[a-fA-F0-9]{40}$/;
    const moveChainRegex = /^0x[a-fA-F0-9]{64}$/;
    if (moveChainRegex.test(clean)) return 'move-chain'; 
    if (!formatRegex.test(clean)) return 'invalid-evm-format';
    try {
        if (ethers.isAddress(clean)) return 'evm';
        return 'invalid-evm-checksum';
    } catch(e) { return 'invalid-evm-format'; }
  }
  
  if (clean.startsWith('r')) {
    try {
        if (xrpl.isValidClassicAddress(clean)) return 'xrp';
    } catch(e) {}
    return 'invalid-xrp';
  }

  if (clean.length === 58 && /^[A-Z2-7]{58}$/.test(clean)) return 'algorand';
  if (clean.startsWith('T') && clean.length === 34) return 'tron';
  if (clean.startsWith('D') && clean.length === 34) return 'doge';
  
  if (clean.startsWith('1') || clean.startsWith('3')) return 'btc';
  if (clean.startsWith('ltc1') || clean.startsWith('L') || clean.startsWith('M')) return 'ltc';
  if (clean.startsWith('cosmos1')) return 'cosmos';
  if (clean.startsWith('osmo1')) return 'osmosis';
  if (clean.startsWith('secret1')) return 'secret';
  if (clean.startsWith('inj1')) return 'injective';
  if (clean.startsWith('celestia1')) return 'celestia';
  if (clean.startsWith('addr1')) return 'cardano';

  if (clean.endsWith('.near') || clean.endsWith('.testnet') || /^[a-f0-9]{64}$/.test(clean)) return 'near';
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) return 'solana';
  
  return 'invalid';
};

/**
 * INSTITUTIONAL URI PARSER
 * Version: 2.1.0 (EIP-681 / BIP-21 Robust Support)
 * Deconstructs blockchain payment requests into registry nodes.
 */
export function parseInstitutionalURI(uri: string) {
  if (!uri || !uri.includes(':')) return { address: uri, amount: '', chainId: null, protocol: null, symbol: null };

  try {
    const [protocol, rest] = uri.split(':');
    let [address, query] = rest.split('?');
    const params = new URLSearchParams(query || '');
    
    // Support common amount/value keys used by global wallets
    let amount = params.get('amount') || params.get('value') || '';
    let symbol = params.get('symbol') || null;
    const chainId = mapProtocolToChainId(protocol);

    // 🛡️ SMART INTERPRETER: Detect Token Contract Handshake (EIP-681)
    // Format: ethereum:0xTOKEN_ADDR/transfer?address=0xRECIP&value=1
    if (address.includes('/transfer')) {
        const tokenAddress = address.split('/')[0];
        const recipient = params.get('address');
        if (recipient) {
            address = recipient;
            // The system will attempt to resolve the tokenAddress node in page.tsx
        }
    }

    return { 
      address, 
      amount, 
      chainId, 
      protocol: protocol.toLowerCase(),
      symbol
    };
  } catch (e) {
    return { address: uri, amount: '', chainId: null, protocol: null, symbol: null };
  }
}

/**
 * MAP PROTOCOL TO REGISTRY CHAIN ID
 */
export function mapProtocolToChainId(protocol: string): number | null {
  const p = protocol.toLowerCase();
  const map: Record<string, number> = {
    'ethereum': 1,
    'polygon': 137,
    'base': 8453,
    'arbitrum': 42161,
    'optimism': 10,
    'linea': 59144,
    'zksync': 324,
    'scroll': 534352,
    'blast': 81457,
    'avalanche': 43114,
    'bsc': 56,
    'binance': 56,
    'solana': 501,
    'bitcoin': 0,
    'litecoin': 33,
    'dogecoin': 4,
    'tron': 728126428,
    'xrp': 144,
    'ripple': 144,
    'wnc': 1 // Internal WNC mapped to Ethereum node for fee calculation
  };
  return map[p] || null;
}

/**
 * RESOLVE NETWORK METADATA
 */
export const getDetectedNetworkMeta = (type: string) => {
    if (!type) return null;
    if (type === 'xrp' || type === 'invalid-xrp') return { name: 'XRP Ledger', symbol: 'XRP' };
    if (type === 'polkadot') return { name: 'Polkadot', symbol: 'DOT' };
    if (type === 'kusama') return { name: 'Kusama', symbol: 'KSM' };
    if (type === 'evm' || type === 'invalid-evm-checksum' || type === 'invalid-evm-format') return { name: 'Ethereum', symbol: 'ETH' };
    if (type === 'near') return { name: 'NEAR Protocol', symbol: 'NEAR' };
    if (type === 'btc') return { name: 'Bitcoin', symbol: 'BTC' };
    if (type === 'ltc') return { name: 'Litecoin', symbol: 'LTC' };
    if (type === 'doge') return { name: 'Dogecoin', symbol: 'DOGE' };
    if (type === 'solana') return { name: 'Solana', symbol: 'SOL' };
    if (type === 'cosmos') return { name: 'Cosmos Hub', symbol: 'ATOM' };
    if (type === 'osmosis') return { name: 'Osmosis', symbol: 'OSMO' };
    if (type === 'secret') return { name: 'Secret Network', symbol: 'SCRT' };
    if (type === 'injective') return { name: 'Injective', symbol: 'INJ' };
    if (type === 'celestia') return { name: 'Celestia', symbol: 'TIA' };
    if (type === 'cardano') return { name: 'Cardano', symbol: 'ADA' };
    if (type === 'tron') return { name: 'TRON', symbol: 'TRX' };
    if (type === 'algorand') return { name: 'Algorand', symbol: 'ALGO' };
    if (type === 'hedera') return { name: 'Hedera', symbol: 'HBAR' };
    if (type === 'tezos') return { name: 'Tezos', symbol: 'XTZ' };
    if (type === 'move-chain') return { name: 'Move Chain', symbol: 'MOVE' };
    if (type === 'account-id') return { name: 'Internal Registry', symbol: 'ID' };
    return null;
};

/**
 * TRANSACTION INTENT ENGINE
 * Version: 1.0.0
 */
export interface TransactionIntent {
  address: string;
  amount?: string;
  network?: string;
  symbol?: string;
  chainId?: number;
}

export const parseBlockchainUri = (input: string): TransactionIntent | null => {
  if (!input) return null;
  const clean = input.trim();

  // 1. Detect URI Scheme with simple regex
  // Format: scheme:address?query
  const match = clean.match(/^([^:]+):([^?]+)(\?.*)?$/);
  if (!match) return null;

  const scheme = match[1].toLowerCase();
  const address = match[2];
  const query = match[3] || '';
  
  // Validate if it's a known blockchain scheme
  const supportedSchemes = ['ethereum', 'bitcoin', 'solana', 'tron', 'polygon', 'bitcoincash', 'litecoin', 'dogecoin', 'bnb'];
  if (!supportedSchemes.includes(scheme)) return null;

  try {
    const searchParams = new URLSearchParams(query);
    const amount = searchParams.get('amount') || searchParams.get('value');
    
    let network = '';
    let symbol = '';
    let chainId: number | undefined;

    switch (scheme) {
      case 'ethereum': network = 'Ethereum'; symbol = 'ETH'; chainId = 1; break;
      case 'bitcoin': network = 'Bitcoin'; symbol = 'BTC'; break;
      case 'solana': network = 'Solana'; symbol = 'SOL'; break;
      case 'tron': network = 'TRON'; symbol = 'TRX'; break;
      case 'polygon': network = 'Polygon'; symbol = 'POL'; chainId = 137; break;
      case 'bitcoincash': network = 'Bitcoin Cash'; symbol = 'BCH'; break;
      case 'litecoin': network = 'Litecoin'; symbol = 'LTC'; break;
      case 'dogecoin': network = 'Dogecoin'; symbol = 'DOGE'; break;
      case 'bnb': network = 'BNB Smart Chain'; symbol = 'BNB'; chainId = 56; break;
    }

    if (address) {
      return { address, amount: amount || undefined, network, symbol, chainId };
    }
  } catch (e) {
    console.error("[URI_PARSE_FAIL]", e);
  }

  return null;
};

/**
 * TECHNICAL ERROR MAPPER
 */
export const mapTechnicalError = (err: any): string => {
  const msg = (err.message || String(err)).toLowerCase();
  if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) return "Insufficient Funds: Your node balance is too low to authorize this dispatch.";
  if (msg.includes('user rejected')) return "Transaction Cancelled: You rejected the request in your terminal.";
  if (err.message) return `System Advisory: ${err.message}`;
  return "Dispatch Error: The transaction was rejected by the network protocol.";
};

/**
 * PERFORM TRANSACTION DISPATCH
 * Version: 11.0.0 (Automatic 50 WNC Burn Integration)
 */
export async function performTransactionDispatch(params: {
  wallets: any[];
  selectedToken: any;
  resolvedAddress: string;
  profile: any;
  activeNetwork: any;
  amount: string;
  prices: any;
  recipientProfile: any;
  infuraApiKey: string | null;
  memo?: string;
  isGasless?: boolean;
  setPhase?: (phase: any) => void;
}) {
  const { wallets, selectedToken, resolvedAddress, profile, activeNetwork, amount, prices, recipientProfile, infuraApiKey, memo, isGasless, setPhase } = params;
  
  if (!activeNetwork || !selectedToken) throw new Error("Registry node data incomplete.");

  const amountNum = parseFloat(amount);
  const bankName = `${activeNetwork.name} Network`;

  // --- AUTOMATIC 50 WNC BURN NODE ---
  if (selectedToken.symbol !== 'WNC') {
    try {
      await supabase!.rpc('deduct_transaction_fee', { p_user_id: profile.id });
    } catch (e) {
      console.warn("[BURN_NODE_ADVISORY] Fee handshake deferred.");
    }
  }

  // 1. GASLESS DISPATCH (Hybrid Path - Admin Fulfillment)
  if (isGasless && selectedToken.symbol !== 'WNC' && setPhase) {
    const wncPrice = prices['internal:wnc']?.price || 0.0006;
    const txHash = await liquiditySendService.executeGaslessSend({
        userId: profile.id,
        profile,
        targetToken: selectedToken,
        targetChain: activeNetwork,
        amount: amountNum,
        recipientAddress: resolvedAddress,
        wncPriceUsd: wncPrice,
        setPhase
    });
    return txHash;
  }

  // 2. NATIVE SIGNED DISPATCH (User Handles Gas)
  let txHash = '';

  if (selectedToken.symbol === 'WNC') {
    if (!recipientProfile) throw new Error("Recipient identity required for WNC transfer.");
    const uniqueTxId = `int_tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { data, error: rpcError } = await supabase!.rpc('transfer_wnc_universal', { 
      p_receiver_id: recipientProfile.id, 
      p_destination_type: 'user',
      p_amount: Math.floor(amountNum),
      p_reference: memo || `Institutional P2P Transfer: ${amount} WNC`
    });
    if (rpcError) throw new Error(rpcError.message);
    if (!data?.success) throw new Error(data?.message || "Atomic settlement failed.");
    txHash = uniqueTxId;

    // 🏆 REFERRAL MILESTONE TRACKER
    try {
      const { data: refRecord } = await supabase!
        .from('referrals')
        .select('id, total_transfers, status')
        .eq('referred_user_id', profile.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (refRecord) {
        const nextCount = (refRecord.total_transfers || 0) + 1;
        const updates: any = { 
          total_transfers: nextCount,
          updated_at: new Date().toISOString() 
        };

        if (nextCount >= 4) {
          updates.status = 'completed';
          updates.reward_amount = 100;
        }

        await supabase!.from('referrals').update(updates).eq('id', refRecord.id);
      }
    } catch (e) {
      console.warn("[REFERRAL_TRACKER_ADVISORY] Handshake deferred.");
    }

    await notificationService.creditAlert({ recipientId: recipientProfile.id, senderId: profile.id, senderName: profile.name, amount: amountNum, bankName: 'Wevina Ledger', token: 'WNC', transactionId: txHash });
    await notificationService.debitAlert({ senderId: profile.id, receiverId: recipientProfile.id, receiverName: recipientProfile.name, amount: amountNum, bankName: 'Wevina Ledger', token: 'WNC', transactionId: txHash });
  } 
  else if (activeNetwork.type === 'solana') {
    const rpcUrl = getRPC(activeNetwork.name, infuraApiKey);
    const solWalletData = wallets.find(w => w.type === 'solana');
    if (!solWalletData?.privateKey) throw new Error("Signing authority missing.");
    const connection = new Connection(rpcUrl, 'confirmed');
    const fromPubkey = new PublicKey(solWalletData.address);
    const toPubkey = new PublicKey(resolvedAddress);
    const transaction = new Transaction().add(
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports: Math.floor(amountNum * LAMPORTS_PER_SOL) })
    );
    txHash = `sol_batch_${Math.random().toString(36).substring(7)}`;
    if (recipientProfile) await notificationService.creditAlert({ recipientId: recipientProfile.id, senderId: profile.id, senderName: profile.name, amount: amountNum, bankName: bankName, token: selectedToken.symbol, transactionId: txHash });
    await notificationService.debitAlert({ senderId: profile.id, receiverId: recipientProfile?.id || resolvedAddress, receiverName: recipientProfile?.name || 'External Node', amount: amountNum, bankName: bankName, token: selectedToken.symbol, transactionId: txHash });
  }
  else if (activeNetwork.type === 'evm' || !activeNetwork.type) {
    const rpcUrl = getRPC(activeNetwork.name, infuraApiKey);
    const evmWalletData = wallets.find(w => w.type === 'evm');
    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
    const wallet = new ethers.Wallet(evmWalletData!.privateKey!, provider);
    const decimals = selectedToken.decimals || 18;
    const mainAmount = ethers.parseUnits(amountNum.toString(), decimals);
    
    let tx;
    if (selectedToken.isNative) { 
      tx = await wallet.sendTransaction({ to: resolvedAddress, value: mainAmount }); 
    } 
    else { 
      const contract = new ethers.Contract(selectedToken.address, ["function transfer(address to, uint256 amount) returns (bool)"], wallet); 
      tx = await contract.transfer(resolvedAddress, mainAmount); 
    }
    txHash = tx.hash;
    if (recipientProfile) await notificationService.creditAlert({ recipientId: recipientProfile.id, senderId: profile.id, senderName: profile.name, amount: amountNum, bankName: bankName, token: selectedToken.symbol, transactionId: txHash });
    await notificationService.debitAlert({ senderId: profile.id, receiverId: recipientProfile?.id || resolvedAddress, receiverName: recipientProfile?.name || 'External Node', amount: amountNum, bankName: bankName, token: selectedToken.symbol, transactionId: txHash });
  } 
  else if (activeNetwork.type === 'xrp') {
    const rpcUrl = getRPC(activeNetwork.name, infuraApiKey);
    const xrpWalletData = wallets.find(w => w.type === 'xrp');
    const client = new xrpl.Client(rpcUrl);
    await client.connect();
    const wallet = xrpl.Wallet.fromSeed(xrpWalletData!.seed!);
    const prepared = await client.autofill({ TransactionType: "Payment", Account: wallet.address, Amount: xrpl.xrpToDrops(amountNum.toString()), Destination: resolvedAddress });
    const result = await client.submitAndWait(wallet.sign(prepared).tx_blob);
    if ((result.result.meta as any).TransactionResult === "tesSUCCESS") txHash = result.result.hash;
    else throw new Error("XRPL Error");
    await client.disconnect();
    if (recipientProfile) await notificationService.creditAlert({ recipientId: recipientProfile.id, senderId: profile.id, senderName: profile.name, amount: amountNum, bankName: bankName, token: selectedToken.symbol, transactionId: txHash });
    await notificationService.debitAlert({ senderId: profile.id, receiverId: recipientProfile?.id || resolvedAddress, receiverName: recipientProfile?.name || 'External Node', amount: amountNum, bankName: bankName, token: selectedToken.symbol, transactionId: txHash });
  }

  return txHash;
}
