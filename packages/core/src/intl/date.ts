/**
 * Date formatting, Gregorian and Hijri.
 *
 * @module
 */

import { convertDigits, type NumeralSystem } from '../numerals';
import { getIntlCapabilities } from './capabilities';

/**
 * The Hijri calendar variant to format with.
 *
 * `islamic-umalqura` is the civil calendar Saudi Arabia publishes and Egypt,
 * the Gulf states and most Arabic software follow. Plain `islamic` is an
 * astronomical approximation and routinely disagrees with it by a day, which
 * is exactly the kind of difference a user notices on a receipt.
 */
export type HijriCalendar =
  'islamic-umalqura' | 'islamic-civil' | 'islamic-tbla' | 'islamic';

/** Options for {@link formatDate} and {@link formatHijriDate}. */
export interface FormatDateOptions {
  /** BCP-47 locale. @defaultValue `'ar-EG'` */
  readonly locale?: string;
  /** Passed straight through to `Intl.DateTimeFormat`. */
  readonly dateStyle?: 'full' | 'long' | 'medium' | 'short';
  /** Individual field options, when `dateStyle` is not enough. */
  readonly day?: 'numeric' | '2-digit';
  readonly month?: 'numeric' | '2-digit' | 'long' | 'short' | 'narrow';
  readonly year?: 'numeric' | '2-digit';
  readonly weekday?: 'long' | 'short' | 'narrow';
  readonly timeZone?: string;
  /**
   * Force the digits into a numeral system after formatting.
   *
   * Left unset, the engine's own choice for the locale is kept. Set it to
   * `'western'` for `ar-EG`, where Western digits are the norm but some
   * engines still emit Arabic-Indic ones.
   */
  readonly numerals?: NumeralSystem;
}

const DEFAULT_LOCALE = 'ar-EG';

function buildOptions(options: FormatDateOptions): Intl.DateTimeFormatOptions {
  const out: Intl.DateTimeFormatOptions = {};
  if (options.dateStyle !== undefined) out.dateStyle = options.dateStyle;
  if (options.day !== undefined) out.day = options.day;
  if (options.month !== undefined) out.month = options.month;
  if (options.year !== undefined) out.year = options.year;
  if (options.weekday !== undefined) out.weekday = options.weekday;
  if (options.timeZone !== undefined) out.timeZone = options.timeZone;
  if (out.dateStyle === undefined && Object.keys(out).length === 0) {
    out.day = 'numeric';
    out.month = 'long';
    out.year = 'numeric';
  }
  return out;
}

/**
 * Formats a Gregorian date.
 *
 * @example
 * ```ts
 * import { formatDate } from '@harf/core';
 *
 * formatDate(new Date('2026-09-08'));
 * // '٨ سبتمبر ٢٠٢٦' or '8 سبتمبر 2026' depending on the engine
 *
 * formatDate(new Date('2026-09-08'), { numerals: 'western' });
 * // '8 سبتمبر 2026' — deterministic digits
 * ```
 *
 * @throws Never. On an engine with no usable `Intl.DateTimeFormat` it falls
 *   back to an ISO date, which is unambiguous rather than wrong.
 */
export function formatDate(date: Date, options: FormatDateOptions = {}): string {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const capabilities = getIntlCapabilities();

  if (!capabilities.hasDateTimeFormat) return isoFallback(date);

  let formatted: string;
  try {
    formatted = new Intl.DateTimeFormat(locale, buildOptions(options)).format(date);
  } catch {
    return isoFallback(date);
  }

  return options.numerals === undefined
    ? formatted
    : convertDigits(formatted, options.numerals);
}

/** Options for {@link formatHijriDate}. */
export interface FormatHijriOptions extends FormatDateOptions {
  /** @defaultValue `'islamic-umalqura'` */
  readonly calendar?: HijriCalendar;
}

/**
 * Formats a date in the Hijri calendar.
 *
 * Defaults to `islamic-umalqura`, the civil calendar Egypt and Saudi Arabia
 * actually use — not plain `islamic`, which is an astronomical approximation
 * and often a day out.
 *
 * @returns The formatted date, or `null` when this engine has no Hijri
 *   calendar data. Returning `null` rather than a silently-Gregorian string is
 *   deliberate: `Intl` falls back to Gregorian without throwing, so a naive
 *   wrapper prints a Gregorian date under a Hijri label.
 *
 * @example
 * ```ts
 * import { formatHijriDate } from '@harf/core';
 *
 * const hijri = formatHijriDate(new Date('2026-09-08'));
 * if (hijri === null) {
 *   // This engine has no umalqura data — show the Gregorian date instead.
 * }
 * ```
 *
 * @example Both calendars together, the way most Egyptian apps show them
 * ```ts
 * import { formatDate, formatHijriDate } from '@harf/core';
 *
 * const date = new Date('2026-09-08');
 * const both = [formatDate(date), formatHijriDate(date)]
 *   .filter((part) => part !== null)
 *   .join(' — ');
 * ```
 */
export function formatHijriDate(
  date: Date,
  options: FormatHijriOptions = {},
): string | null {
  const capabilities = getIntlCapabilities();
  if (!capabilities.hasUmalquraCalendar) return null;

  const calendar = options.calendar ?? 'islamic-umalqura';
  const locale = options.locale ?? DEFAULT_LOCALE;
  const tagged = locale.includes('-u-') ? locale : `${locale}-u-ca-${calendar}`;

  try {
    const formatted = new Intl.DateTimeFormat(tagged, buildOptions(options)).format(date);
    return options.numerals === undefined
      ? formatted
      : convertDigits(formatted, options.numerals);
  } catch {
    /* c8 ignore next 2 */
    return null;
  }
}

/**
 * The Hijri year, month and day as numbers, for your own formatting.
 *
 * @returns `null` when this engine has no Hijri calendar data.
 *
 * @example
 * ```ts
 * import { toHijriParts } from '@harf/core';
 *
 * const parts = toHijriParts(new Date('2026-09-08'));
 * // { year: 1448, month: 3, day: 16 } — or null on a stock Hermes build
 * ```
 */
export function toHijriParts(
  date: Date,
  calendar: HijriCalendar = 'islamic-umalqura',
): { readonly year: number; readonly month: number; readonly day: number } | null {
  if (!getIntlCapabilities().hasUmalquraCalendar) return null;

  try {
    const parts = new Intl.DateTimeFormat(`en-u-ca-${calendar}`, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      numberingSystem: 'latn',
    }).formatToParts(date);

    const read = (type: string): number => {
      const found = parts.find((part) => part.type === type);
      return found === undefined ? Number.NaN : Number.parseInt(found.value, 10);
    };

    const year = read('year');
    const month = read('month');
    const day = read('day');
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return null;
    }
    return { year, month, day };
  } catch {
    /* c8 ignore next 2 */
    return null;
  }
}

function isoFallback(date: Date): string {
  const iso = date.toISOString();
  return iso.slice(0, 10);
}
