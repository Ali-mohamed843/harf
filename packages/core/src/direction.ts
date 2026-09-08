/**
 * Direction primitives.
 *
 * Harf models direction as an explicit value rather than reading it from a
 * global (`document.dir`, `I18nManager.isRTL`), because on React Native a
 * global cannot change without a reload. Everything in Harf takes `dir` as an
 * argument or reads it from React context.
 *
 * @module
 */

/** A writing direction. */
export type Direction = 'ltr' | 'rtl';

/**
 * Every valid {@link Direction}, in a stable order.
 *
 * Useful for test matrices that must assert behaviour in *both* directions
 * rather than only the one being fixed.
 *
 * @example
 * ```ts
 * import { DIRECTIONS } from '@harf/core';
 *
 * for (const dir of DIRECTIONS) {
 *   expect(render(dir)).toMatchSnapshot(dir);
 * }
 * ```
 */
export const DIRECTIONS: readonly Direction[] = Object.freeze(['ltr', 'rtl'] as const);

/**
 * Narrows an unknown value to a {@link Direction}.
 *
 * Use this at the edges of your app — a URL segment, a cookie, a stored user
 * preference — so an unexpected value fails loudly instead of silently laying
 * out left-to-right.
 *
 * @param value - The value to test.
 * @returns `true` when `value` is exactly `'ltr'` or `'rtl'`.
 *
 * @example
 * ```ts
 * import { isDirection } from '@harf/core';
 *
 * isDirection('ltr');  // true
 * isDirection('RTL');  // false — casing is not normalised for you
 * isDirection('auto'); // false — Harf never resolves 'auto' implicitly
 * ```
 */
export function isDirection(value: unknown): value is Direction {
  return value === 'ltr' || value === 'rtl';
}

/**
 * Returns the direction opposite to the one given.
 *
 * @example
 * ```ts
 * import { oppositeDirection } from '@harf/core';
 *
 * oppositeDirection('ltr'); // 'rtl'
 * ```
 */
export function oppositeDirection(dir: Direction): Direction {
  return dir === 'ltr' ? 'rtl' : 'ltr';
}

/**
 * `1` for `'ltr'` and `-1` for `'rtl'`.
 *
 * Multiply any horizontal offset by this to make it direction-aware:
 * `translateX`, scroll offsets, drag deltas, carousel indices.
 *
 * @example
 * ```ts
 * import { directionSign } from '@harf/core';
 *
 * const translateX = 40 * directionSign('rtl'); // -40
 * ```
 */
export function directionSign(dir: Direction): 1 | -1 {
  return dir === 'ltr' ? 1 : -1;
}
