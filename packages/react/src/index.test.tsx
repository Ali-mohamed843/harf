import { describe, expect, it } from 'vitest';
import * as harfReact from './index';

describe('@harf/react entry', () => {
  it('re-exports the direction primitives from @harf/core', () => {
    expect(harfReact.DIRECTIONS).toEqual(['ltr', 'rtl']);
    expect(harfReact.isDirection('rtl')).toBe(true);
    expect(harfReact.oppositeDirection('rtl')).toBe('ltr');
  });

  it('runs in a DOM environment', () => {
    expect(typeof document).toBe('object');
  });
});
