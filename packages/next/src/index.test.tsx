import { describe, expect, it } from 'vitest';
import * as harfNext from './index';

describe('@harf/next entry', () => {
  it('re-exports the direction primitives from @harf/core', () => {
    expect(harfNext.DIRECTIONS).toEqual(['ltr', 'rtl']);
    expect(harfNext.isDirection('auto')).toBe(false);
  });
});
