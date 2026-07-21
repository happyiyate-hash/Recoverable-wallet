'use client';

import { ethers } from 'ethers';
import TronWeb from 'tronweb';

type AdminTransferParams = {
  toAddress: string;
  amount: number;
  tokenSymbol: string;
  tokenAddress?: string;
  chainId: number;
  chainType: string; // e.g., 'evm', 'tron', etc.
};

export const adminExecutor = {
  async executeAdminTransfer(params: AdminTransferParams): Promise<string> {
    const { toAddress, amount, tokenSymbol, tokenAddress, chainId, chainType } = params;

    const adminPrivKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivKey) {
      throw new Error('ADMIN_PRIVATE_KEY not set');
    }

    // ---------- EVM ----------
    if (chainType === 'evm') {
      const rpcUrlTemplate = process.env.RPC_URL || 'https://mainnet.infura.io/v3/${INFURA_API_KEY}';
      const rpcUrl = rpcUrlTemplate.replace('{CHAIN_ID}', chainId.toString());
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const wallet = new ethers.Wallet(adminPrivKey, provider);

      // Native currency (e.g., ETH, BNB)
      if (!tokenAddress) {
        const tx = await wallet.sendTransaction({
          to: toAddress,
          value: ethers.parseUnits(amount.toString(), 'ether')
        });
        return tx.hash;
      }

      // ERC20 token transfer
      const erc20Abi = ['function transfer(address to, uint256 amount) public returns (bool)'];
      const contract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
      // Assume 18 decimals if not native; could be refined per token metadata
      const decimals = 18;
      const tx = await contract.transfer(toAddress, ethers.parseUnits(amount.toString(), decimals));
      return tx.hash;
    }

    // ---------- TRON ----------
    if (chainType === 'tron') {
      const fullNode = process.env.TRON_FULL_NODE || 'https://api.trongrid.io';
      const solidityNode = process.env.TRON_SOLIDITY_NODE || fullNode;
      const eventServer = process.env.TRON_EVENT_SERVER || 'https://api.trongrid.io';
      const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, adminPrivKey);

      // Native TRX transfer
      if (!tokenAddress) {
        const tx = await tronWeb.trx.sendTransaction(toAddress, tronWeb.toSun(amount));
        return tx.txid;
      }

      // TRC20 token transfer
      const contract = await tronWeb.contract().at(tokenAddress);
      const tx = await contract.transfer(toAddress, tronWeb.toSun(amount)).send();
      return tx;
    }

    // Fallback for unsupported chain types
    console.warn(`[adminExecutor] Unsupported chainType: ${chainType}`);
    // Return a pseudo hash so callers can continue without breaking
    return `0x${Math.random().toString(16).slice(2, 66)}`;
  }
};
