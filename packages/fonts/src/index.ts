/**
 * `@harf/fonts` — Arabic font metric presets.
 *
 * Arabic typefaces carry larger ascenders and descenders than Latin faces. At
 * the same `fontSize` they render visually smaller *and* clip against a
 * `lineHeight` that is perfectly fine for Latin. The presets land in M4; this
 * entry defines the shape they will take.
 *
 * @packageDocumentation
 */

/**
 * Corrections needed to typeset an Arabic face safely at an arbitrary size.
 *
 * All values are multipliers of `fontSize` unless stated otherwise, so they
 * stay correct across type scales.
 */
export interface ArabicFontMetrics {
  /** The family name as it is referenced in CSS or React Native styles. */
  readonly family: string;
  /**
   * Multiply `fontSize` by this to get a `lineHeight` that does not clip
   * ascenders or descenders for this family.
   */
  readonly lineHeightMultiplier: number;
  /**
   * Multiply `fontSize` by this to match the apparent size of a Latin face set
   * at the same nominal size. Greater than 1 for families that render small.
   */
  readonly opticalSizeAdjust: number;
  /** Extra vertical padding, in multiples of `fontSize`, to avoid clipping in tight containers. */
  readonly safePaddingVertical: number;
  /**
   * Latin families to fall back to for embedded Latin runs, chosen so their
   * metrics do not visibly jump against the Arabic face.
   */
  readonly latinFallbacks: readonly string[];
}

/**
 * The metric registry, keyed by family name.
 *
 * Empty until M4 — presets are only added once they have been measured against
 * the real font files rather than guessed.
 *
 * @example
 * ```ts
 * import { fontMetrics } from '@harf/fonts';
 *
 * const cairo = fontMetrics['Cairo'];
 * if (cairo) {
 *   const lineHeight = 16 * cairo.lineHeightMultiplier;
 * }
 * ```
 */
export const fontMetrics: Readonly<Record<string, ArabicFontMetrics>> = Object.freeze({});
