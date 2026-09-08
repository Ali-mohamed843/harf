/**
 * Style types.
 *
 * `@harf/core` is framework-agnostic, so styles are modelled structurally
 * rather than against `react-native`'s `ViewStyle`. `@harf/native` layers the
 * precise React Native types on top.
 *
 * @module
 */

/** A single style value. Numbers, strings, and nested transform arrays. */
export type StyleValue = string | number | boolean | null | undefined | object;

/** A flat style object, possibly containing logical properties. */
export type StyleObject = Readonly<Record<string, StyleValue>>;

/**
 * Anything accepted where a style is expected: an object, an array of them,
 * or a falsy value (from `cond && styles.x`).
 *
 * Opaque numeric registered-style IDs are also tolerated and passed through
 * untouched.
 */
export type StyleInput =
  StyleObject | number | false | null | undefined | readonly StyleInput[];
