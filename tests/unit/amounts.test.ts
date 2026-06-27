import { describe, expect, it } from 'vitest';
import { fromStroops, sumAmounts, toStroops } from '@/server/stellar/money';

describe('stellar amount math', () => {
  it('converts decimal to stroops', () => {
    expect(toStroops('1')).toBe(10_000_000n);
    expect(toStroops('0.0000001')).toBe(1n);
    expect(toStroops('10.5')).toBe(105_000_000n);
  });

  it('round-trips through stroops', () => {
    for (const a of ['1', '0.1', '123.456', '0.0000001']) {
      expect(fromStroops(toStroops(a))).toBe(a);
    }
  });

  it('sums without float drift', () => {
    expect(sumAmounts(['0.1', '0.2'])).toBe('0.3');
    expect(sumAmounts(['100', '0.0000003', '0.0000004'])).toBe('100.0000007');
  });
});
