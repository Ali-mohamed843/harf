/**
 * Resolving logical style properties to physical ones at render time.
 *
 * This is the mechanism that lets a React Native app switch direction without
 * an app restart: nothing is baked in at module load, so a direction change is
 * an ordinary React re-render.
 *
 * @module
 */

import type { Direction } from '../direction';
import { EDGE_PROPERTIES, VALUE_PROPERTIES } from './properties';
import type { StyleInput, StyleObject, StyleValue } from './types';

/**
 * Per-direction memo of resolved style objects, keyed by input object
 * identity. A `WeakMap` means a style object that goes out of scope takes its
 * cache entry with it.
 */
const CACHE: Readonly<Record<Direction, WeakMap<object, StyleObject>>> = Object.freeze({
  ltr: new WeakMap<object, StyleObject>(),
  rtl: new WeakMap<object, StyleObject>(),
});

/** Style objects with no logical properties at all, so we can skip them fast. */
const PASSTHROUGH = new WeakSet<object>();

let hits = 0;
let misses = 0;

/**
 * Resolves one flat style object. Returns the *same object identity* when
 * there is nothing to resolve, so downstream reference equality keeps working.
 */
function resolveObject(style: StyleObject, dir: Direction): StyleObject {
  if (PASSTHROUGH.has(style)) {
    hits += 1;
    return style;
  }

  const cached = CACHE[dir].get(style);
  if (cached !== undefined) {
    hits += 1;
    return cached;
  }

  misses += 1;
  const index = dir === 'ltr' ? 0 : 1;
  let out: Record<string, StyleValue> | null = null;

  for (const key in style) {
    const value = style[key];

    const edge = EDGE_PROPERTIES[key];
    if (edge !== undefined) {
      out ??= { ...style };
      delete out[key];
      // A physical property written by hand in the same object wins, so a
      // deliberate escape hatch is never silently overwritten.
      const physical = edge[index] as string;
      if (!Object.prototype.hasOwnProperty.call(style, physical)) {
        out[physical] = value;
      }
      continue;
    }

    const valueMap = VALUE_PROPERTIES[key];
    if (valueMap !== undefined && typeof value === 'string') {
      const mapped = valueMap[value];
      if (mapped !== undefined) {
        out ??= { ...style };
        out[key] = mapped[index] as string;
      }
    }
  }

  if (out === null) {
    // Nothing logical in here. Remember that, and hand back the original so
    // React Native's own style diffing sees an unchanged reference.
    PASSTHROUGH.add(style);
    return style;
  }

  const frozen = Object.freeze(out);
  CACHE[dir].set(style, frozen);
  return frozen;
}

/**
 * Resolves logical style properties to physical ones for a direction.
 *
 * Accepts anything React Native accepts in a `style` prop: an object, a nested
 * array, a falsy value from a conditional, or an opaque numeric
 * registered-style ID (passed through untouched — Harf cannot see inside one,
 * so use {@link createStyles} rather than `StyleSheet.create` for styles that
 * contain logical properties).
 *
 * Resolution is memoised per direction by object identity, so repeated renders
 * of the same style cost one `WeakMap` lookup. A style object containing no
 * logical properties is returned by reference, unchanged.
 *
 * @param style - The style to resolve.
 * @param dir - The direction to resolve for.
 * @returns The style with every logical property replaced by its physical
 *   equivalent. Arrays are returned as arrays, preserving order and cascade.
 *
 * @example
 * ```ts
 * import { resolveStyle } from '@harf/core';
 *
 * const bubble = {
 *   flexDirection: 'row',
 *   paddingStart: 12,
 *   borderTopStartRadius: 16,
 *   textAlign: 'start',
 * };
 *
 * resolveStyle(bubble, 'ltr');
 * // { flexDirection: 'row', paddingLeft: 12, borderTopLeftRadius: 16, textAlign: 'left' }
 *
 * resolveStyle(bubble, 'rtl');
 * // { flexDirection: 'row-reverse', paddingRight: 12, borderTopRightRadius: 16, textAlign: 'right' }
 * ```
 *
 * @example An explicit physical property always wins
 * ```ts
 * resolveStyle({ marginStart: 8, marginLeft: 99 }, 'rtl');
 * // { marginLeft: 99, marginRight: 8 } — your escape hatch is respected
 * ```
 */
