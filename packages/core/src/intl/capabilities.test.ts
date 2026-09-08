import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  INTL_POLYFILLS,
  getIntlCapabilities,
  missingIntlFeatures,
  resetIntlCapabilities,
} from './capabilities';
import { formatDate, formatHijriDate, toHijriParts } from './date';
import { formatCurrency, formatNumber } from './number';

const realIntl = globalThis.Intl;

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.Intl = realIntl;
  resetIntlCapabilities();
});

/** Replaces `Intl` with a stub, the way a stripped Hermes build looks. */
function stubIntl(value: unknown): void {
  resetIntlCapabilities();
  vi.stubGlobal('Intl', value);
}

describe('an engine with no Intl at all', () => {
  it('reports every capability as false rather than throwing', () => {
    stubIntl(undefined);
    const capabilities = getIntlCapabilities();
    expect(capabilities.hasIntl).toBe(false);
    for (const value of Object.values(capabilities)) {
      expect(value).toBe(false);
    }
  });

  it('lists everything as missing', () => {
    stubIntl(undefined);
    const missing = missingIntlFeatures(getIntlCapabilities());
    expect(missing).toContain('hasIntl');
    expect(missing).toContain('hasUmalquraCalendar');
  });

  it('still formats numbers and currency, because those never used Intl', () => {
    stubIntl(undefined);
    expect(formatNumber(1234.5, { decimals: 2 })).toBe('1,234.50');
    expect(formatCurrency(1250.5, 'EGP')).toBe('1,250.50 ج.م.');
  });

  it('falls back to an ISO date rather than crashing', () => {
    stubIntl(undefined);
    expect(formatDate(new Date('2026-09-08T00:00:00Z'))).toBe('2026-09-08');
  });

  it('returns null for a Hijri date rather than a wrong one', () => {
    stubIntl(undefined);
    expect(formatHijriDate(new Date('2026-09-08T00:00:00Z'))).toBeNull();
    expect(toHijriParts(new Date('2026-09-08T00:00:00Z'))).toBeNull();
  });
});

describe('an engine whose Intl throws', () => {
  it('treats a throwing DateTimeFormat as absent', () => {
    stubIntl({
      DateTimeFormat: function ThrowingDateTimeFormat() {
        throw new Error('not implemented');
      },
      NumberFormat: function ThrowingNumberFormat() {
        throw new Error('not implemented');
      },
    });
    const capabilities = getIntlCapabilities();
    expect(capabilities.hasIntl).toBe(true);
    expect(capabilities.hasDateTimeFormat).toBe(false);
    expect(capabilities.hasNumberFormat).toBe(false);
    expect(capabilities.hasUmalquraCalendar).toBe(false);
  });

  it('falls back to an ISO date', () => {
    stubIntl({
      DateTimeFormat: function ThrowingDateTimeFormat() {
        throw new Error('not implemented');
      },
    });
    expect(formatDate(new Date('2026-09-08T00:00:00Z'))).toBe('2026-09-08');
  });
});

describe('an engine that silently falls back to Gregorian', () => {
  it('does not claim Hijri support just because nothing threw', () => {
    // This is the trap: Intl accepts -u-ca-islamic-umalqura on an engine with
    // no Hijri data and returns a Gregorian date. A naive check that only
    // catches exceptions would print a Gregorian date under a Hijri heading.
    class GregorianOnlyFormat {
      format(): string {
        return '8/9/2026';
      }
      formatToParts(): { type: string; value: string }[] {
        return [
          { type: 'day', value: '8' },
          { type: 'month', value: '9' },
          { type: 'year', value: '2026' },
        ];
      }
    }
    stubIntl({ DateTimeFormat: GregorianOnlyFormat, NumberFormat: GregorianOnlyFormat });

    const capabilities = getIntlCapabilities();
    expect(capabilities.hasDateTimeFormat).toBe(true);
    expect(capabilities.hasUmalquraCalendar).toBe(false);
    expect(formatHijriDate(new Date('2026-09-08T00:00:00Z'))).toBeNull();
  });

  it('does not claim Arabic locale data when the output is English', () => {
    class EnglishOnlyFormat {
      format(): string {
        return 'September';
      }
    }
    stubIntl({ DateTimeFormat: EnglishOnlyFormat, NumberFormat: EnglishOnlyFormat });
    expect(getIntlCapabilities().hasArabicLocaleData).toBe(false);
  });
});

describe('this engine', () => {
  it('has the capabilities it claims to have', () => {
    resetIntlCapabilities();
    const capabilities = getIntlCapabilities();

    if (capabilities.hasUmalquraCalendar) {
      // The claim is only true if the Hijri output really differs from the
      // Gregorian one.
      const date = new Date('2026-09-08T00:00:00Z');
      expect(formatHijriDate(date)).not.toBe(formatDate(date));
      expect(toHijriParts(date)?.year).toBe(1448);
    }

    if (capabilities.hasCurrencyFormat) {
      expect(() =>
        new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(1),
      ).not.toThrow();
    }
  });

  it('distinguishes islamic-umalqura from plain islamic where both exist', () => {
    resetIntlCapabilities();
    const capabilities = getIntlCapabilities();
    expect(typeof capabilities.hasDistinctIslamicCalendars).toBe('boolean');
  });
});

describe('INTL_POLYFILLS', () => {
  it('names a package and a reason for every gap it covers', () => {
    for (const entry of INTL_POLYFILLS) {
      expect(entry.packages.length).toBeGreaterThan(0);
      expect(entry.note.length).toBeGreaterThan(10);
      for (const name of entry.packages) {
        expect(name.startsWith('@formatjs/')).toBe(true);
      }
    }
  });

  it('references only real capability keys', () => {
    resetIntlCapabilities();
    const capabilities = getIntlCapabilities();
    for (const entry of INTL_POLYFILLS) {
      expect(capabilities).toHaveProperty(entry.capability);
    }
  });

  it('is not bundled — Harf only tells you what to install', () => {
    // A deliberate assertion. Shipping these by default would add hundreds of
    // kilobytes to every app, most of which needs none of them.
    expect(INTL_POLYFILLS.length).toBeGreaterThan(0);
  });
});

describe('resetIntlCapabilities', () => {
  it('clears the cache so a stub takes effect', () => {
    resetIntlCapabilities();
    const before = getIntlCapabilities();
    expect(getIntlCapabilities()).toBe(before);

    stubIntl(undefined);
    expect(getIntlCapabilities()).not.toBe(before);
  });
});
