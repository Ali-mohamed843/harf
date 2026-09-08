import { describe, expect, it } from 'vitest';
import { fontMetrics, type ArabicFontMetrics } from './index';

describe('@harf/fonts registry', () => {
  it('is frozen so consumers cannot mutate the shared registry', () => {
    expect(Object.isFrozen(fontMetrics)).toBe(true);
  });

  it('holds only well-formed metric presets', () => {
    for (const [key, metrics] of Object.entries(fontMetrics) as [
      string,
      ArabicFontMetrics,
    ][]) {
      expect(metrics.family).toBe(key);
      expect(metrics.lineHeightMultiplier).toBeGreaterThan(0);
      expect(metrics.opticalSizeAdjust).toBeGreaterThan(0);
      expect(metrics.safePaddingVertical).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(metrics.latinFallbacks)).toBe(true);
    }
  });
});
