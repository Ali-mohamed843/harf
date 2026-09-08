import { beforeEach, describe, expect, it } from 'vitest';
import { DIRECTIONS, type Direction } from '../direction';
import {
  EDGE_PROPERTIES,
  LOGICAL_PROPERTY_NAMES,
  PHYSICAL_PROPERTIES,
  VALUE_PROPERTIES,
} from './properties';
import {
  createStyles,
  resetStyleCacheStats,
  resolveStyle,
  styleCacheStats,
} from './resolve';
import type { StyleInput } from './types';

describe('EDGE_PROPERTIES', () => {
  it('maps every logical edge to a physical one that flips between directions', () => {
    for (const [logical, [ltr, rtl]] of Object.entries(EDGE_PROPERTIES)) {
      expect(ltr).not.toBe(rtl);
      expect(PHYSICAL_PROPERTIES.has(ltr)).toBe(true);
      expect(PHYSICAL_PROPERTIES.has(rtl)).toBe(true);
      expect(LOGICAL_PROPERTY_NAMES.has(logical)).toBe(true);
    }
  });

  it.each([
    ['marginStart', 'marginEnd'],
    ['paddingStart', 'paddingEnd'],
    ['marginInlineStart', 'marginInlineEnd'],
    ['paddingInlineStart', 'paddingInlineEnd'],
    ['borderStartWidth', 'borderEndWidth'],
    ['borderStartColor', 'borderEndColor'],
    ['start', 'end'],
    ['insetInlineStart', 'insetInlineEnd'],
    ['borderTopStartRadius', 'borderTopEndRadius'],
    ['borderBottomStartRadius', 'borderBottomEndRadius'],
    // The CSS four-corner names. The *second* segment is the inline axis, so
    // start-start pairs with start-end (both on the block-start edge), not
    // with end-end.
    ['borderStartStartRadius', 'borderStartEndRadius'],
    ['borderEndStartRadius', 'borderEndEndRadius'],
  ])('%s and %s are exact mirrors of each other', (startName, endName) => {
    const start = EDGE_PROPERTIES[startName];
    const end = EDGE_PROPERTIES[endName];
    expect(start).toBeDefined();
    expect(end).toBeDefined();
    // The end property under LTR resolves to the start property's RTL result.
    expect(end?.[0]).toBe(start?.[1]);
    expect(end?.[1]).toBe(start?.[0]);
  });

  it('keeps the block axis fixed while flipping only the inline axis', () => {
    // border-start-end-radius is the top-right corner under LTR. Getting this
    // pair backwards mirrors a card vertically instead of horizontally.
    expect(EDGE_PROPERTIES.borderStartStartRadius?.[0]).toBe('borderTopLeftRadius');
    expect(EDGE_PROPERTIES.borderStartEndRadius?.[0]).toBe('borderTopRightRadius');
    expect(EDGE_PROPERTIES.borderEndStartRadius?.[0]).toBe('borderBottomLeftRadius');
    expect(EDGE_PROPERTIES.borderEndEndRadius?.[0]).toBe('borderBottomRightRadius');

    for (const name of [
      'borderStartStartRadius',
      'borderStartEndRadius',
      'borderEndStartRadius',
      'borderEndEndRadius',
    ]) {
      const [ltr, rtl] = EDGE_PROPERTIES[name] as readonly [string, string];
      const block = (n: string) => (n.includes('Top') ? 'Top' : 'Bottom');
      expect(block(ltr)).toBe(block(rtl));
    }
  });

  it('never lists a physical property as a logical one', () => {
    for (const physical of PHYSICAL_PROPERTIES) {
      expect(LOGICAL_PROPERTY_NAMES.has(physical)).toBe(false);
    }
  });
});

