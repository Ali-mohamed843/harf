/**
 * The logical → physical property mapping tables.
 *
 * These are plain frozen records rather than `Map`s so a bundler can inline
 * and tree-shake them, and so lookup is a single hidden-class hit.
 *
 * @module
 */

/**
 * Logical properties whose *name* changes with direction, as
 * `[nameUnderLtr, nameUnderRtl]`.
 *
 * React Native understands `marginStart` natively, but resolves it against
 * `I18nManager.isRTL` — a global that cannot change without a reload. Harf
 * emits the physical property instead, so the value follows React context.
 */
export const EDGE_PROPERTIES: Readonly<Record<string, readonly [string, string]>> =
  Object.freeze({
    marginStart: ['marginLeft', 'marginRight'],
    marginEnd: ['marginRight', 'marginLeft'],
    marginInlineStart: ['marginLeft', 'marginRight'],
    marginInlineEnd: ['marginRight', 'marginLeft'],
    paddingStart: ['paddingLeft', 'paddingRight'],
    paddingEnd: ['paddingRight', 'paddingLeft'],
    paddingInlineStart: ['paddingLeft', 'paddingRight'],
    paddingInlineEnd: ['paddingRight', 'paddingLeft'],
    borderStartWidth: ['borderLeftWidth', 'borderRightWidth'],
    borderEndWidth: ['borderRightWidth', 'borderLeftWidth'],
    borderStartColor: ['borderLeftColor', 'borderRightColor'],
    borderEndColor: ['borderRightColor', 'borderLeftColor'],
    start: ['left', 'right'],
    end: ['right', 'left'],
    insetInlineStart: ['left', 'right'],
    insetInlineEnd: ['right', 'left'],

    // Border radius corners. Getting these wrong is the most visible RTL bug
    // in a card or chat bubble, and the one people most often miss.
    borderTopStartRadius: ['borderTopLeftRadius', 'borderTopRightRadius'],
    borderTopEndRadius: ['borderTopRightRadius', 'borderTopLeftRadius'],
    borderBottomStartRadius: ['borderBottomLeftRadius', 'borderBottomRightRadius'],
    borderBottomEndRadius: ['borderBottomRightRadius', 'borderBottomLeftRadius'],
    // The CSS four-corner logical names. The first segment is the *block*
    // axis (top/bottom in horizontal writing) and the second is the *inline*
    // axis (the one that flips): border-start-end-radius is the top-right
    // corner under LTR, not the bottom-left.
    borderStartStartRadius: ['borderTopLeftRadius', 'borderTopRightRadius'],
    borderStartEndRadius: ['borderTopRightRadius', 'borderTopLeftRadius'],
    borderEndStartRadius: ['borderBottomLeftRadius', 'borderBottomRightRadius'],
    borderEndEndRadius: ['borderBottomRightRadius', 'borderBottomLeftRadius'],
  });

/**
 * Logical *values*, as `property → value → [valueUnderLtr, valueUnderRtl]`.
 *
 * `flexDirection: 'row'` is here because React Native lays a row out
 * left-to-right whenever `I18nManager.isRTL` is `false` — the configuration
 * Harf asks you to keep. Emitting `row-reverse` is therefore what actually
 * reverses a row under RTL.
 */
export const VALUE_PROPERTIES: Readonly<
  Record<string, Readonly<Record<string, readonly [string, string]>>>
> = Object.freeze({
  textAlign: Object.freeze({
    start: ['left', 'right'] as const,
    end: ['right', 'left'] as const,
  }),
  flexDirection: Object.freeze({
    row: ['row', 'row-reverse'] as const,
    'row-reverse': ['row-reverse', 'row'] as const,
  }),
});

/**
 * Physical properties a logical property can produce.
 *
 * Used by the `@harf/core/testing` matcher that fails a rendered style tree
 * containing physical properties, and by `@harf/eslint-plugin`.
 */
export const PHYSICAL_PROPERTIES: ReadonlySet<string> = new Set([
  'marginLeft',
  'marginRight',
  'paddingLeft',
  'paddingRight',
  'borderLeftWidth',
  'borderRightWidth',
  'borderLeftColor',
  'borderRightColor',
  'left',
  'right',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
]);

/**
 * Every logical property name Harf resolves.
 *
 * @example
 * ```ts
 * import { LOGICAL_PROPERTY_NAMES } from '@harf/core';
 *
 * LOGICAL_PROPERTY_NAMES.has('borderTopStartRadius'); // true
 * LOGICAL_PROPERTY_NAMES.has('marginLeft');           // false
 * ```
 */
export const LOGICAL_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(EDGE_PROPERTIES),
  ...Object.keys(VALUE_PROPERTIES),
]);
