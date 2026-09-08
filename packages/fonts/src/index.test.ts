import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ARABIC_METRICS,
  arabicSafeText,
  fontFamilyStack,
  fontMetrics,
  knownFamilies,
  metricsFor,
  type ArabicFontMetrics,
} from './index';

describe('the registry', () => {
  it('is frozen, and so is every preset in it', () => {
    expect(Object.isFrozen(fontMetrics)).toBe(true);
    for (const metrics of Object.values(fontMetrics)) {
      expect(Object.isFrozen(metrics)).toBe(true);
    }
  });

  it('keys every preset by its own family name', () => {
    for (const [key, metrics] of Object.entries(fontMetrics)) {
      expect(metrics.family).toBe(key);
    }
  });

  it('gives every preset a plausible, well-formed set of numbers', () => {
    for (const metrics of Object.values(fontMetrics) as ArabicFontMetrics[]) {
      expect(metrics.lineHeightMultiplier).toBeGreaterThan(1);
      expect(metrics.lineHeightMultiplier).toBeLessThan(3);
      expect(metrics.opticalSizeAdjust).toBeGreaterThan(0.8);
      expect(metrics.opticalSizeAdjust).toBeLessThan(1.5);
      expect(metrics.safePaddingVertical).toBeGreaterThanOrEqual(0);
      expect(metrics.safePaddingVertical).toBeLessThan(0.5);
      expect(metrics.latinFallbacks.length).toBeGreaterThan(0);
      expect(metrics.note.length).toBeGreaterThan(20);
    }
  });

  it('ships a line height taller than the usual Latin value for every family', () => {
    // This is the whole point of the package. A Latin-derived 1.2 clips the
    // descender of ج and the dots of ي in every one of these faces.
    for (const metrics of Object.values(fontMetrics)) {
      expect(metrics.lineHeightMultiplier).toBeGreaterThan(1.4);
    }
  });

  it('ends every fallback chain in a generic family', () => {
    // Without a generic at the end, a system missing every named face falls
    // back to the browser default, which is rarely metric-compatible.
    for (const metrics of Object.values(fontMetrics)) {
      const last = metrics.latinFallbacks[metrics.latinFallbacks.length - 1];
      expect(['sans-serif', 'serif', 'monospace']).toContain(last);
    }
  });

  it('never lists the Arabic family inside its own Latin fallbacks', () => {
    // fontFamilyStack puts the Arabic family first; repeating it would be
    // meaningless, and for a dual-script family like Rubik it would hide the
    // fact that the Latin comes from the same file.
    for (const metrics of Object.values(fontMetrics)) {
      const rest = metrics.latinFallbacks.slice(1);
      expect(rest).not.toContain(metrics.family);
    }
  });

  it('covers the families the brief names', () => {
    const families = knownFamilies();
    for (const name of [
      'Cairo',
      'Tajawal',
      'IBM Plex Sans Arabic',
      'Noto Naskh Arabic',
      'Almarai',
    ]) {
      expect(families).toContain(name);
    }
  });
});

describe('metricsFor', () => {
  it('finds a family by its exact name', () => {
    expect(metricsFor('Cairo').family).toBe('Cairo');
    expect(metricsFor('Cairo').lineHeightMultiplier).toBe(1.75);
  });

  it('matches case-insensitively and ignores spaces, dashes and underscores', () => {
    // React Native and CSS disagree about how a family name is spelled often
    // enough that an exact-match-only lookup silently returns the default.
    for (const spelling of [
      'IBM Plex Sans Arabic',
      'ibm plex sans arabic',
      'IBMPlexSansArabic',
      'ibm-plex-sans-arabic',
      'IBM_Plex_Sans_Arabic',
    ]) {
      expect(metricsFor(spelling).family).toBe('IBM Plex Sans Arabic');
    }
  });

  it('falls back to a safe default for an unknown family', () => {
    expect(metricsFor('SomethingNobodyHasHeardOf')).toBe(DEFAULT_ARABIC_METRICS);
    expect(metricsFor(undefined)).toBe(DEFAULT_ARABIC_METRICS);
  });

  it('makes the default generous rather than tight', () => {
    // An unfamiliar face is far likelier to clip at 1.4 than to look loose at
    // 1.7, and clipping is the worse failure.
    expect(DEFAULT_ARABIC_METRICS.lineHeightMultiplier).toBeGreaterThanOrEqual(1.6);
  });
});

