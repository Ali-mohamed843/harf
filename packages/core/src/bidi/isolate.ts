/**
 * Explicit bidirectional isolation.
 *
 * @module
 */

import type { Direction } from '../direction';
import { firstStrongDirection } from './classify';
import { FSI, LRI, PDI, RLI } from './controls';

/** Options for {@link isolate}. */
export interface IsolateOptions {
  /**
   * Force the enclosed run to a direction instead of letting it decide from
   * its own first strong character.
   *
   * Leave this unset for values whose direction you do not know at build time
   * — a user's display name, a search query, a product title. The default
   * (U+2068 FIRST STRONG ISOLATE) is correct for all of them, and, unlike a
   * forced direction, it is also correct for a value with no strong character
   * at all such as a phone number, which resolves left-to-right.
   */
  readonly dir?: Direction;
}

/**
 * Wraps text in Unicode isolate characters so it cannot disturb the ordering
 * of the text around it.
 *
 * This is the fix for the single most common bug in Arabic apps: an LTR run —
 * a brand name, a URL, a phone number, an email, a filename, a code snippet —
 * embedded in an RTL sentence, reordering incorrectly at the boundaries.
 *
 * @param text - The run to isolate. An empty string is returned unchanged, so
 *   isolating a missing value never introduces stray invisible characters.
 * @param options - See {@link IsolateOptions}.
 * @returns The text wrapped in U+2068…U+2069 (or U+2066/U+2067 when `dir` is
 *   given).
 *
 * @example The bug
 * ```ts
 * // Rendered in an RTL paragraph, the trailing '2026' of this string visually
 * // jumps to the wrong side of 'Karnak Holidays':
 * const broken = 'مرحبا بك في Karnak Holidays 2026 اليوم';
 * ```
 *
 * @example The fix
 * ```ts
 * import { isolate } from '@harf/core';
 *
 * const brand = isolate('Karnak Holidays 2026');
 * const fixed = `مرحبا بك في ${brand} اليوم`;
 * ```
 *
 * @example Forcing a direction
 * ```ts
 * import { isolate } from '@harf/core';
 *
 * isolate('123-456', { dir: 'ltr' }); // U+2066 … U+2069
 * ```
 *
 * @remarks
 * Isolate characters are invisible but real, and they are included when a user
 * copies the text. Never store, compare, or transmit an isolated string — call
 * `stripBidi` first, or better, isolate only at the moment of rendering.
 */
export function isolate(text: string, options: IsolateOptions = {}): string {
  if (text.length === 0) return text;
  const open = options.dir === 'ltr' ? LRI : options.dir === 'rtl' ? RLI : FSI;
  return open + text + PDI;
}

/**
 * Wraps text in isolates only when it actually needs them.
 *
 * Returns the string untouched when it is empty, when it already begins with
 * an isolate and ends with the matching pop, or when `base` is given and the
 * text's own first strong direction already matches it.
 *
 * Prefer this over {@link isolate} in a component that renders many short
 * strings, so unchanged values keep their identity and the DOM or native text
 * node is not needlessly replaced.
 *
 * @param text - The run to isolate.
 * @param base - The direction of the surrounding paragraph. When the text
 *   agrees with it, no isolate is added.
 *
 * @example
 * ```ts
 * import { isolateIfNeeded } from '@harf/core';
 *
 * isolateIfNeeded('مرحبا', 'rtl');  // 'مرحبا' — same direction, untouched
 * isolateIfNeeded('Karnak', 'rtl'); // isolated
 * isolateIfNeeded('', 'rtl');       // '' — never introduces stray characters
 * ```
 */
export function isolateIfNeeded(text: string, base?: Direction): string {
  if (text.length === 0) return text;

  const first = text[0];
  const last = text[text.length - 1];
  if ((first === FSI || first === LRI || first === RLI) && last === PDI) return text;

  if (base !== undefined) {
    const strong = firstStrongDirection(text);
    if (strong === null || strong === base) return text;
  }

  return isolate(text);
}
