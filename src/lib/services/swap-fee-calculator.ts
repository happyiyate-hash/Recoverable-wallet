import { getGasFee } from "../wallets/services/fee-service";
import { getFeeRecipient } from "../wallets/services/fee-recipients";

/**
 * INSTITUTIONAL FEE & VALIDATION ENGINE
 * Version: 8.0.0 (50 WNC Burn Node Standard)
 */

const MIN_SWAP_USD_HIGH = 2.00; 
const MIN_SWAP_USD_LOW = 0.10;  
const GAS_BUFFER_USD = 0.10; 

// FIXED REVENUE NODE (Supplied by Admin)
export const WNC_TRANSACTION_FEE = 50;

const HIGH_VALUE_TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'MATIC', 'ARB', 'OP', 'DOT', 'LINK'];

const RESTRICTED_PAIRS = [
  { from: 'BTC', to: 'USDT' },
];

export function checkPairRestriction(fromSymbol: string, toSymbol: string): { isRestricted: boolean; message?: string } {
  const isRestricted = RESTRICTED_PAIRS.some(
    pair => pair.from === fromSymbol.toUpperCase() && pair.to === toSymbol.toUpperCase()
  );

  if (isRestricted) {
    return {
      isRestricted: true,
      message: "⚠️ This swap is currently unavailable. Support for this pair will be added in a future update."
    };
  }

  return { isRestricted: false };
}

export function validateSwapAmount(amount: number, tokenSymbol: string, tokenPriceUsd: number) {
  const amountUsd = amount * tokenPriceUsd;
  const isHighValue = HIGH_VALUE_TOKENS.includes(tokenSymbol.toUpperCase());
  const minRequired = isHighValue ? MIN_SWAP_USD_HIGH : MIN_SWAP_USD_LOW;

  if (amountUsd < minRequired) {
    throw new Error(`Amount below minimum limit ($${minRequired.toFixed(2)} USD equivalent required).`);
  }

  return true;
}

/**
 * Calculates the total WNC sponsorship fee for a gasless transaction.
 * Breakdown: (Estimated Gas USD / WNC Price) + 50 WNC Fixed Admin Fee.
 */
export async function calculateWncGaslessFee(chain: string, wncPriceUsd: number) {
    const blockchainFee = await getGasFee(chain);
    const gasUsd = blockchainFee.usdFee;
    
    // INSTITUTIONAL STANDARDS
    const adminFeeWnc = WNC_TRANSACTION_FEE;
    const gasFeeWnc = Math.ceil(gasUsd / (wncPriceUsd || 0.0006));
    
    const totalWncFee = gasFeeWnc + adminFeeWnc;
    
    return {
        gasFeeWnc,
        adminFeeWnc,
        wncFee: totalWncFee
    };
}

export async function calculateSendFees(amountUsd: number, chain: string) {
    const blockchainFee = await getGasFee(chain);
    const networkFeeUSD = blockchainFee.estimatedFeeUSD;
    const recipient = getFeeRecipient(chain);

    const adminFee = 0.05;

    return {
      amountUsd,
      adminFee,
      networkFee: networkFeeUSD,
      totalProtocolFee: adminFee + networkFeeUSD,
      feeRecipient: recipient
    };
}

export async function calculateSwapFees(
  rawAmountUsd: number,
  fromChain: string,
  toChain?: string,
  adminFeePercentage?: number
) {
  const sourceGas = await getGasFee(fromChain);
  let totalGasUsd = sourceGas.estimatedFeeUSD;

  if (toChain && toChain.toLowerCase() !== fromChain.toLowerCase()) {
    const targetGas = await getGasFee(toChain);
    totalGasUsd += targetGas.estimatedFeeUSD;
  } else {
    totalGasUsd *= 1.5; 
  }

  totalGasUsd += GAS_BUFFER_USD;

  const percentage = adminFeePercentage ?? 0.01; 
  let adminFee = rawAmountUsd * percentage;

  if (adminFee < 0.05) {
    adminFee = 0.05;
  }

  const totalNetworkFee = adminFee + totalGasUsd;

  return {
    rawAmountUsd,
    adminFee,
    blockchainFee: totalGasUsd,
    networkFee: totalNetworkFee,
    feeRecipient: getFeeRecipient(fromChain)
  };
}