describe('resolveStyle — edge properties', () => {
  it.each(Object.entries(EDGE_PROPERTIES))(
    'resolves %s to the right physical property in both directions',
    (logical, mapping) => {
      const [ltrName, rtlName] = mapping;
      const input = { [logical]: 42 };

      const ltr = resolveStyle(input, 'ltr') as Record<string, unknown>;
      expect(ltr[ltrName]).toBe(42);
      expect(ltr[logical]).toBeUndefined();

      const rtl = resolveStyle(input, 'rtl') as Record<string, unknown>;
      expect(rtl[rtlName]).toBe(42);
      expect(rtl[logical]).toBeUndefined();
    },
  );

  it('resolves the full set of border radius corners', () => {
    const card = {
      borderTopStartRadius: 16,
      borderTopEndRadius: 4,
      borderBottomStartRadius: 8,
      borderBottomEndRadius: 2,
    };

    expect(resolveStyle(card, 'ltr')).toEqual({
      borderTopLeftRadius: 16,
      borderTopRightRadius: 4,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 2,
    });

    expect(resolveStyle(card, 'rtl')).toEqual({
      borderTopRightRadius: 16,
      borderTopLeftRadius: 4,
      borderBottomRightRadius: 8,
      borderBottomLeftRadius: 2,
    });
  });

  it('resolves absolute positioning', () => {
    expect(resolveStyle({ start: 0, end: 12 }, 'ltr')).toEqual({ left: 0, right: 12 });
    expect(resolveStyle({ start: 0, end: 12 }, 'rtl')).toEqual({ right: 0, left: 12 });
  });

  it('keeps non-logical properties untouched', () => {
    const input = { paddingStart: 8, backgroundColor: 'red', width: 100, opacity: 0.5 };
    const out = resolveStyle(input, 'rtl') as Record<string, unknown>;
    expect(out.backgroundColor).toBe('red');
    expect(out.width).toBe(100);
    expect(out.opacity).toBe(0.5);
  });

  it('preserves a falsy but meaningful value such as 0', () => {
    expect(resolveStyle({ marginStart: 0 }, 'rtl')).toEqual({ marginRight: 0 });
  });

  it('preserves an explicit undefined, which React Native treats as a reset', () => {
    const out = resolveStyle({ marginStart: undefined }, 'rtl') as Record<
      string,
      unknown
    >;
    expect('marginRight' in out).toBe(true);
    expect(out.marginRight).toBeUndefined();
  });
});

describe('resolveStyle — value properties', () => {
  it('resolves textAlign start and end', () => {
    expect(resolveStyle({ textAlign: 'start' }, 'ltr')).toEqual({ textAlign: 'left' });
    expect(resolveStyle({ textAlign: 'start' }, 'rtl')).toEqual({ textAlign: 'right' });
    expect(resolveStyle({ textAlign: 'end' }, 'ltr')).toEqual({ textAlign: 'right' });
    expect(resolveStyle({ textAlign: 'end' }, 'rtl')).toEqual({ textAlign: 'left' });
  });

  it('leaves an explicit physical textAlign alone in both directions', () => {
    // Someone who wrote textAlign: 'left' meant left. Centring a column of
    // numbers, for instance, must not flip when the UI language changes.
    for (const dir of DIRECTIONS) {
      expect(resolveStyle({ textAlign: 'left' }, dir)).toEqual({ textAlign: 'left' });
      expect(resolveStyle({ textAlign: 'center' }, dir)).toEqual({ textAlign: 'center' });
    }
  });

  it('reverses a row under RTL and leaves it alone under LTR', () => {
    expect(resolveStyle({ flexDirection: 'row' }, 'ltr')).toEqual({
      flexDirection: 'row',
    });
    expect(resolveStyle({ flexDirection: 'row' }, 'rtl')).toEqual({
      flexDirection: 'row-reverse',
    });
  });

  it('un-reverses an explicitly reversed row under RTL', () => {
    expect(resolveStyle({ flexDirection: 'row-reverse' }, 'rtl')).toEqual({
      flexDirection: 'row',
    });
  });

  it('never touches a column', () => {
    for (const dir of DIRECTIONS) {
      expect(resolveStyle({ flexDirection: 'column' }, dir)).toEqual({
        flexDirection: 'column',
      });
      expect(resolveStyle({ flexDirection: 'column-reverse' }, dir)).toEqual({
        flexDirection: 'column-reverse',
      });
    }
  });

  it('covers every value listed in VALUE_PROPERTIES', () => {
    for (const [property, values] of Object.entries(VALUE_PROPERTIES)) {
      for (const [value, [ltr, rtl]] of Object.entries(values)) {
        expect(resolveStyle({ [property]: value }, 'ltr')).toEqual({ [property]: ltr });
        expect(resolveStyle({ [property]: value }, 'rtl')).toEqual({ [property]: rtl });
      }
    }
  });
});

