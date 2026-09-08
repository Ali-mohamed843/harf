import { describe, expect, it } from 'vitest';
import { CURRENCIES, currencyDisplay } from './currency-data';
import { formatCurrency, formatNumber, intlCurrencyReference } from './number';
import { getIntlCapabilities, missingIntlFeatures } from './capabilities';
import { formatDate, formatHijriDate, toHijriParts } from './date';

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(0)).toBe('0');
  });

  it('does not group when asked not to', () => {
    expect(formatNumber(1234567, { grouping: false })).toBe('1234567');
  });

  it('honours the decimal count', () => {
    expect(formatNumber(1234.5, { decimals: 2 })).toBe('1,234.50');
    expect(formatNumber(1234.567, { decimals: 2 })).toBe('1,234.57');
    expect(formatNumber(1234.5, { decimals: 0 })).toBe('1,235');
  });

  it('trims optional trailing zeros down to minDecimals', () => {
    expect(formatNumber(1.5, { decimals: 3, minDecimals: 1 })).toBe('1.5');
    expect(formatNumber(1.5, { decimals: 3, minDecimals: 3 })).toBe('1.500');
    expect(formatNumber(1, { decimals: 2, minDecimals: 0 })).toBe('1');
  });

  it('rounds half away from zero, symmetrically', () => {
    // Math.round rounds half *up*, so it turns -0.5 into -0 and breaks the
    // symmetry between a debit and the credit that reverses it.
    expect(formatNumber(0.5, { decimals: 0 })).toBe('1');
    expect(formatNumber(-0.5, { decimals: 0 })).toBe('-1');
    expect(formatNumber(2.5, { decimals: 0 })).toBe('3');
    expect(formatNumber(-2.5, { decimals: 0 })).toBe('-3');
  });

  it('rounds the binary-representation cases the way a person expects', () => {
    // (1.005).toFixed(2) is '1.00' on every engine, because 1.005 is really
    // 1.00499999999999989 in binary. An invoice total must not lose a piastre
    // to that.
    expect((1.005).toFixed(2)).toBe('1.00');
    expect(formatNumber(1.005, { decimals: 2 })).toBe('1.01');
    expect(formatNumber(8.575, { decimals: 2 })).toBe('8.58');
    expect(formatNumber(1.015, { decimals: 2 })).toBe('1.02');
  });

  it('renders digits in another numeral system with the matching separators', () => {
    expect(formatNumber(1234, { numerals: 'arabic' })).toBe('١٬٢٣٤');
    expect(formatNumber(1234.5, { decimals: 1, numerals: 'arabic' })).toBe('١٬٢٣٤٫٥');
    expect(formatNumber(1234, { numerals: 'persian' })).toBe('۱٬۲۳۴');
  });

  it('lets separators be overridden', () => {
    expect(
      formatNumber(1234.5, { decimals: 1, groupSeparator: '.', decimalSeparator: ',' }),
    ).toBe('1.234,5');
  });

  it('passes non-finite values through rather than printing nonsense', () => {
    expect(formatNumber(Number.NaN)).toBe('NaN');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });

  it('treats negative zero as negative, consistently', () => {
    expect(formatNumber(-0.4, { decimals: 0 })).toBe('-0');
  });
});