export function resolveStyle<T extends StyleInput>(style: T, dir: Direction): T {
  if (style === null || style === undefined || style === false) return style;
  if (typeof style === 'number') return style;

  if (Array.isArray(style)) {
    let changed = false;
    const out = new Array<unknown>(style.length);
    for (let i = 0; i < style.length; i += 1) {
      const entry = style[i] as StyleInput;
      const resolved = resolveStyle(entry, dir);
      out[i] = resolved;
      if (resolved !== entry) changed = true;
    }
    return (changed ? out : style) as T;
  }

  return resolveObject(style as StyleObject, dir) as T;
}

/**
 * A named sheet of logical styles.
 *
 * Call it with a direction to get the physical sheet. The result is memoised
 * per direction, so it is safe to call on every render and safe to pass
 * straight into a style prop without breaking memoisation.
 */
export interface LogicalStyleSheet<T extends Readonly<Record<string, StyleObject>>> {
  /** Resolve the whole sheet for a direction. */
  (dir: Direction): { readonly [K in keyof T]: StyleObject };
  /** The sheet exactly as you wrote it, with logical properties intact. */
  readonly source: T;
}

/**
 * Declares a sheet of logical styles, resolved at render time.
 *
 * This is the direct replacement for `StyleSheet.create` in an app that wants
 * to switch direction without a restart. `StyleSheet.create` freezes physical
 * values at module load against `I18nManager.isRTL`; `createStyles` resolves
 * on demand against React context.
 *
 * @param sheet - Named style objects, which may contain logical properties.
 * @returns A callable sheet. See {@link LogicalStyleSheet}.
 *
 * @example
 * ```ts
 * import { createStyles } from '@harf/core';
 *
 * const styles = createStyles({
 *   row: { flexDirection: 'row', paddingStart: 16 },
 *   label: { textAlign: 'start' },
 * });
 *
 * const rtl = styles('rtl');
 * rtl.row;   // { flexDirection: 'row-reverse', paddingRight: 16 }
 * rtl.label; // { textAlign: 'right' }
 *
 * // Same direction twice returns the identical object, so memoisation holds.
 * styles('rtl') === styles('rtl'); // true
 * ```
 */
export function createStyles<T extends Readonly<Record<string, StyleObject>>>(
  sheet: T,
): LogicalStyleSheet<T> {
  const memo: Partial<Record<Direction, { readonly [K in keyof T]: StyleObject }>> = {};

  const resolve = (dir: Direction): { readonly [K in keyof T]: StyleObject } => {
    const existing = memo[dir];
    if (existing !== undefined) return existing;

    const out: Record<string, StyleObject> = {};
    for (const key in sheet) {
      out[key] = resolveObject(sheet[key] as StyleObject, dir);
    }
    const frozen = Object.freeze(out) as { readonly [K in keyof T]: StyleObject };
    memo[dir] = frozen;
    return frozen;
  };

  return Object.assign(resolve, { source: sheet }) as LogicalStyleSheet<T>;
}

/**
 * Cache statistics for the style resolver, for benchmarks and tests.
 *
 * A style layer that costs a frame is a failed style layer, so the hit rate is
 * something Harf asserts on rather than hopes for.
 *
 * @example
 * ```ts
 * import { resolveStyle, styleCacheStats, resetStyleCacheStats } from '@harf/core';
 *
 * resetStyleCacheStats();
 * const s = { paddingStart: 8 };
 * for (let i = 0; i < 1000; i += 1) resolveStyle(s, 'rtl');
 * styleCacheStats(); // { hits: 999, misses: 1 }
 * ```
 */
export function styleCacheStats(): { readonly hits: number; readonly misses: number } {
  return { hits, misses };
}

/** Resets the counters read by {@link styleCacheStats}. */
export function resetStyleCacheStats(): void {
  hits = 0;
  misses = 0;
}
