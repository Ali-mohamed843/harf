import { describe, expect, it } from 'vitest';
import * as harfNative from './index';

describe('@harf/native entry', () => {
  it('re-exports the direction primitives from @harf/core', () => {
    expect(harfNative.DIRECTIONS).toEqual(['ltr', 'rtl']);
    expect(harfNative.isDirection('ltr')).toBe(true);
    expect(harfNative.oppositeDirection('ltr')).toBe('rtl');
  });
});