describe('arabicSafeText', () => {
  it('computes a line height that will not clip', () => {
    const style = arabicSafeText({ family: 'Cairo', fontSize: 16 });
    expect(style.fontSize).toBe(16);
    expect(style.lineHeight).toBe(28);
  });

  it('produces a taller line height than the naive Latin value', () => {
    // The bug this package exists for: lineHeight = fontSize * 1.2.
    for (const family of knownFamilies()) {
      const style = arabicSafeText({ family, fontSize: 16 });
      expect(style.lineHeight).toBeGreaterThan(16 * 1.2);
    }
  });

  it('scales with size, so a type scale stays correct', () => {
    for (const size of [12, 14, 16, 20, 24, 32, 48]) {
      const style = arabicSafeText({ family: 'Cairo', fontSize: size });
      expect(style.lineHeight / size).toBeCloseTo(1.75, 5);
    }
  });

  it('leaves the size alone unless optical adjustment is asked for', () => {
    // Changing rendered size is a design decision, not a bug fix, and it is
    // wrong to apply twice.
    expect(arabicSafeText({ family: 'Tajawal', fontSize: 16 }).fontSize).toBe(16);
    expect(
      arabicSafeText({ family: 'Tajawal', fontSize: 16, opticalAdjust: true }).fontSize,
    ).toBe(16.8);
  });

  it('derives the line height from the adjusted size when adjusting', () => {
    const style = arabicSafeText({
      family: 'Tajawal',
      fontSize: 16,
      opticalAdjust: true,
    });
    expect(style.lineHeight).toBeCloseTo(16.8 * 1.6, 1);
  });

  it('honours an explicit line height override', () => {
    const style = arabicSafeText({ family: 'Cairo', fontSize: 16, lineHeight: 20 });
    expect(style.lineHeight).toBe(20);
  });

  it('returns padding for a tight container', () => {
    const style = arabicSafeText({ family: 'Noto Naskh Arabic', fontSize: 16 });
    expect(style.paddingVertical).toBeGreaterThan(0);
  });

  it('falls back safely for an unknown family', () => {
    const style = arabicSafeText({ family: 'Nonexistent', fontSize: 16 });
    expect(style.lineHeight).toBe(16 * DEFAULT_ARABIC_METRICS.lineHeightMultiplier);
  });

  it('rounds to two decimals, so no sub-pixel noise reaches a style prop', () => {
    const style = arabicSafeText({ family: 'Lateef', fontSize: 13, opticalAdjust: true });
    expect(Number.isFinite(style.fontSize)).toBe(true);
    expect(String(style.fontSize).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2);
  });
});

describe('fontFamilyStack', () => {
  it('puts the Arabic family first, then the Latin fallbacks', () => {
    expect(fontFamilyStack('Cairo')).toBe(
      'Cairo, Inter, "Helvetica Neue", Arial, sans-serif',
    );
  });

  it('quotes only the families that need it', () => {
    const stack = fontFamilyStack('Cairo');
    expect(stack).toContain('"Helvetica Neue"');
    expect(stack).toContain('Cairo,');
    expect(stack).not.toContain('"Cairo"');
  });

  it('starts with the Arabic family in every case', () => {
    // Order is load-bearing. A browser uses the first family with a glyph for
    // each character, so a Latin family placed first would serve the Arabic
    // too — badly — on any system where it happens to have Arabic coverage.
    for (const family of knownFamilies()) {
      expect(fontFamilyStack(family).startsWith(quote(family))).toBe(true);
    }
  });

  it('falls back to the default chain for an unknown family', () => {
    expect(fontFamilyStack('Nonexistent')).toBe(
      fontFamilyStack(DEFAULT_ARABIC_METRICS.family),
    );
  });
});

function quote(family: string): string {
  return /\s/.test(family) ? `"${family}"` : family;
}
