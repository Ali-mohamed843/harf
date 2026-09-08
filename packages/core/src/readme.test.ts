/**
 * Every literal output claimed in a README, asserted.
 *
 * The rule for this project is that no README states a result that is not
 * backed by a test. This file is that backing. When a claim in a README
 * changes, this file changes with it — and if it does not, CI fails.
 */

import { describe, expect, it } from 'vitest';
import {
  autoIsolate,
  createStyles,
  directionForLocale,
  directionSign,
  findBidiRuns,
  formatCurrency,
  formatNumber,
  isCopySensitive,
  isolate,
  mirrorIf,
  numeralSystemForLocale,
  resolveStyle,
  shouldMirror,
  stripBidi,
  toArabicDigits,
  toWesternDigits,
} from './index';
import { arabicSafeText, fontFamilyStack } from '../../fonts/src/index';
import { toLogicalClass } from '../../eslint-plugin/src/rules/no-physical-tailwind';
import { getDirection, htmlDirectionProps, negotiateLocale } from '../../next/src/server';

describe('root README — the headline example', () => {
  const styles = createStyles({
    row: { flexDirection: 'row', paddingStart: 16, borderTopStartRadius: 12 },
    title: { textAlign: 'start', fontSize: 18 },
  });

  it('resolves exactly as the README says', () => {
    expect(styles('ltr').row).toEqual({
      flexDirection: 'row',
      paddingLeft: 16,
      borderTopLeftRadius: 12,
    });
    expect(styles('rtl').row).toEqual({
      flexDirection: 'row-reverse',
      paddingRight: 16,
      borderTopRightRadius: 12,
    });
  });

  it('memoises, as claimed', () => {
    expect(styles('rtl')).toBe(styles('rtl'));
  });
});

describe('root README — the bidi table', () => {
  it.each([
    [
      'مرحبا بك في Karnak Holidays 2026 اليوم',
      'Karnak Holidays 2026',
      'script',
      'trailing digits stay, the following Arabic word does not',
    ],
    [
      'اتصل على +20 114 919 9190 الآن',
      '+20 114 919 9190',
      'atomic',
      'found despite containing no strong character',
    ],
    [
      'راسلنا على ali@karnak.com لأي استفسار',
      'ali@karnak.com',
      'atomic',
      'the address stays contiguous',
    ],
  ])('%s → %s (%s)', (source, expected, reason) => {
    const runs = findBidiRuns(source);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.text).toBe(expected);
    expect(runs[0]?.reason).toBe(reason);
  });

  it('isolates a URL whole, never internally', () => {
    const source = 'زوروا https://karnak.com/عروض?ref=ar';
    const out = autoIsolate(source);
    expect(out).toContain('https://karnak.com/عروض?ref=ar');
    expect(stripBidi(out)).toBe(source);
  });

  it('never half-encloses a bracket pair', () => {
    for (const run of findBidiRuns('اشتر (Karnak Pro) الآن')) {
      expect((run.text.match(/\(/g) ?? []).length).toBe(
        (run.text.match(/\)/g) ?? []).length,
      );
    }
  });

  it('gives one isolate per list item', () => {
    const runs = findBidiRuns('المنتجات: iPhone، Galaxy، Redmi');
    expect(runs.map((run) => run.text)).toEqual(['iPhone', 'Galaxy', 'Redmi']);
  });

  it('is idempotent and reversible for every case in the table', () => {
    for (const source of [
      'مرحبا بك في Karnak Holidays 2026 اليوم',
      'اتصل على +20 114 919 9190 الآن',
      'راسلنا على ali@karnak.com لأي استفسار',
      'زوروا https://karnak.com/عروض?ref=ar',
      'اشتر (Karnak Pro) الآن',
      'المنتجات: iPhone، Galaxy، Redmi',
    ]) {
      expect(stripBidi(autoIsolate(source))).toBe(source);
      expect(autoIsolate(autoIsolate(source))).toBe(autoIsolate(source));
    }
  });
});

describe('root README — currency', () => {
  it.each([
    [1250.5, 'EGP', {}, '1,250.50 ج.م.'],
    [1250.5, 'EGP', { locale: 'en' }, 'E£1,250.50'],
    [19.5, 'KWD', {}, '19.500 د.ك'],
    [-42, 'SAR', {}, '-42.00 ر.س'],
  ])('formatCurrency(%s, %s) is %s', (value, currency, options, expected) => {
    expect(formatCurrency(value as number, currency as string, options)).toBe(expected);
  });

  it('rounds where toFixed does not', () => {
    expect((1.005).toFixed(2)).toBe('1.00');
    expect(formatNumber(1.005, { decimals: 2 })).toBe('1.01');
  });
});

