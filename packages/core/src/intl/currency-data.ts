/**
 * Currency presentation data.
 *
 * `Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })` produces
 * different output across JavaScript engines and operating system versions —
 * different symbols, different symbol placement, different amounts of
 * whitespace, and different handling of the minus sign. That is fine for a
 * one-off label and unacceptable for a price the user compares across screens,
 * or a figure in a snapshot test.
 *
 * This table is what Harf formats against instead. It is small, explicit, and
 * identical on every engine.
 *
 * @module
 */

/** How a currency is presented in a given language. */
export interface CurrencyDisplay {
  /** The native-script symbol, e.g. `ج.م.` for the Egyptian pound. */
  readonly symbol: string;
  /** The ISO 4217 code, used when `display: 'code'` is requested. */
  readonly code: string;
  /**
   * Digits after the decimal separator.
   *
   * Three for the Kuwaiti, Bahraini, Omani and Jordanian currencies — a
   * frequent source of rounding bugs in apps that assume two everywhere.
   */
  readonly decimals: number;
  /** Where the symbol sits relative to the number, in Arabic. */
  readonly position: 'before' | 'after';
  /** The English/Latin symbol, used for `en` and other LTR locales. */
  readonly latinSymbol: string;
}

/**
 * The currencies Harf ships presentation data for.
 *
 * Everything else falls back to the ISO code with two decimals, which is
 * unambiguous rather than wrong.
 */
export const CURRENCIES: Readonly<Record<string, CurrencyDisplay>> = Object.freeze({
  EGP: {
    symbol: 'ج.م.',
    code: 'EGP',
    decimals: 2,
    position: 'after',
    latinSymbol: 'E£',
  },
  SAR: {
    // Saudi Arabia introduced a new riyal glyph in 2025. Font support for it
    // is still uneven, so Harf ships the letter form, which renders
    // everywhere. Override it in `formatCurrency` if your fonts carry the new
    // symbol.
    symbol: 'ر.س',
    code: 'SAR',
    decimals: 2,
    position: 'after',
    latinSymbol: 'SR',
  },
  AED: {
    symbol: 'د.إ',
    code: 'AED',
    decimals: 2,
    position: 'after',
    latinSymbol: 'AED',
  },
  QAR: {
    symbol: 'ر.ق',
    code: 'QAR',
    decimals: 2,
    position: 'after',
    latinSymbol: 'QR',
  },
  KWD: {
    symbol: 'د.ك',
    code: 'KWD',
    decimals: 3,
    position: 'after',
    latinSymbol: 'KD',
  },
  BHD: {
    symbol: 'د.ب',
    code: 'BHD',
    decimals: 3,
    position: 'after',
    latinSymbol: 'BD',
  },
  OMR: {
    symbol: 'ر.ع.',
    code: 'OMR',
    decimals: 3,
    position: 'after',
    latinSymbol: 'OMR',
  },
  JOD: {
    symbol: 'د.ا',
    code: 'JOD',
    decimals: 3,
    position: 'after',
    latinSymbol: 'JD',
  },
  MAD: {
    symbol: 'د.م.',
    code: 'MAD',
    decimals: 2,
    position: 'after',
    latinSymbol: 'MAD',
  },
  TND: {
    symbol: 'د.ت',
    code: 'TND',
    decimals: 3,
    position: 'after',
    latinSymbol: 'DT',
  },
  IQD: {
    symbol: 'د.ع',
    code: 'IQD',
    decimals: 3,
    position: 'after',
    latinSymbol: 'IQD',
  },
  LBP: {
    symbol: 'ل.ل',
    code: 'LBP',
    decimals: 2,
    position: 'after',
    latinSymbol: 'LL',
  },
  USD: {
    symbol: '$',
    code: 'USD',
    decimals: 2,
    position: 'before',
    latinSymbol: '$',
  },
  EUR: {
    symbol: '€',
    code: 'EUR',
    decimals: 2,
    position: 'before',
    latinSymbol: '€',
  },
  GBP: {
    symbol: '£',
    code: 'GBP',
    decimals: 2,
    position: 'before',
    latinSymbol: '£',
  },
});

/** The fallback for a currency Harf has no presentation data for. */
export const DEFAULT_CURRENCY_DISPLAY: CurrencyDisplay = Object.freeze({
  symbol: '',
  code: '',
  decimals: 2,
  position: 'after',
  latinSymbol: '',
});

/**
 * Looks up presentation data for an ISO 4217 code.
 *
 * An unknown code returns a record whose `symbol` and `code` are the code
 * itself, with two decimals — unambiguous rather than wrong.
 *
 * @example
 * ```ts
 * import { currencyDisplay } from '@harf/core';
 *
 * currencyDisplay('KWD').decimals; // 3 — the classic off-by-a-thousand bug
 * currencyDisplay('XYZ').code;     // 'XYZ'
 * ```
 */
export function currencyDisplay(currency: string): CurrencyDisplay {
  const upper = currency.toUpperCase();
  const known = CURRENCIES[upper];
  if (known !== undefined) return known;
  return { ...DEFAULT_CURRENCY_DISPLAY, symbol: upper, code: upper, latinSymbol: upper };
}
