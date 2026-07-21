/**
 * INSTITUTIONAL FEE CALCULATION
 * Version: 1.0.0
 * Strictly applies the 1.1% platform fee for institutional swaps.
 */

export function applyPlatformFee(amount: number) {
  const fee = amount * 0.011; // 1.1%
  const userAmount = amount - fee;

  return {
    fee,
    userAmount
  };
}