describe('root README — numerals', () => {
  it('matches every claimed conversion', () => {
    expect(toArabicDigits(2026)).toBe('٢٠٢٦');
    expect(Number('٢٠٢٦')).toBeNaN();
    expect(Number(toWesternDigits('٢٠٢٦'))).toBe(2026);
    expect(numeralSystemForLocale('ar-EG')).toBe('western');
    expect(numeralSystemForLocale('fa-IR')).toBe('persian');
  });

  it('flags every copy-sensitive example', () => {
    for (const value of ['+20 114 919 9190', '483920', 'KRN-2026-0042']) {
      expect(isCopySensitive(value)).toBe(true);
    }
  });
});

describe('root README — mirroring', () => {
  it('matches every claimed decision', () => {
    expect(shouldMirror('chevron-forward', 'rtl')).toBe(true);
    expect(shouldMirror('clock', 'rtl')).toBe(false);
    expect(shouldMirror('your-own-glyph', 'rtl')).toBe(false);
    expect(shouldMirror('play', 'rtl')).toBe(false);
  });

  it('knows the icon-set names the README lists', () => {
    for (const name of [
      'chevron-forward',
      'chevron-back',
      'keyboard-arrow-left',
      'chevrons-right',
      'corner-up-left',
      'circle-chevron-left',
    ]) {
      expect(shouldMirror(name, 'rtl')).toBe(true);
    }
  });

  it('returns a frozen singleton from mirrorIf', () => {
    expect(mirrorIf('rtl')).toEqual({ transform: [{ scaleX: -1 }] });
    expect(mirrorIf('rtl')).toBe(mirrorIf('rtl'));
  });
});

describe('root README — direction and gestures', () => {
  it('matches the claimed locale resolutions', () => {
    expect(directionForLocale('ar-EG')).toBe('rtl');
    expect(directionForLocale('ku-Latn')).toBe('ltr');
  });

  it('flips a horizontal offset', () => {
    expect(40 * directionSign('rtl')).toBe(-40);
  });
});

describe('@harf/core README — the escape hatch', () => {
  it('lets a hand-written physical property win, exactly as documented', () => {
    expect(resolveStyle({ marginStart: 8, marginLeft: 99 }, 'rtl')).toEqual({
      marginLeft: 99,
      marginRight: 8,
    });
  });

  it('isolates and strips losslessly', () => {
    const value = 'Karnak Holidays 2026';
    expect(stripBidi(isolate(value))).toBe(value);
  });
});

describe('@harf/fonts README — the table and the example', () => {
  it('produces the documented output for Cairo at 16', () => {
    const style = arabicSafeText({ family: 'Cairo', fontSize: 16 });
    expect(style.fontSize).toBe(16);
    expect(style.lineHeight).toBe(28);
    expect(style.paddingVertical).toBe(1.6);
    expect(style.fontFamily).toBe('Cairo, Inter, "Helvetica Neue", Arial, sans-serif');
  });

  it('matches every multiplier in the README table', () => {
    const claimed: Record<string, number> = {
      Rubik: 1.5,
      Tajawal: 1.6,
      'IBM Plex Sans Arabic': 1.6,
      Changa: 1.65,
      Almarai: 1.7,
      'Noto Sans Arabic': 1.7,
      Cairo: 1.75,
      'Noto Naskh Arabic': 2.0,
      Lateef: 2.0,
      Amiri: 2.1,
    };
    for (const [family, multiplier] of Object.entries(claimed)) {
      expect(arabicSafeText({ family, fontSize: 100 }).lineHeight).toBe(multiplier * 100);
    }
  });

  it('produces the documented fallback chain', () => {
    expect(fontFamilyStack('Cairo')).toBe(
      'Cairo, Inter, "Helvetica Neue", Arial, sans-serif',
    );
  });
});

describe('@harf/eslint-plugin README — the fix examples', () => {
  it('rewrites every class in the documented before/after pair', () => {
    const before = 'ml-4 pr-2 text-left md:mr-8 hover:border-l-2'.split(' ');
    const after = 'ms-4 pe-2 text-start md:me-8 hover:border-s-2'.split(' ');
    expect(before.map((c) => toLogicalClass(c) ?? c)).toEqual(after);
  });
});

describe('@harf/next README — the server helpers', () => {
  it('produces the documented html attributes', () => {
    expect(htmlDirectionProps('ar-EG')).toEqual({ lang: 'ar-EG', dir: 'rtl' });
    expect(getDirection({ locale: 'ar-EG' })).toBe('rtl');
  });

  it('serves an ar-SA browser with ar-EG rather than English', () => {
    expect(negotiateLocale('ar-SA', ['en', 'ar-EG'])).toBe('ar-EG');
  });
});
