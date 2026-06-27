/** Stellar amounts use 7 decimal places (stroops = 1e7). */
const SCALE = 10_000_000n;

/** Convert a decimal amount string (e.g. "10.5") to stroops bigint. */
export function toStroops(amount: string): bigint {
  const [whole, frac = ''] = amount.trim().split('.');
  const fracPadded = frac.padEnd(7, '0').slice(0, 7);
  const sign = whole.startsWith('-') ? -1n : 1n;
  const wholeAbs = whole.replace('-', '') || '0';
  return sign * (BigInt(wholeAbs) * SCALE + BigInt(fracPadded || '0'));
}

/** Convert stroops bigint back to a trimmed decimal string. */
export function fromStroops(stroops: bigint): string {
  const neg = stroops < 0n;
  const n = neg ? -stroops : stroops;
  const whole = n / SCALE;
  const frac = (n % SCALE).toString().padStart(7, '0').replace(/0+$/, '');
  const body = frac ? `${whole}.${frac}` : whole.toString();
  return neg ? `-${body}` : body;
}

/** Sum a list of decimal amount strings safely (no float drift). */
export function sumAmounts(amounts: string[]): string {
  const total = amounts.reduce((acc, a) => acc + toStroops(a), 0n);
  return fromStroops(total);
}

/** Normalise a user-entered amount to a valid 7dp decimal string, or throw shape. */
export function isValidAmount(amount: string): boolean {
  if (!/^\d+(\.\d{1,7})?$/.test(amount.trim())) return false;
  return toStroops(amount) > 0n;
}
