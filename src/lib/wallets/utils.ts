import type { WalletWithMetadata } from '@/lib/types';
import { ethers } from 'ethers';
import * as xrpl from 'xrpl';

/**
 * INSTITUTIONAL SAFETY ENGINE: ADDRESS VALIDATOR
 * Version: 2.0.0 (BCH Safety Standard)
 * 
 * Rules:
 * 1. STRICT TYPE MATCHING: Addresses must match the chain protocol.
 * 2. NO CROSS-CHAIN FALLBACKS: Never return 0x... for UTXO chains.
 */

export function validateAddressForChain(address: string, chain: any): boolean {
  if (!address || !chain) return false;
  const type = chain.type || 'evm';
  const clean = address.trim();

  try {
    switch (type) {
      case 'evm':
        return clean.startsWith('0x') && ethers.isAddress(clean);
      
      case 'xrp':
        return clean.startsWith('r') && xrpl.isValidClassicAddress(clean);
      
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean);
      
      case 'btc':
        return clean.startsWith('bc1') || clean.startsWith('1') || clean.startsWith('3');

      case 'bitcoin-cash':
        // BCH modern cashaddr or legacy 1/3
        return clean.startsWith('bitcoincash:') || clean.startsWith('q') || clean.startsWith('p') || clean.startsWith('1') || clean.startsWith('3');

      case 'tron':
        return clean.startsWith('T') && clean.length === 34;

      case 'ltc':
        return clean.startsWith('ltc1') || clean.startsWith('L') || clean.startsWith('M');

      case 'doge':
        return clean.startsWith('D') && clean.length === 34;

      default:
        return true; // Assume true for unknown types to avoid blocking (or harden later)
    }
  } catch (e) {
    return false;
  }
}

/**
 * RESOLVES THE CORRECT ADDRESS FOR A GIVEN CHAIN
 * Fixed Version: No more 0x... fallback for non-EVM chains.
 */
export function getAddressForChain(chain: any, wallets: WalletWithMetadata[]): string | undefined {
  if (!wallets || !chain) return undefined;

  const targetType = chain.type || 'evm';
  const matchingWallet = wallets.find((w) => w.type === targetType);

  if (!matchingWallet) return undefined;

  // Final Validation Node
  const isValid = validateAddressForChain(matchingWallet.address, chain);
  return isValid ? matchingWallet.address : undefined;
}
