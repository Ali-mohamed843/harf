import { describe, expect, it } from 'vitest';
import { createStyles } from '../style/resolve';
import {
  createRenderBoth,
  findPhysicalProperties,
  findUnresolvedLogicalProperties,
  forEachDirection,
  toHaveNoPhysicalProperties,
  toHaveNoUnresolvedLogicalProperties,
} from './index';

describe('findPhysicalProperties', () => {
  it('finds a physical property at the top level', () => {
    const hits = findPhysicalProperties({ marginLeft: 8 });
    expect(hits).toEqual([{ property: 'marginLeft', value: 8, path: 'marginLeft' }]);
  });

  it('reports a readable path into a nested tree', () => {
    const hits = findPhysicalProperties({ card: { header: { paddingRight: 4 } } });
    expect(hits[0]?.path).toBe('card.header.paddingRight');
  });

  it('indexes into arrays', () => {
    const hits = findPhysicalProperties({ style: [{ ok: 1 }, { marginLeft: 2 }] });
    expect(hits[0]?.path).toBe('style[1].marginLeft');
  });

  it('finds every physical property, not just the first', () => {
    const hits = findPhysicalProperties({
      a: { marginLeft: 1 },
      b: { marginRight: 2 },
      c: { borderTopLeftRadius: 3 },
    });
    expect(hits.map((hit) => hit.property).sort()).toEqual([
      'borderTopLeftRadius',
      'marginLeft',
      'marginRight',
    ]);
  });

  it('finds nothing in a tree that uses only logical properties', () => {
    expect(findPhysicalProperties({ paddingStart: 8, marginEnd: 4 })).toEqual([]);
  });

  it('survives a circular reference', () => {
    const node: Record<string, unknown> = { marginLeft: 1 };
    node.self = node;
    expect(() => findPhysicalProperties(node)).not.toThrow();
    expect(findPhysicalProperties(node)).toHaveLength(1);
  });

  it('ignores primitives and null', () => {
    for (const value of [null, undefined, 1, 'x', true]) {
      expect(findPhysicalProperties(value)).toEqual([]);
    }
  });
});

describe('findUnresolvedLogicalProperties', () => {
  it('finds a logical property that never got resolved', () => {
    const hits = findUnresolvedLogicalProperties({ row: { paddingStart: 8 } });
    expect(hits).toEqual([
      { property: 'paddingStart', value: 8, path: 'row.paddingStart' },
    ]);
  });

  it('finds nothing in a properly resolved tree', () => {
    const styles = createStyles({ row: { paddingStart: 8, flexDirection: 'row' } });
    expect(findUnresolvedLogicalProperties(styles('rtl'))).toEqual([]);
    expect(findUnresolvedLogicalProperties(styles('ltr'))).toEqual([]);
  });

  it('accepts a physical flexDirection and textAlign as already resolved', () => {
    // These property *names* are logical, but 'row' and 'center' are perfectly
    // valid physical values. Only 'start' and 'end' are unresolved.
    expect(
      findUnresolvedLogicalProperties({ flexDirection: 'row', textAlign: 'center' }),
    ).toEqual([]);
    expect(findUnresolvedLogicalProperties({ textAlign: 'start' })).toHaveLength(1);
    expect(findUnresolvedLogicalProperties({ flexDirection: 'row-reverse' })).toEqual([]);
  });

  it('survives a circular reference', () => {
    const node: Record<string, unknown> = { paddingStart: 1 };
    node.self = node;
    expect(findUnresolvedLogicalProperties(node)).toHaveLength(1);
  });

  it('ignores primitives', () => {
    expect(findUnresolvedLogicalProperties('x')).toEqual([]);
  });
});

