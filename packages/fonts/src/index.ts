/**
 * `@harf/fonts` — Arabic font metric presets.
 *
 * Arabic typefaces carry taller ascenders and deeper descenders than Latin
 * faces, because the script needs room for stacked diacritics above and for
 * the descending bowls of ج ح خ ع غ م ه below. Two consequences follow, and
 * both are visible in almost every bilingual app:
 *
 * 1. **They render visually smaller at the same `fontSize`.** The em box has
 *    to accommodate more vertical extent, so the x-height equivalent occupies
 *    less of it. Arabic set at 16px next to Latin at 16px looks a size down.
 * 2. **They clip against a `lineHeight` that is fine for Latin.** A common
 *    `lineHeight: fontSize * 1.2` cuts the tail off ج and the dots off ي.
 *
 * @packageDocumentation
 */

/**
 * Corrections needed to typeset an Arabic face safely at an arbitrary size.
 *
 * All values are multipliers of `fontSize`, so they stay correct across a type
 * scale rather than being tied to one size.
 */
export interface ArabicFontMetrics {
  /** The family name as referenced in CSS or React Native styles. */
  readonly family: string;
  /**
   * Multiply `fontSize` by this for a `lineHeight` that does not clip
   * ascenders or descenders.
   *
   * Latin faces are usually comfortable at 1.2–1.4. Every value here is
   * higher, which is the point.
   */
  readonly lineHeightMultiplier: number;
  /**
   * Multiply `fontSize` by this to match the apparent size of a Latin face set
   * at the same nominal size.
   *
   * Greater than 1 for families that render small. Apply it to the Arabic run
   * only — scaling the whole paragraph defeats the purpose.
   */
  readonly opticalSizeAdjust: number;
  /**
   * Extra vertical padding, in multiples of `fontSize`, for a tight container:
   * a button, a chip, a single-line input. Text that fits in a `<View>` can
   * still clip inside a fixed-height control.
   */
  readonly safePaddingVertical: number;
  /**
   * Latin families to fall back to for embedded Latin runs, chosen so their
   * metrics do not visibly jump against the Arabic face.
   *
   * Getting this wrong is why "iPhone 15 Pro" inside an Arabic sentence
   * sometimes sits on a different baseline from the words around it.
   */
  readonly latinFallbacks: readonly string[];
  /** A one-line note on the family, and where the numbers came from. */
  readonly note: string;
}

function preset(metrics: ArabicFontMetrics): ArabicFontMetrics {
  return Object.freeze(metrics);
}

/**
 * The metric registry, keyed by family name.
 *
 * **How these numbers were arrived at.** Each `lineHeightMultiplier` is
 * derived from the family's published vertical metrics — the ratio of
 * (ascender + descender + line gap) to units-per-em, rounded up to the nearest
 * 0.05 and floored at 1.5. That is a *safe* value, not a beautiful one: it
 * guarantees no clipping at any size, and a designer may well tighten it for a
 * specific size and weight. `opticalSizeAdjust` is a judgement about apparent
 * size against Latin at the same nominal size and is the softest number here.
 *
 * Treat all of them as a starting point that will not clip, not as the last
 * word on how the family should be set.
 *
 * @example
 * ```ts
 * import { fontMetrics } from '@harf/fonts';
 *
 * const cairo = fontMetrics.Cairo;
 * const lineHeight = 16 * cairo.lineHeightMultiplier; // 28
 * ```
 */
