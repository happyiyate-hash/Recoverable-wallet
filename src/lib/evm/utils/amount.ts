/**
 * EVM UNIT CONVERTER
 * Version: 1.0.0
 * Standardizes user input into blockchain-ready wei strings.
 */
export function toWei(amount: number, decimals: number) {
  return BigInt(Math.floor(amount * 10 ** decimals)).toString();
}
