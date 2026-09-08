import { describe, expect, it } from 'vitest';
import { DIRECTIONS, isDirection, oppositeDirection, type Direction } from './index';

describe('DIRECTIONS', () => {
  it('contains exactly ltr and rtl, in that order', () => {
    expect(DIRECTIONS).toEqual(['ltr', 'rtl']);
  });

  it('is frozen so a consumer cannot mutate the shared array', () => {
    expect(Object.isFrozen(DIRECTIONS)).toBe(true);
  });
});

describe('isDirection', () => {
  it.each(['ltr', 'rtl'])('accepts %s', (value) => {
    expect(isDirection(value)).toBe(true);
  });

  it.each([
    ['uppercase', 'RTL'],
    ['mixed case', 'Rtl'],
    ['auto', 'auto'],
    ['empty string', ''],
    ['whitespace padded', ' rtl '],
    ['null', null],
    ['undefined', undefined],
    ['number', 0],
    ['object', { dir: 'rtl' }],
  ])('rejects %s', (_label, value) => {
    expect(isDirection(value)).toBe(false);
  });
});

describe('oppositeDirection', () => {
  it('flips both directions', () => {
    expect(oppositeDirection('ltr')).toBe('rtl');
    expect(oppositeDirection('rtl')).toBe('ltr');
  });

  it('is its own inverse for every direction', () => {
    for (const dir of DIRECTIONS) {
      expect(oppositeDirection(oppositeDirection(dir))).toBe(dir);
    }
  });

  it('never returns the direction it was given', () => {
    const seen = new Set<Direction>();
    for (const dir of DIRECTIONS) {
      expect(oppositeDirection(dir)).not.toBe(dir);
      seen.add(dir);
    }
    expect(seen.size).toBe(2);
  });
});