describe('formatCurrency — the deterministic snapshot', () => {
  // These are exact strings. They must be identical on Node, in a browser, and
  // on Hermes — which is the entire reason Harf does not use Intl for money.
  it.each([
    [1250.5, 'EGP', {}, '1,250.50 ج.م.'],
    [1250.5, 'SAR', {}, '1,250.50 ر.س'],
    [1250.5, 'AED', {}, '1,250.50 د.إ'],
    [1250.5, 'QAR', {}, '1,250.50 ر.ق'],
    [19.5, 'KWD', {}, '19.500 د.ك'],
    [0, 'EGP', {}, '0.00 ج.م.'],
    [-42, 'SAR', {}, '-42.00 ر.س'],
    [1250.5, 'EGP', { locale: 'en' }, 'E£1,250.50'],
    [1250.5, 'EGP', { display: 'code' as const }, '1,250.50 EGP'],
    [1250.5, 'EGP', { display: 'none' as const }, '1,250.50'],
    [1250.5, 'EGP', { numerals: 'arabic' as const }, '١٬٢٥٠٫٥٠ ج.م.'],
    [1250.5, 'USD', {}, '$1,250.50'],
    [-1250.5, 'USD', {}, '-$1,250.50'],
  ])('formats %s %s as %s', (value, currency, options, expected) => {
    expect(formatCurrency(value as number, currency as string, options)).toBe(expected);
  });

  it('uses three decimals for every three-decimal currency', () => {
    // KWD, BHD, OMR, JOD, TND and IQD. Treating these as two decimals is a
    // thousand-fold error, and it reaches production regularly.
    for (const code of ['KWD', 'BHD', 'OMR', 'JOD', 'TND', 'IQD']) {
      expect(currencyDisplay(code).decimals).toBe(3);
      expect(formatCurrency(1, code)).toMatch(/^1\.000 /);
    }
  });

  it('uses two decimals for the two-decimal currencies', () => {
    for (const code of ['EGP', 'SAR', 'AED', 'QAR', 'MAD', 'LBP', 'USD', 'EUR', 'GBP']) {
      expect(currencyDisplay(code).decimals).toBe(2);
    }
  });

  it('lets the decimal count be overridden', () => {
    expect(formatCurrency(19.5, 'KWD', { decimals: 2 })).toBe('19.50 د.ك');
  });

  it('never uses parentheses for a negative amount', () => {
    // Parentheses mirror under RTL, so a bracketed negative becomes ambiguous.
    for (const code of Object.keys(CURRENCIES)) {
      const formatted = formatCurrency(-1, code);
      expect(formatted).not.toContain('(');
      expect(formatted).not.toContain(')');
      expect(formatted).toContain('-');
    }
  });

  it('keeps the minus sign outermost for a leading-symbol currency', () => {
    expect(formatCurrency(-5, 'USD')).toBe('-$5.00');
    expect(formatCurrency(-5, 'EUR')).toBe('-€5.00');
    expect(formatCurrency(-5, 'EGP', { locale: 'en' })).toBe('-E£5.00');
  });

  it('places a Latin symbol by its shape: a glyph hugs, an abbreviation stands apart', () => {
    // 'SR1,250.50' reads badly and no style guide writes it that way, while
    // 'E£ 1,250.50' looks like a typo. The rule is the symbol's shape, not the
    // currency.
    expect(formatCurrency(1250.5, 'EGP', { locale: 'en' })).toBe('E£1,250.50');
    expect(formatCurrency(1250.5, 'USD', { locale: 'en' })).toBe('$1,250.50');
    expect(formatCurrency(1250.5, 'SAR', { locale: 'en' })).toBe('1,250.50 SR');
    expect(formatCurrency(1250.5, 'AED', { locale: 'en' })).toBe('1,250.50 AED');
    expect(formatCurrency(19.5, 'KWD', { locale: 'en' })).toBe('19.500 KD');
  });

  it('always puts the symbol after the amount in Arabic for the regional currencies', () => {
    for (const code of ['EGP', 'SAR', 'AED', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD']) {
      const formatted = formatCurrency(1, code, { locale: 'ar-EG' });
      expect(formatted.startsWith('1')).toBe(true);
    }
  });

  it('falls back to the ISO code for an unknown currency', () => {
    expect(formatCurrency(10, 'XYZ')).toBe('10.00 XYZ');
    expect(currencyDisplay('xyz').code).toBe('XYZ');
  });

  it('accepts a lowercase currency code', () => {
    expect(formatCurrency(10, 'egp')).toBe(formatCurrency(10, 'EGP'));
  });

  it('lets the symbol be overridden, for a newly issued glyph', () => {
    expect(formatCurrency(10, 'SAR', { symbol: 'X' })).toBe('10.00 X');
  });

  it('produces the same string on every call', () => {
    const once = formatCurrency(1250.5, 'EGP');
    for (let i = 0; i < 100; i += 1) {
      expect(formatCurrency(1250.5, 'EGP')).toBe(once);
    }
  });
});

describe('formatCurrency vs Intl', () => {
  it('documents that they differ, rather than pretending they agree', () => {
    const harf = formatCurrency(1250.5, 'EGP');
    const intl = intlCurrencyReference(1250.5, 'EGP', 'ar-EG');

    expect(harf).toBe('1,250.50 ج.م.');
    // Intl may or may not exist, and its output is engine-dependent — which is
    // precisely why Harf does not use it. We assert only that we looked.
    if (intl !== null) {
      expect(typeof intl).toBe('string');
    }
  });

  it('returns null from the reference helper rather than throwing', () => {
    expect(() => intlCurrencyReference(1, 'NOT_A_CODE')).not.toThrow();
    expect(intlCurrencyReference(1, 'NOT_A_CODE')).toBeNull();
  });
});

describe('currency data integrity', () => {
  it('gives every currency a symbol, a code, and a sane decimal count', () => {
    for (const [code, info] of Object.entries(CURRENCIES)) {
      expect(info.code).toBe(code);
      expect(info.symbol.length).toBeGreaterThan(0);
      expect(info.latinSymbol.length).toBeGreaterThan(0);
      expect([0, 2, 3]).toContain(info.decimals);
      expect(['before', 'after']).toContain(info.position);
    }
  });
});

describe('getIntlCapabilities', () => {
  it('reports something for every capability', () => {
    const capabilities = getIntlCapabilities();
    for (const value of Object.values(capabilities)) {
      expect(typeof value).toBe('boolean');
    }
  });

  it('caches its answer', () => {
    expect(getIntlCapabilities()).toBe(getIntlCapabilities());
  });

  it('lists the missing features, if any', () => {
    const missing = missingIntlFeatures(getIntlCapabilities());
    expect(Array.isArray(missing)).toBe(true);
    for (const key of missing) {
      expect(getIntlCapabilities()[key]).toBe(false);
    }
  });

  it('does not claim a Hijri calendar just because Intl did not throw', () => {
    // Intl silently falls back to Gregorian for an unknown calendar, so
    // "it did not throw" is not evidence. If we claim umalqura support, the
    // formatted output must genuinely differ from the Gregorian one.
    const capabilities = getIntlCapabilities();
    if (capabilities.hasUmalquraCalendar) {
      const date = new Date('2026-09-08T00:00:00Z');
      expect(formatHijriDate(date)).not.toBe(formatDate(date));
    }
  });
});

describe('formatDate', () => {
  const date = new Date('2026-09-08T00:00:00Z');

  it('formats without throwing on any engine', () => {
    expect(() => formatDate(date)).not.toThrow();
    expect(typeof formatDate(date)).toBe('string');
    expect(formatDate(date).length).toBeGreaterThan(0);
  });

  it('forces digits into a numeral system when asked', () => {
    const western = formatDate(date, { locale: 'ar-EG', numerals: 'western' });
    expect(western).not.toMatch(/[٠-٩۰-۹]/);

    const arabic = formatDate(date, { locale: 'ar-EG', numerals: 'arabic' });
    expect(arabic).not.toMatch(/[0-9]/);
  });

  it('accepts explicit field options', () => {
    const formatted = formatDate(date, {
      locale: 'en-GB',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });
    expect(formatted).toContain('2026');
  });

  it('falls back to an ISO date rather than throwing on a bad locale', () => {
    expect(() => formatDate(date, { locale: 'not a locale!!' })).not.toThrow();
  });
});

describe('formatHijriDate', () => {
  const date = new Date('2026-09-08T00:00:00Z');

  it('returns null rather than a silently-Gregorian string when unsupported', () => {
    const result = formatHijriDate(date);
    if (getIntlCapabilities().hasUmalquraCalendar) {
      expect(typeof result).toBe('string');
    } else {
      expect(result).toBeNull();
    }
  });

  it('defaults to islamic-umalqura, not plain islamic', () => {
    if (!getIntlCapabilities().hasUmalquraCalendar) return;
    const parts = toHijriParts(date);
    expect(parts).not.toBeNull();
    // 8 September 2026 falls in Rabiʿ al-Awwal 1448 on the Umm al-Qura civil
    // calendar. The year is the assertion that matters — a plain Gregorian
    // fallback would report 2026.
    expect(parts?.year).toBe(1448);
    expect(parts?.month).toBeGreaterThanOrEqual(1);
    expect(parts?.month).toBeLessThanOrEqual(12);
    expect(parts?.day).toBeGreaterThanOrEqual(1);
    expect(parts?.day).toBeLessThanOrEqual(30);
  });

  it('can be asked for a different Hijri variant', () => {
    if (!getIntlCapabilities().hasUmalquraCalendar) return;
    expect(() => formatHijriDate(date, { calendar: 'islamic-civil' })).not.toThrow();
  });

  it('never throws', () => {
    expect(() => formatHijriDate(date, { locale: 'nonsense!!' })).not.toThrow();
  });
});

describe('regression: rounding large and awkward values', () => {
  it('does not corrupt a large number', () => {
    // The previous implementation nudged by an epsilon proportional to the
    // scaled magnitude, which for 1e15 at three decimals added an absolute
    // error of several hundred.
    expect(formatNumber(1e15, { decimals: 3, grouping: false })).toBe(
      '1000000000000000.000',
    );
    expect(formatNumber(123456789.123456, { decimals: 2, grouping: false })).toBe(
      '123456789.12',
    );
  });

  it('still rounds the binary-representation cases correctly', () => {
    expect(formatNumber(1.005, { decimals: 2 })).toBe('1.01');
    expect(formatNumber(8.575, { decimals: 2 })).toBe('8.58');
    expect(formatNumber(2.675, { decimals: 2 })).toBe('2.68');
    expect(formatNumber(999.995, { decimals: 2 })).toBe('1,000.00');
  });

  it('stays symmetric about zero at every scale', () => {
    for (const value of [0.5, 2.5, 1.005, 1e15, 123456789.123456]) {
      for (const decimals of [0, 2, 3]) {
        expect(formatNumber(-value, { decimals })).toBe(
          `-${formatNumber(value, { decimals })}`,
        );
      }
    }
  });

  it('handles a very small value without producing exponent notation', () => {
    expect(formatNumber(1e-7, { decimals: 2 })).toBe('0.00');
    expect(formatNumber(1e-7, { decimals: 0 })).toBe('0');
  });
});
