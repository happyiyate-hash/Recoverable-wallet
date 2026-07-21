import { ethers } from 'ethers';
import * as xrpl from 'xrpl';

/**
 * INSTITUTIONAL VALIDATOR UTILITY
 * Version: 1.0.0
 */

export const validator = {
  isValidAddress(address: string, chainType: string): boolean {
    if (!address) return false;
    
    switch (chainType.toLowerCase()) {
      case 'evm':
        return ethers.isAddress(address);
      case 'xrp':
        return xrpl.isValidClassicAddress(address);
      case 'solana':
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      default:
        return false;
    }
  },

  validateAmount(amount: number): boolean {
    return amount > 0 && !isNaN(amount);
  }
};
