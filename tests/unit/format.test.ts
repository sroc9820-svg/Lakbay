import { describe, expect, it } from 'vitest';
import { explorerTx, fmtAmount, shorten } from '@/ui/lib/api';

describe('ui formatting helpers', () => {
  it('shortens stellar addresses', () => {
    const g = 'GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47';
    expect(shorten(g)).toBe('GBL5…IE47');
    expect(shorten('short')).toBe('short');
  });

  it('formats amounts', () => {
    expect(fmtAmount('1000')).toBe('1,000');
    expect(fmtAmount('0')).toBe('0');
    expect(fmtAmount('bad')).toBe('0');
  });

  it('builds testnet explorer links', () => {
    expect(explorerTx('abc')).toContain('/testnet/tx/abc');
  });
});
