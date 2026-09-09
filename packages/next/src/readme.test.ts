/**
 * Every literal output the READMEs claim for `@harf/next`.
 *
 * See `packages/core/src/readme.test.ts` for the rule these files enforce:
 * no README states a result that is not backed by a test.
 */

import { describe, expect, it } from 'vitest';
import { getDirection, htmlDirectionProps, negotiateLocale } from './server';
import { HARF_UTILITIES } from './tailwind';

describe('@harf/next README — the server helpers', () => {
  it('produces the documented html attributes', () => {
    expect(htmlDirectionProps('ar-EG')).toEqual({ lang: 'ar-EG', dir: 'rtl' });
    expect(htmlDirectionProps('en-US')).toEqual({ lang: 'en-US', dir: 'ltr' });
    expect(getDirection({ locale: 'ar-EG' })).toBe('rtl');
  });

  it('serves an ar-SA browser with ar-EG rather than English', () => {
    expect(negotiateLocale('ar-SA', ['en', 'ar-EG'])).toBe('ar-EG');
  });
});

describe('@harf/next README — the utility table', () => {
  it('ships every utility the table lists', () => {
    for (const selector of [
      '.mirror-x',
      '.mirror-none',
      '.bidi-isolate',
      '.dir-ltr',
      '.dir-rtl',
      '.ltr-island',
      '.rtl-island',
    ]) {
      expect(Object.keys(HARF_UTILITIES)).toContain(selector);
    }
  });
});
