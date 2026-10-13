import { describe, expect, it } from 'vitest';

import { formatBrDate, parseBrDate, parseDecimal } from '../dates';

describe('dates', () => {
  it('parses Brazilian dates and rejects impossible ones', () => {
    expect(parseBrDate('5/3/1995')).toBe('1995-03-05');
    expect(parseBrDate('31/02/2026')).toBeNull();
    expect(parseBrDate('2026-01-01')).toBeNull();
    expect(formatBrDate('1995-03-05')).toBe('05/03/1995');
  });
  it('parses decimals with comma', () => {
    expect(parseDecimal('82,5')).toBe(82.5);
    expect(parseDecimal('')).toBeNull();
    expect(parseDecimal('abc')).toBeNull();
  });
});
