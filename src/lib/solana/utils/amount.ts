
/**
 * INSTITUTIONAL UNIT CONVERTER
 * Standardizes user input into blockchain-ready lamport strings.
 */

export function toLamports(amount: number | string, decimals: number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Use floor to prevent floating point overflow in lamports
  return Math.floor(num * Math.pow(10, decimals)).toString();
}
