/**
 * Minimal character classification for bidi run detection.
 *
 * This is deliberately *not* a Unicode Bidirectional Algorithm implementation.
 * The UBA is what the text engine already runs; Harf only needs to know which
 * substrings are strongly the opposite direction from the paragraph, so it can
 * wrap those in isolates. Shipping a full UBA table would cost tens of
 * kilobytes to answer a question we can answer with ranges.
 *
 * @module
 */

import type { Direction } from '../direction';

/** The bidi character categories Harf distinguishes. */
export type CharClass =
  /** Strongly left-to-right: Latin, Greek, Cyrillic, CJK, and most other scripts. */
  | 'L'
  /** Strongly right-to-left: Arabic, Hebrew, Syriac, Thaana, NKo, and friends. */
  | 'R'
  /**
   * Punctuation that belongs to an RTL script: the Arabic comma, semicolon,
   * question mark and full stop.
   *
   * Kept apart from `R` on purpose. These characters mark the sentence around
   * a foreign run as Arabic, so Harf ends an embedded LTR run at one rather
   * than absorbing it — which keeps each item in a comma-separated list its
   * own isolate. They are *not* counted as strong by {@link containsRtl},
   * because a string of nothing but punctuation has no direction.
   */
  | 'RP'
  /** European digits, `0`–`9`. Weak: they take direction from context. */
  | 'EN'
  /** Arabic-Indic and Persian digits. Weak, and always rendered RTL-context-safe. */
  | 'AN'
  /** Everything else: spaces, punctuation, symbols, emoji. */
  | 'N';

/**
 * Punctuation belonging to an RTL script.
 *
 * Per the Unicode Bidirectional Algorithm, U+060C ARABIC COMMA is a common
 * separator and U+061B/U+061F are Arabic letters. Harf treats all of them as
 * one category — a boundary — because the useful question here is not "which
 * way does this glyph read" but "does the Arabic sentence continue past it".
 */
const RTL_PUNCTUATION: ReadonlySet<number> = new Set([
  0x060c, // ARABIC COMMA
  0x061b, // ARABIC SEMICOLON
  0x061e, // ARABIC TRIPLE DOT PUNCTUATION MARK
  0x061f, // ARABIC QUESTION MARK
  0x06d4, // ARABIC FULL STOP
  0x0589, // ARMENIAN FULL STOP (appears in Hebrew and Arabic corpora)
  0x05c3, // HEBREW PUNCTUATION SOF PASUQ
  0x05c6, // HEBREW PUNCTUATION NUN HAFUKHA
]);

/**
 * Contiguous code point ranges for strongly RTL scripts, as
 * `[start, end]` inclusive pairs, sorted ascending.
 *
 * Covers Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan, Mandaic, the Arabic
 * supplements and presentation forms, and the RTL SMP blocks (Cypriot through
 * Adlam, plus Arabic mathematical alphabetic symbols).
 */
const RTL_RANGES: readonly (readonly [number, number])[] = [
  [0x0590, 0x05ff], // Hebrew
  [0x0600, 0x0605], // Arabic number signs (AN-adjacent, treated as R)
  [0x0608, 0x0608],
  [0x060b, 0x060b],
  [0x060d, 0x061a],
  [0x061b, 0x064a], // Arabic
  [0x066d, 0x066f],
  [0x0671, 0x06d5],
  [0x06e5, 0x06e6],
  [0x06ee, 0x06ef],
  [0x06fa, 0x070d], // Arabic extended, Syriac start
  [0x0710, 0x074a], // Syriac
  [0x074d, 0x07a5], // Syriac supplement, Thaana
  [0x07b1, 0x07b1],
  [0x07c0, 0x07ea], // NKo
  [0x07f4, 0x07f5],
  [0x07fa, 0x0815], // NKo, Samaritan
  [0x081a, 0x081a],
  [0x0824, 0x0824],
  [0x0828, 0x0828],
  [0x0830, 0x0858], // Samaritan, Mandaic
  [0x085e, 0x08d2], // Mandaic, Arabic extended-A
  [0x200f, 0x200f], // RLM
  [0xfb1d, 0xfb4f], // Hebrew presentation forms
  [0xfb50, 0xfdff], // Arabic presentation forms-A
  [0xfe70, 0xfefc], // Arabic presentation forms-B
  [0x10800, 0x10cff], // Cypriot … Old Hungarian
  [0x10d40, 0x10ebf], // Garay … Arabic extended
  [0x10f00, 0x10f2f], // Old Sogdian
  [0x10f70, 0x10fff], // Old Uyghur … Chorasmian
  [0x1e800, 0x1ec6f], // Mende Kikakui, Adlam
  [0x1ecc0, 0x1ecff],
  [0x1ed50, 0x1edff],
  [0x1ee00, 0x1eeff], // Arabic mathematical alphabetic symbols
];

/**
 * Contiguous code point ranges for strongly LTR scripts.
 *
 * Only the ranges that actually appear beside Arabic in real product text are
 * listed. Anything unlisted falls through to neutral, which is the safe
 * default: a neutral run is never isolated on its own.
 */