describe('createRenderBoth', () => {
  const renderBoth = createRenderBoth((styles: ReturnType<typeof createStyles>, dir) =>
    styles(dir),
  );

  it('renders the subject in both directions', () => {
    const styles = createStyles({ row: { paddingStart: 16 } });
    const both = renderBoth(styles);

    expect(both.ltr.row).toEqual({ paddingLeft: 16 });
    expect(both.rtl.row).toEqual({ paddingRight: 16 });
  });

  it('exposes entries for it.each', () => {
    const styles = createStyles({ row: { paddingStart: 16 } });
    const both = renderBoth(styles);

    expect(both.entries.map(([dir]) => dir)).toEqual(['ltr', 'rtl']);
    expect(both.entries[0]?.[1]).toBe(both.ltr);
    expect(both.entries[1]?.[1]).toBe(both.rtl);
  });

  it('gives a different result per direction, which is the point', () => {
    const styles = createStyles({ row: { paddingStart: 16 } });
    const both = renderBoth(styles);
    expect(both.ltr).not.toEqual(both.rtl);
  });
});

describe('toHaveNoPhysicalProperties', () => {
  it('passes for a tree with no physical properties', () => {
    const result = toHaveNoPhysicalProperties({ paddingStart: 8 });
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('contained none');
  });

  it('fails and names every offender with its path', () => {
    const result = toHaveNoPhysicalProperties({ card: { marginLeft: 8, right: 0 } });
    expect(result.pass).toBe(false);
    const message = result.message();
    expect(message).toContain('card.marginLeft');
    expect(message).toContain('card.right');
    expect(message).toContain('found 2');
  });

  it('tells the reader what to do about it', () => {
    const message = toHaveNoPhysicalProperties({ marginLeft: 1 }).message();
    expect(message).toContain('marginStart');
  });

  it('works as a Vitest matcher once registered', () => {
    expect.extend({ toHaveNoPhysicalProperties });
    const styles = createStyles({ row: { paddingStart: 8 } });
    expect(styles.source).toHaveNoPhysicalProperties();
    expect({ marginLeft: 1 }).not.toHaveNoPhysicalProperties();
  });
});

describe('toHaveNoUnresolvedLogicalProperties', () => {
  it('passes for a resolved tree', () => {
    const styles = createStyles({ row: { paddingStart: 8 } });
    const result = toHaveNoUnresolvedLogicalProperties(styles('rtl'));
    expect(result.pass).toBe(true);
    expect(result.message()).toContain('contained none');
  });

  it('fails for an unresolved one and explains the consequence', () => {
    const result = toHaveNoUnresolvedLogicalProperties({ row: { paddingStart: 8 } });
    expect(result.pass).toBe(false);
    const message = result.message();
    expect(message).toContain('row.paddingStart');
    expect(message).toContain('I18nManager.isRTL');
  });

  it('works as a Vitest matcher once registered', () => {
    expect.extend({ toHaveNoUnresolvedLogicalProperties });
    const styles = createStyles({ row: { paddingStart: 8 } });
    expect(styles('rtl')).toHaveNoUnresolvedLogicalProperties();
    expect(styles.source).not.toHaveNoUnresolvedLogicalProperties();
  });
});

describe('the two matchers together', () => {
  it('describe opposite ends of the pipeline', () => {
    const styles = createStyles({ row: { paddingStart: 8, flexDirection: 'row' } });

    // Source: logical, no physical properties.
    expect(toHaveNoPhysicalProperties(styles.source).pass).toBe(true);
    expect(toHaveNoUnresolvedLogicalProperties(styles.source).pass).toBe(false);

    // Rendered: physical, no unresolved logical properties.
    expect(toHaveNoPhysicalProperties(styles('rtl')).pass).toBe(false);
    expect(toHaveNoUnresolvedLogicalProperties(styles('rtl')).pass).toBe(true);
  });
});

describe('forEachDirection', () => {
  it('runs once per direction, in order', () => {
    const seen: string[] = [];
    forEachDirection((dir) => seen.push(dir));
    expect(seen).toEqual(['ltr', 'rtl']);
  });
});

declare module 'vitest' {
  interface Matchers<T = unknown> {
    toHaveNoPhysicalProperties(): T;
    toHaveNoUnresolvedLogicalProperties(): T;
  }
}