describe('resolveStyle — collisions and escape hatches', () => {
  it('lets a hand-written physical property win over the logical one', () => {
    const out = resolveStyle({ marginStart: 8, marginLeft: 99 }, 'rtl') as Record<
      string,
      unknown
    >;
    expect(out.marginLeft).toBe(99);
    expect(out.marginRight).toBe(8);
  });

  it('does not drop the physical property when the two would collide', () => {
    const out = resolveStyle({ marginStart: 8, marginLeft: 99 }, 'ltr') as Record<
      string,
      unknown
    >;
    // Under LTR marginStart also wants marginLeft. The explicit one wins and
    // the logical one is discarded rather than silently overwriting it.
    expect(out.marginLeft).toBe(99);
    expect(out.marginStart).toBeUndefined();
  });
});

describe('resolveStyle — shapes React Native actually passes', () => {
  it('resolves each member of an array', () => {
    const input = [{ paddingStart: 4 }, { marginEnd: 8 }];
    expect(resolveStyle(input, 'rtl')).toEqual([{ paddingRight: 4 }, { marginLeft: 8 }]);
  });

  it('resolves nested arrays', () => {
    const input = [{ paddingStart: 4 }, [{ marginEnd: 8 }, { start: 1 }]];
    expect(resolveStyle(input, 'rtl')).toEqual([
      { paddingRight: 4 },
      [{ marginLeft: 8 }, { right: 1 }],
    ]);
  });

  it('passes falsy array members through, preserving their positions', () => {
    const input: StyleInput = [
      { paddingStart: 4 },
      false,
      null,
      undefined,
      { marginEnd: 8 },
    ];
    expect(resolveStyle(input, 'rtl')).toEqual([
      { paddingRight: 4 },
      false,
      null,
      undefined,
      { marginLeft: 8 },
    ]);
  });

  it('passes an opaque registered-style ID through untouched', () => {
    // StyleSheet.create may hand back an opaque number. Harf cannot see inside
    // one, so it must not corrupt it — use createStyles for logical styles.
    expect(resolveStyle(42, 'rtl')).toBe(42);
    expect(resolveStyle([42, { paddingStart: 4 }], 'rtl')).toEqual([
      42,
      { paddingRight: 4 },
    ]);
  });

  it.each([null, undefined, false] as const)('passes %s through', (value) => {
    expect(resolveStyle(value, 'rtl')).toBe(value);
  });

  it('handles an empty object and an empty array', () => {
    const empty = {};
    expect(resolveStyle(empty, 'rtl')).toBe(empty);
    const emptyArray: never[] = [];
    expect(resolveStyle(emptyArray, 'rtl')).toBe(emptyArray);
  });
});

