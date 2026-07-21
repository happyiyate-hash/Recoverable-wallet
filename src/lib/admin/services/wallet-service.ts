'use server';

import { ethers } from 'ethers';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import * as xrpl from 'xrpl';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { RPC_NODES } from '../config/blockchain';

/**
 * MASTER ADMIN WALLET SERVICE
 * Version: 2.2.0 (Named Exports Standard)
 * 
 * Orchestrates multi-chain signing using the Master Admin Mnemonic.
 */

const ADMIN_PHRASE = process.env.ADMIN_SECRET_PHRASE || "chelsea ship purity expose enact sugar present merit weather case wet match welcome";

export interface SigningRequest {
  toAddress: string;
  amount: number;
  tokenSymbol: string;
  tokenAddress?: string;
  chainId: number;
  chainType: string;
}

export interface BalanceRequest {
  address: string;
  tokenSymbol: string;
  tokenAddress?: string;
  chainId: number;
  chainType: string;
}

/**
 * Universal Dispatcher for Admin Liquidity.
 */
export async function signAndSend(request: SigningRequest): Promise<string> {
  console.log(`[ADMIN_SIGNER] Dispatching: ${request.amount} ${request.tokenSymbol} to ${request.toAddress}`);
  
  try {
    switch (request.chainType.toLowerCase()) {
      case 'evm':
        return await sendEVM(request);
      case 'solana':
        return await sendSolana(request);
      case 'xrp':
        return await sendXRP(request);
      default:
        throw new Error(`UNSUPPORTED_CHAIN: ${request.chainType}`);
    }
  } catch (error: any) {
    console.error("[ADMIN_SIGNER_FAIL]", error.message);
    throw error;
  }
}

/**
 * Fetches the balance of an address on any supported chain.
 * Used for institutional liquidity audits.
 */
export async function getBalance(req: BalanceRequest): Promise<number> {
  try {
    switch (req.chainType.toLowerCase()) {
      case 'evm': {
        const rpcUrl = RPC_NODES[req.chainId]?.replace('{API_KEY}', process.env.ADMIN_INFURA_KEY || '') || 'https://mainnet.infura.io/v3/placeholder';
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        if (!req.tokenAddress || req.tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          const bal = await provider.getBalance(req.address);
          return parseFloat(ethers.formatEther(bal));
        } else {
          const abi = ["function balanceOf(address owner) view returns (uint256)"];
          const contract = new ethers.Contract(req.tokenAddress, abi, provider);
          const bal = await contract.balanceOf(req.address);
          return parseFloat(ethers.formatUnits(bal, 18));
        }
      }
      case 'solana': {
        const connection = new Connection(RPC_NODES[501], 'confirmed');
        const bal = await connection.getBalance(new PublicKey(req.address));
        return bal / 1_000_000_000;
      }
      case 'xrp': {
        const client = new xrpl.Client(RPC_NODES['xrp']);
        await client.connect();
        const response = await client.request({
          command: "account_info",
          account: req.address,
          ledger_index: "validated"
        });
        await client.disconnect();
        return parseFloat(xrpl.dropsToXrp(response.result.account_data.Balance));
      }
      default:
        return 0;
    }
  } catch (e) {
    console.warn("[ADMIN_BALANCE_FAIL] Deferred balance check.");
    return 0;
  }
}

async function sendEVM(req: SigningRequest): Promise<string> {
  const rpcUrl = RPC_NODES[req.chainId]?.replace('{API_KEY}', process.env.ADMIN_INFURA_KEY || '') || 'https://mainnet.infura.io/v3/placeholder';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = ethers.Wallet.fromPhrase(ADMIN_PHRASE).connect(provider);
  
  if (!req.tokenAddress || req.tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    const tx = await wallet.sendTransaction({
      to: req.toAddress,
      value: ethers.parseEther(req.amount.toString())
    });
    return tx.hash;
  } else {
    const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
    const contract = new ethers.Contract(req.tokenAddress, abi, wallet);
    const tx = await contract.transfer(req.toAddress, ethers.parseUnits(req.amount.toString(), 18));
    return tx.hash;
  }
}

async function sendSolana(req: SigningRequest): Promise<string> {
  const connection = new Connection(RPC_NODES[501], 'confirmed');
  const seed = await bip39.mnemonicToSeed(ADMIN_PHRASE);
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key;
  const signer = Keypair.fromSeed(derivedSeed);
  
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: signer.publicKey,
      toPubkey: new PublicKey(req.toAddress),
      lamports: Math.floor(req.amount * 1_000_000_000),
    })
  );

  return await sendAndConfirmTransaction(connection, transaction, [signer]);
}

async function sendXRP(req: SigningRequest): Promise<string> {
  const client = new xrpl.Client(RPC_NODES['xrp']);
  await client.connect();
  const wallet = xrpl.Wallet.fromMnemonic(ADMIN_PHRASE);
  const prepared = await client.autofill({
    TransactionType: "Payment",
    Account: wallet.address,
    Amount: xrpl.xrpToDrops(req.amount.toString()),
    Destination: req.toAddress,
  });
  const result = await client.submitAndWait(wallet.sign(prepared).tx_blob);
  await client.disconnect();
  return result.result.hash;
}
