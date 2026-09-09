/**
 * Every literal output the READMEs claim for `@harf/fonts`.
 *
 * See `packages/core/src/readme.test.ts` for the rule these files enforce:
 * no README states a result that is not backed by a test.
 */

import { describe, expect, it } from 'vitest';
import { arabicSafeText, fontFamilyStack } from './index';

describe('@harf/fonts README — the worked example', () => {
  it('produces the documented output for Cairo at 16', () => {
    const style = arabicSafeText({ family: 'Cairo', fontSize: 16 });
    expect(style.fontSize).toBe(16);
    expect(style.lineHeight).toBe(28);
    expect(style.paddingVertical).toBe(1.6);
    expect(style.fontFamily).toBe('Cairo, Inter, "Helvetica Neue", Arial, sans-serif');
  });

  it('matches every multiplier in the README table', () => {
    const claimed: Record<string, number> = {
      Rubik: 1.5,
      Tajawal: 1.6,
      'IBM Plex Sans Arabic': 1.6,
      Changa: 1.65,
      Almarai: 1.7,
      'Noto Sans Arabic': 1.7,
      Cairo: 1.75,
      'Noto Naskh Arabic': 2.0,
      Lateef: 2.0,
      Amiri: 2.1,
    };
    for (const [family, multiplier] of Object.entries(claimed)) {
      expect(arabicSafeText({ family, fontSize: 100 }).lineHeight).toBe(multiplier * 100);
    }
  });

  it('produces the documented fallback chain', () => {
    expect(fontFamilyStack('Cairo')).toBe(
      'Cairo, Inter, "Helvetica Neue", Arial, sans-serif',
    );
  });
});