describe('resolveStyle — identity and memoisation', () => {
  beforeEach(() => {
    resetStyleCacheStats();
  });

  it('returns the very same object when there is nothing logical to resolve', () => {
    // React Native diffs styles by reference. Returning a fresh copy of an
    // unchanged style would make every re-render look like a style change.
    const plain = { backgroundColor: 'red', width: 10 };
    expect(resolveStyle(plain, 'ltr')).toBe(plain);
    expect(resolveStyle(plain, 'rtl')).toBe(plain);
  });

  it('returns the very same array when no member changed', () => {
    const input = [{ color: 'red' }, { width: 1 }];
    expect(resolveStyle(input, 'rtl')).toBe(input);
  });

  it('returns an identical object for repeated calls with the same direction', () => {
    const style = { paddingStart: 8 };
    const first = resolveStyle(style, 'rtl');
    const second = resolveStyle(style, 'rtl');
    expect(second).toBe(first);
  });

  it('caches each direction separately', () => {
    const style = { paddingStart: 8 };
    const ltr = resolveStyle(style, 'ltr');
    const rtl = resolveStyle(style, 'rtl');
    expect(ltr).not.toBe(rtl);
    expect(resolveStyle(style, 'ltr')).toBe(ltr);
    expect(resolveStyle(style, 'rtl')).toBe(rtl);
  });

  it('resolves a style object exactly once per direction, however often it is used', () => {
    // The performance guarantee: O(1) per style object per direction. A style
    // layer that recomputes on every frame is a failed style layer.
    const style = { paddingStart: 8, flexDirection: 'row' };
    resetStyleCacheStats();
    for (let i = 0; i < 1000; i += 1) resolveStyle(style, 'rtl');
    expect(styleCacheStats()).toEqual({ hits: 999, misses: 1 });
  });

  it('costs one cache hit for a style with no logical properties', () => {
    const style = { backgroundColor: 'red' };
    resolveStyle(style, 'rtl');
    resetStyleCacheStats();
    for (let i = 0; i < 100; i += 1) resolveStyle(style, 'rtl');
    expect(styleCacheStats().misses).toBe(0);
    expect(styleCacheStats().hits).toBe(100);
  });

  it('freezes its output so a consumer cannot corrupt the cache', () => {
    const resolved = resolveStyle({ paddingStart: 8 }, 'rtl');
    expect(Object.isFrozen(resolved)).toBe(true);
  });
});

describe('createStyles', () => {
  it('resolves every named style in the sheet', () => {
    const styles = createStyles({
      row: { flexDirection: 'row', paddingStart: 16 },
      label: { textAlign: 'start' },
    });

    expect(styles('ltr')).toEqual({
      row: { flexDirection: 'row', paddingLeft: 16 },
      label: { textAlign: 'left' },
    });
    expect(styles('rtl')).toEqual({
      row: { flexDirection: 'row-reverse', paddingRight: 16 },
      label: { textAlign: 'right' },
    });
  });

  it('returns the identical sheet object for repeated calls', () => {
    const styles = createStyles({ row: { paddingStart: 4 } });
    expect(styles('rtl')).toBe(styles('rtl'));
    expect(styles('ltr')).toBe(styles('ltr'));
    expect(styles('ltr')).not.toBe(styles('rtl'));
  });

  it('exposes the source sheet with logical properties intact', () => {
    const source = { row: { paddingStart: 4 } };
    const styles = createStyles(source);
    expect(styles.source).toBe(source);
    expect(styles.source.row.paddingStart).toBe(4);
  });

  it('handles an empty sheet', () => {
    const styles = createStyles({});
    expect(styles('rtl')).toEqual({});
  });

  it('resolves lazily — no work happens until a direction is asked for', () => {
    resetStyleCacheStats();
    createStyles({ a: { paddingStart: 1 }, b: { marginEnd: 2 } });
    expect(styleCacheStats().misses).toBe(0);
  });
});

describe('the whole point: switching direction is just a re-render', () => {
  it('produces a different physical sheet for each direction from one source', () => {
    // Nothing is baked in at module load, so there is nothing that would need
    // an app restart to change. This is the property `StyleSheet.create` plus
    // I18nManager.forceRTL cannot give you.
    const styles = createStyles({
      bubble: {
        flexDirection: 'row',
        paddingStart: 12,
        borderTopStartRadius: 16,
        textAlign: 'start',
      },
    });

    const snapshots: Record<Direction, unknown> = {
      ltr: styles('ltr').bubble,
      rtl: styles('rtl').bubble,
    };

    expect(snapshots.ltr).toEqual({
      flexDirection: 'row',
      paddingLeft: 12,
      borderTopLeftRadius: 16,
      textAlign: 'left',
    });
    expect(snapshots.rtl).toEqual({
      flexDirection: 'row-reverse',
      paddingRight: 12,
      borderTopRightRadius: 16,
      textAlign: 'right',
    });
  });

  it('leaves no logical property behind in either direction', () => {
    const styles = createStyles({
      everything: Object.fromEntries(Object.keys(EDGE_PROPERTIES).map((key) => [key, 1])),
    });

    for (const dir of DIRECTIONS) {
      for (const key of Object.keys(styles(dir).everything)) {
        expect(LOGICAL_PROPERTY_NAMES.has(key)).toBe(false);
      }
    }
  });
});
