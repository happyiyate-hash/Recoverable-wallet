/**
 * Human-readable to SUN (1e6)
 */
export function toSun(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Use floor to prevent floating point overflow in Sun units
  return Math.floor(num * 1_000_000).toString();
}
