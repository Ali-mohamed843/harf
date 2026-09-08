/**
 * Unicode bidirectional control characters.
 *
 * Isolates (U+2066…U+2069) are preferred over the older embeddings and
 * overrides everywhere in Harf: an isolate stops the enclosed run from
 * affecting the ordering of the text around it, which an embedding does not.
 *
 * Every constant is built with `String.fromCodePoint` rather than written as a
 * literal, because these characters are invisible in an editor and a literal
 * one is impossible to review in a diff.
 *
 * @module
 */

/** U+2066 LEFT-TO-RIGHT ISOLATE. Forces the enclosed run to be laid out LTR. */
export const LRI: string = String.fromCodePoint(0x2066);

/** U+2067 RIGHT-TO-LEFT ISOLATE. Forces the enclosed run to be laid out RTL. */
export const RLI: string = String.fromCodePoint(0x2067);

/**
 * U+2068 FIRST STRONG ISOLATE. Lays the enclosed run out according to its own
 * first strong character. This is the right default: it works for a value
 * whose direction you do not know at build time.
 */
export const FSI: string = String.fromCodePoint(0x2068);

/** U+2069 POP DIRECTIONAL ISOLATE. Closes {@link LRI}, {@link RLI} or {@link FSI}. */
export const PDI: string = String.fromCodePoint(0x2069);

/** U+202A LEFT-TO-RIGHT EMBEDDING. Legacy; prefer {@link LRI}. */
export const LRE: string = String.fromCodePoint(0x202a);

/** U+202B RIGHT-TO-LEFT EMBEDDING. Legacy; prefer {@link RLI}. */
export const RLE: string = String.fromCodePoint(0x202b);

/** U+202C POP DIRECTIONAL FORMATTING. Closes {@link LRE}, {@link RLE}, LRO or RLO. */
export const PDF: string = String.fromCodePoint(0x202c);

/** U+202D LEFT-TO-RIGHT OVERRIDE. */
export const LRO: string = String.fromCodePoint(0x202d);

/** U+202E RIGHT-TO-LEFT OVERRIDE. */
export const RLO: string = String.fromCodePoint(0x202e);

/** U+200E LEFT-TO-RIGHT MARK. A zero-width strong LTR character. */
export const LRM: string = String.fromCodePoint(0x200e);

/** U+200F RIGHT-TO-LEFT MARK. A zero-width strong RTL character. */
export const RLM: string = String.fromCodePoint(0x200f);

/** U+061C ARABIC LETTER MARK. A zero-width strong Arabic character. */
export const ALM: string = String.fromCodePoint(0x061c);

/**
 * Every bidi control character, as a character-class body for use inside a
 * regular expression.
 */
export const BIDI_CONTROL_CLASS = '\\u200e\\u200f\\u061c\\u202a-\\u202e\\u2066-\\u2069';

const BIDI_CONTROL_RE = new RegExp(`[${BIDI_CONTROL_CLASS}]`, 'gu');

/**
 * Removes every bidi control character from a string.
 *
 * Use this before storing, comparing, hashing, or sending a value anywhere a
 * machine will read it. Isolate characters are invisible but real: a value
 * that round-trips through `isolate` and into a database will not match the
 * same value typed by hand.
 *
 * @example
 * ```ts
 * import { isolate, stripBidi } from '@harf/core';
 *
 * const shown = isolate('user@example.com');
 * shown.length;            // 18 — two invisible characters added
 * stripBidi(shown);        // 'user@example.com'
 * stripBidi(shown).length; // 16
 * ```
 */
export function stripBidi(text: string): string {
  BIDI_CONTROL_RE.lastIndex = 0;
  return text.replace(BIDI_CONTROL_RE, '');
}

/**
 * `true` when the string contains at least one bidi control character.
 *
 * @example
 * ```ts
 * import { hasBidiControls, isolate } from '@harf/core';
 *
 * hasBidiControls('hello');          // false
 * hasBidiControls(isolate('hello')); // true
 * ```
 */
export function hasBidiControls(text: string): boolean {
  BIDI_CONTROL_RE.lastIndex = 0;
  return BIDI_CONTROL_RE.test(text);
}
