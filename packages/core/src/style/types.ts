/**
 * Style types.
 *
 * `@harf/core` is framework-agnostic, so styles are modelled structurally
 * rather than against `react-native`'s `ViewStyle`. `@harf/native` layers the
 * precise React Native types on top.
 *
 * @module
 */

/**
 * A single style value.
 *
 * Deliberately `unknown` rather than a union of the types React Native happens
 * to accept. Harf only ever *moves* a value from one property name to another;
 * it inspects one only to map `textAlign: 'start'` and `flexDirection: 'row'`,
 * and it guards those with a `typeof` check. Narrowing the type here would buy
 * no safety and would reject the `Record<string, unknown>` that callers
 * naturally have — which is friction with nothing on the other side of it.
 */
export type StyleValue = unknown;

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