export const fontMetrics: Readonly<Record<string, ArabicFontMetrics>> = Object.freeze({
  Cairo: preset({
    family: 'Cairo',
    lineHeightMultiplier: 1.75,
    opticalSizeAdjust: 1.0,
    safePaddingVertical: 0.1,
    latinFallbacks: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
    note: 'A modern sans with generous vertical metrics. The most common choice in Egyptian product work.',
  }),
  Tajawal: preset({
    family: 'Tajawal',
    lineHeightMultiplier: 1.6,
    opticalSizeAdjust: 1.05,
    safePaddingVertical: 0.08,
    latinFallbacks: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
    note: 'Tighter than Cairo and renders slightly small; nudge the size up beside Latin.',
  }),
  'IBM Plex Sans Arabic': preset({
    family: 'IBM Plex Sans Arabic',
    lineHeightMultiplier: 1.6,
    opticalSizeAdjust: 1.0,
    safePaddingVertical: 0.08,
    latinFallbacks: ['IBM Plex Sans', 'Inter', 'Helvetica Neue', 'sans-serif'],
    note: 'Designed alongside its Latin sibling, so the fallback chain is genuinely metric-compatible. The safest bilingual pairing here.',
  }),
  'Noto Naskh Arabic': preset({
    family: 'Noto Naskh Arabic',
    lineHeightMultiplier: 2.0,
    opticalSizeAdjust: 1.0,
    safePaddingVertical: 0.15,
    latinFallbacks: ['Noto Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
    note: 'A traditional Naskh with deep descenders and tall diacritic space. Needs the most line height of any family here — 1.2 will clip badly.',
  }),
  'Noto Sans Arabic': preset({
    family: 'Noto Sans Arabic',
    lineHeightMultiplier: 1.7,
    opticalSizeAdjust: 1.0,
    safePaddingVertical: 0.1,
    latinFallbacks: ['Noto Sans', 'Helvetica Neue', 'Arial', 'sans-serif'],
    note: 'The sans companion to Noto Naskh; far more forgiving vertically.',
  }),
  Almarai: preset({
    family: 'Almarai',
    lineHeightMultiplier: 1.7,
    opticalSizeAdjust: 1.0,
    safePaddingVertical: 0.1,
    latinFallbacks: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
    note: 'Geometric and even in colour; comfortable at UI sizes.',
  }),
  Rubik: preset({
    family: 'Rubik',
    lineHeightMultiplier: 1.5,
    opticalSizeAdjust: 1.0,
    safePaddingVertical: 0.06,
    latinFallbacks: ['Rubik', 'Inter', 'Helvetica Neue', 'sans-serif'],
    note: 'One family covering both scripts, so Latin and Arabic share metrics exactly. The tightest safe line height here.',
  }),
  Amiri: preset({
    family: 'Amiri',
    lineHeightMultiplier: 2.1,
    opticalSizeAdjust: 1.1,
    safePaddingVertical: 0.18,
    latinFallbacks: ['EB Garamond', 'Georgia', 'Times New Roman', 'serif'],
    note: 'A Naskh book face for long-form text. Renders small and needs a great deal of line height; not a UI font.',
  }),
  Changa: preset({
    family: 'Changa',
    lineHeightMultiplier: 1.65,
    opticalSizeAdjust: 1.0,
    safePaddingVertical: 0.1,
    latinFallbacks: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
    note: 'Display-leaning; works well for headings.',
  }),
  Lateef: preset({
    family: 'Lateef',
    lineHeightMultiplier: 2.0,
    opticalSizeAdjust: 1.15,
    safePaddingVertical: 0.15,
    latinFallbacks: ['Gentium Book Plus', 'Georgia', 'serif'],
    note: 'An extended-Arabic face covering Urdu, Sindhi and Persian orthography. Renders noticeably small.',
  }),
});

/**
 * The default used for a family with no preset.
 *
 * Deliberately generous. An unfamiliar Arabic face is much more likely to clip
 * at 1.4 than to look loose at 1.7, and clipping is the worse failure.
 */
export const DEFAULT_ARABIC_METRICS: ArabicFontMetrics = preset({
  family: 'sans-serif',
  lineHeightMultiplier: 1.7,
  opticalSizeAdjust: 1.0,
  safePaddingVertical: 0.1,
  latinFallbacks: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
  note: 'Conservative default for an unlisted family. Generous rather than tight, because clipping is worse than looseness.',
});

/**
 * Looks up the metrics for a family, falling back to a safe default.
 *
 * Matching is case-insensitive and ignores spaces, so `'ibm plex sans arabic'`
 * and `'IBMPlexSansArabic'` both resolve — React Native and CSS disagree about
 * how a family name is written often enough to matter.
 *
 * @example
 * ```ts
 * import { metricsFor } from '@harf/fonts';
 *
 * metricsFor('Cairo').lineHeightMultiplier;        // 1.75
 * metricsFor('SomethingUnknown').family;           // 'sans-serif'
 * ```
 */
export function metricsFor(family: string | undefined): ArabicFontMetrics {
  if (family === undefined) return DEFAULT_ARABIC_METRICS;
  const direct = fontMetrics[family];
  if (direct !== undefined) return direct;

  const normalised = family.toLowerCase().replace(/[\s_-]/g, '');
  for (const metrics of Object.values(fontMetrics)) {
    if (metrics.family.toLowerCase().replace(/[\s_-]/g, '') === normalised) {
      return metrics;
    }
  }
  return DEFAULT_ARABIC_METRICS;
}

/** What {@link arabicSafeText} returns. */
export interface ArabicSafeTextStyle {
  /** The font size to render at, after the optical adjustment. */
  readonly fontSize: number;
  /** A line height that will not clip this family at this size. */
  readonly lineHeight: number;
  /** Vertical padding for a tight container. */
  readonly paddingVertical: number;
  /** The family, with its Latin fallbacks, ready for a CSS `font-family`. */
  readonly fontFamily: string;
  /** The same chain as an array, for React Native or a font-loading step. */
  readonly fontFamilyStack: readonly string[];
}

/** Options for {@link arabicSafeText}. */
export interface ArabicSafeTextOptions {
  /** The Arabic family being used. */
  readonly family?: string;
  /** The nominal size, before optical adjustment. */
  readonly fontSize: number;
  /**
   * Apply `opticalSizeAdjust`, so the Arabic matches the apparent size of
   * Latin set at the same nominal size.
   *
   * Off by default: it changes the rendered size, which is a visible design
   * decision rather than a bug fix, and it is wrong to apply twice.
   *
   * @defaultValue `false`
   */
  readonly opticalAdjust?: boolean;
  /** Override the computed line height entirely. */
  readonly lineHeight?: number;
}

/**
 * Computes a font size, line height and padding that will not clip.
 *
 * The framework-agnostic core of `useArabicSafeText`, which `@harf/react` and
 * `@harf/native` wrap as a hook.
 *
 * @example
 * ```ts
 * import { arabicSafeText } from '@harf/fonts';
 *
 * arabicSafeText({ family: 'Cairo', fontSize: 16 });
 * // { fontSize: 16, lineHeight: 28, paddingVertical: 1.6, ... }
 *
 * // The naive value that clips:
 * const wrong = 16 * 1.2; // 19.2
 * ```
 *
 * @example Matching apparent size against Latin
 * ```ts
 * arabicSafeText({ family: 'Tajawal', fontSize: 16, opticalAdjust: true });
 * // fontSize: 16.8 — Tajawal renders small, so it is nudged up
 * ```
 */
export function arabicSafeText(options: ArabicSafeTextOptions): ArabicSafeTextStyle {
  const metrics = metricsFor(options.family);
  const fontSize =
    options.opticalAdjust === true
      ? round(options.fontSize * metrics.opticalSizeAdjust)
      : options.fontSize;

  const lineHeight = options.lineHeight ?? round(fontSize * metrics.lineHeightMultiplier);

  const stack = [metrics.family, ...metrics.latinFallbacks];

  return {
    fontSize,
    lineHeight,
    paddingVertical: round(fontSize * metrics.safePaddingVertical),
    fontFamily: stack.map(quoteIfNeeded).join(', '),
    fontFamilyStack: Object.freeze(stack),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function quoteIfNeeded(family: string): string {
  return /\s/.test(family) ? `"${family}"` : family;
}

/**
 * A CSS `font-family` value pairing an Arabic family with metric-compatible
 * Latin fallbacks.
 *
 * The order matters. A browser uses the *first* family that has a glyph for
 * each character, so putting the Arabic family first means Latin runs fall
 * through to the Latin fallbacks — which is what you want, as long as those
 * fallbacks were chosen to match. Putting a Latin family first would let it
 * serve the Arabic too, badly, on any system where it happens to have Arabic
 * coverage.
 *
 * @example
 * ```ts
 * import { fontFamilyStack } from '@harf/fonts';
 *
 * fontFamilyStack('Cairo');
 * // 'Cairo, Inter, "Helvetica Neue", Arial, sans-serif'
 * ```
 */
export function fontFamilyStack(family: string | undefined): string {
  const metrics = metricsFor(family);
  return [metrics.family, ...metrics.latinFallbacks].map(quoteIfNeeded).join(', ');
}

/** Every family this package ships a preset for. */
export function knownFamilies(): readonly string[] {
  return Object.keys(fontMetrics);
}
