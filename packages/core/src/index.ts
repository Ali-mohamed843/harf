/**
 * `@harf/core` — framework-agnostic RTL and Arabic logic.
 *
 * This package has **zero runtime dependencies** by design and must keep it
 * that way. Adapters (`@harf/react`, `@harf/native`, `@harf/next`) build on it.
 *
 * @packageDocumentation
 */

/**
 * A writing direction.
 *
 * Harf models direction as an explicit value rather than reading it from a
 * global (`document.dir`, `I18nManager.isRTL`), because a global cannot change
 * without a reload on React Native. Everything in Harf takes `dir` as an
 * argument or reads it from context.
 */
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
 *   console.log(dir); // 'ltr' then 'rtl'
 * }
 * ```
 */
export const DIRECTIONS = Object.freeze(['ltr', 'rtl'] as const) as readonly Direction[];

/**
 * Narrows an unknown value to a {@link Direction}.
 *
 * Use this at the edges of your app — a URL segment, a cookie, a stored user
 * preference — so an unexpected value fails loudly instead of silently
 * laying out left-to-right.
 *
 * @param value - The value to test.
 * @returns `true` when `value` is exactly `'ltr'` or `'rtl'`.
 *
 * @example
 * ```ts
 * import { isDirection } from '@harf/core';
 *
 * const fromCookie: unknown = 'rtl';
 *
 * if (isDirection(fromCookie)) {
 *   // fromCookie is narrowed to Direction here
 *   console.log(fromCookie); // 'rtl'
 * }
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
 * @param dir - The direction to flip.
 * @returns `'rtl'` for `'ltr'`, and `'ltr'` for `'rtl'`.
 *
 * @example
 * ```ts
 * import { oppositeDirection } from '@harf/core';
 *
 * oppositeDirection('ltr'); // 'rtl'
 * oppositeDirection('rtl'); // 'ltr'
 * ```
 */
export function oppositeDirection(dir: Direction): Direction {
  return dir === 'ltr' ? 'rtl' : 'ltr';
}
