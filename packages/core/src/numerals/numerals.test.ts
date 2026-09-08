import { describe, expect, it } from 'vitest';
import {
  convertDigits,
  detectNumeralSystem,
  isCopySensitive,
  numeralSystemForLocale,
  toArabicDigits,
  toPersianDigits,
  toWesternDigits,
  type NumeralSystem,
} from './index';

const SYSTEMS: readonly NumeralSystem[] = ['western', 'arabic', 'persian'];

const DIGITS: Readonly<Record<NumeralSystem, string>> = {
  western: '0123456789',
  arabic: '٠١٢٣٤٥٦٧٨٩',
  persian: '۰۱۲۳۴۵۶۷۸۹',
};

describe('convertDigits', () => {
  it.each(SYSTEMS)('converts a full digit run to %s', (system) => {
    expect(convertDigits('0123456789', system)).toBe(DIGITS[system]);
  });

  it('converts between every pair of systems', () => {
    for (const from of SYSTEMS) {
      for (const to of SYSTEMS) {
        expect(convertDigits(DIGITS[from], to)).toBe(DIGITS[to]);
      }
    }
  });

  it('is lossless: any round trip returns the original', () => {
    for (const from of SYSTEMS) {
      for (const to of SYSTEMS) {
        expect(convertDigits(convertDigits(DIGITS[from], to), from)).toBe(DIGITS[from]);
      }
    }
  });

  it('leaves everything that is not a digit alone', () => {
    expect(toArabicDigits('12.5')).toBe('١٢.٥');
    expect(toArabicDigits('-42')).toBe('-٤٢');
    expect(toArabicDigits('صفحة 3 من 10')).toBe('صفحة ٣ من ١٠');
  });

  it('accepts a number as well as a string', () => {
    expect(toArabicDigits(2026)).toBe('٢٠٢٦');
    expect(toPersianDigits(1405)).toBe('۱۴۰۵');
    expect(toWesternDigits(42)).toBe('42');
  });

  it('handles an already-mixed string', () => {
    expect(toWesternDigits('٢0۳')).toBe('203');
  });

  it('handles an empty string', () => {
    for (const system of SYSTEMS) {
      expect(convertDigits('', system)).toBe('');
    }
  });

  it('is not confused by repeated calls (global regex lastIndex)', () => {
    for (let i = 0; i < 5; i += 1) {
      expect(toArabicDigits('123')).toBe('١٢٣');
    }
  });
});

describe('toWesternDigits — the parsing case', () => {
  it('makes an Arabic-Indic number parseable, which it is not otherwise', () => {
    // A numeric keypad on an Arabic keyboard layout can emit these. Without
    // normalisation, Number() silently produces NaN.
    expect(Number('٢٠٢٦')).toBeNaN();
    expect(Number(toWesternDigits('٢٠٢٦'))).toBe(2026);
    expect(Number.parseFloat(toWesternDigits('١٢.٥'))).toBe(12.5);
  });
});

describe('numeralSystemForLocale', () => {
  it('defaults ar-EG to Western digits — deliberately', () => {
    // Egypt uses Western digits far more than people assume. This is a
    // configuration decision, documented, not a guess made at render time.
    expect(numeralSystemForLocale('ar-EG')).toBe('western');
    expect(numeralSystemForLocale('ar')).toBe('western');
    expect(numeralSystemForLocale('ar-SA')).toBe('western');
    expect(numeralSystemForLocale('ar-AE')).toBe('western');
  });

  it('uses Arabic-Indic where it is genuinely the norm', () => {
    expect(numeralSystemForLocale('ar-YE')).toBe('arabic');
    expect(numeralSystemForLocale('ar-SD')).toBe('arabic');
    expect(numeralSystemForLocale('ar-IQ')).toBe('arabic');
  });

  it('uses Persian digits for the Persian-script languages', () => {
    expect(numeralSystemForLocale('fa')).toBe('persian');
    expect(numeralSystemForLocale('fa-IR')).toBe('persian');
    expect(numeralSystemForLocale('ps-AF')).toBe('persian');
    expect(numeralSystemForLocale('ur-PK')).toBe('persian');
  });

  it('uses Western digits for everything else', () => {
    expect(numeralSystemForLocale('en-US')).toBe('western');
    expect(numeralSystemForLocale('he-IL')).toBe('western');
    expect(numeralSystemForLocale('')).toBe('western');
  });

  it('is case-insensitive and accepts underscores', () => {
    expect(numeralSystemForLocale('AR_YE')).toBe('arabic');
    expect(numeralSystemForLocale('FA')).toBe('persian');
  });
});

describe('detectNumeralSystem', () => {
  it.each(SYSTEMS)('recognises %s digits', (system) => {
    expect(detectNumeralSystem(DIGITS[system])).toBe(system);
  });

  it('returns null for a string with no digits', () => {
    expect(detectNumeralSystem('مرحبا')).toBeNull();
    expect(detectNumeralSystem('')).toBeNull();
  });

  it('returns null for a mixed string rather than guessing', () => {
    expect(detectNumeralSystem('٢0')).toBeNull();
    expect(detectNumeralSystem('۳٤')).toBeNull();
  });

  it('ignores surrounding text', () => {
    expect(detectNumeralSystem('صفحة ٣ من ١٠')).toBe('arabic');
  });
});

describe('isCopySensitive — the values that must never be converted', () => {
  it.each([
    ['an international phone number', '+20 114 919 9190'],
    ['a local phone number', '0100 123 4567'],
    ['an OTP code', '483920'],
    ['a national ID', '29001011234567'],
    ['an IBAN', 'EG380019000500000000263180002'],
    ['an order reference', 'KRN-2026-0042'],
    ['a version number', '1.2.3'],
    ['an IP address', '192.168.1.1'],
  ])('flags %s', (_label, value) => {
    expect(isCopySensitive(value)).toBe(true);
  });

  it.each([
    ['a small quantity', '25'],
    ['a formatted price', '1,250.00'],
    ['a percentage', '45%'],
    ['a year', '2026'],
    ['empty', ''],
    ['whitespace', '   '],
    ['plain words', 'مرحبا'],
  ])('does not flag %s', (_label, value) => {
    expect(isCopySensitive(value)).toBe(false);
  });
});