const LTR_RANGES: readonly (readonly [number, number])[] = [
  [0x0041, 0x005a], // A-Z
  [0x0061, 0x007a], // a-z
  [0x00aa, 0x00aa],
  [0x00b5, 0x00b5],
  [0x00ba, 0x00ba],
  [0x00c0, 0x02b8], // Latin-1 supplement through spacing modifiers
  [0x0370, 0x058f], // Greek, Coptic, Cyrillic, Armenian
  [0x0900, 0x1fff], // Indic through Greek extended
  [0x2071, 0x209c],
  [0x2c00, 0xd7ff], // Glagolitic through Hangul
  [0xf900, 0xfb17], // CJK compatibility
  [0xff21, 0xff3a], // Fullwidth A-Z
  [0xff41, 0xff5a], // Fullwidth a-z
  [0x1d400, 0x1d7ff], // Mathematical alphanumeric symbols
  [0x20000, 0x2fa1f], // CJK extension B+
];

/** Arabic-Indic (U+0660) and Extended Arabic-Indic / Persian (U+06F0) digits. */
const AN_RANGES: readonly (readonly [number, number])[] = [
  [0x0660, 0x0669],
  [0x066b, 0x066c], // Arabic decimal and thousands separators
  [0x06f0, 0x06f9],
];

function inRanges(code: number, ranges: readonly (readonly [number, number])[]): boolean {
  let lo = 0;
  let hi = ranges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const range = ranges[mid];
    /* c8 ignore next */
    if (range === undefined) break;
    if (code < range[0]) hi = mid - 1;
    else if (code > range[1]) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * Classifies a single code point.
 *
 * @param code - A Unicode code point, as returned by `String.prototype.codePointAt`.
 *
 * @example
 * ```ts
 * import { classifyCodePoint } from '@harf/core';
 *
 * classifyCodePoint('K'.codePointAt(0)!);  // 'L'
 * classifyCodePoint('م'.codePointAt(0)!);  // 'R'
 * classifyCodePoint('7'.codePointAt(0)!);  // 'EN'
 * classifyCodePoint('٧'.codePointAt(0)!);  // 'AN'
 * classifyCodePoint(' '.codePointAt(0)!);  // 'N'
 * ```
 */
export function classifyCodePoint(code: number): CharClass {
  if (code >= 0x30 && code <= 0x39) return 'EN';
  if (RTL_PUNCTUATION.has(code)) return 'RP';
  if (inRanges(code, AN_RANGES)) return 'AN';
  if (inRanges(code, RTL_RANGES)) return 'R';
  if (inRanges(code, LTR_RANGES)) return 'L';
  return 'N';
}

/**
 * The direction of the first strong character in a string, or `null` when the
 * string contains none.
 *
 * This is the same rule the `dir="auto"` HTML attribute and U+2068 FIRST
 * STRONG ISOLATE use, so it is the right way to answer "which way should this
 * user-supplied value be laid out?".
 *
 * @param text - The string to inspect.
 * @returns `'ltr'`, `'rtl'`, or `null` for a string with no strong character.
 *
 * @example
 * ```ts
 * import { firstStrongDirection } from '@harf/core';
 *
 * firstStrongDirection('مرحبا Karnak'); // 'rtl'
 * firstStrongDirection('Karnak مرحبا'); // 'ltr'
 * firstStrongDirection('  "مرحبا"');    // 'rtl' — punctuation is skipped
 * firstStrongDirection('2026 — 1.5');   // null  — digits are not strong
 * ```
 */
export function firstStrongDirection(text: string): Direction | null {
  for (const char of text) {
    const code = char.codePointAt(0);
    /* c8 ignore next */
    if (code === undefined) continue;
    const cls = classifyCodePoint(code);
    if (cls === 'L') return 'ltr';
    if (cls === 'R') return 'rtl';
  }
  return null;
}

/**
 * `true` when the string contains at least one Arabic, Hebrew, or other
 * strongly right-to-left character.
 *
 * `@harf/eslint-plugin`'s `require-bidi-isolation` rule uses this to decide
 * whether a template literal is at risk.
 *
 * @example
 * ```ts
 * import { containsRtl } from '@harf/core';
 *
 * containsRtl('مرحبا');        // true
 * containsRtl('Hello');        // false
 * containsRtl('Hello مرحبا');  // true
 * ```
 */
export function containsRtl(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0);
    /* c8 ignore next */
    if (code === undefined) continue;
    if (classifyCodePoint(code) === 'R') return true;
  }
  return false;
}

/**
 * `true` when the string contains at least one strongly left-to-right
 * character.
 *
 * @example
 * ```ts
 * import { containsLtr } from '@harf/core';
 *
 * containsLtr('مرحبا بك في Karnak'); // true
 * containsLtr('مرحبا بك');           // false
 * ```
 */
export function containsLtr(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0);
    /* c8 ignore next */
    if (code === undefined) continue;
    if (classifyCodePoint(code) === 'L') return true;
  }
  return false;
}
