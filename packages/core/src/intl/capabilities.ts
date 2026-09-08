/**
 * Runtime detection of what this JavaScript engine's `Intl` can actually do.
 *
 * React Native's Hermes ships a reduced `Intl`. What exactly is present varies
 * by React Native version, by platform, and by whether the app was built with
 * `intl` enabled — so the only reliable answer is to ask the engine at
 * runtime rather than to branch on `Platform.OS`.
 *
 * @module
 */

/** What the current engine supports. */
export interface IntlCapabilities {
  /** `Intl` exists at all. */
  readonly hasIntl: boolean;
  /** `Intl.DateTimeFormat` exists and formats a date without throwing. */
  readonly hasDateTimeFormat: boolean;
  /** `Intl.NumberFormat` exists and formats a number without throwing. */
  readonly hasNumberFormat: boolean;
  /** `Intl.NumberFormat` can format a currency. */
  readonly hasCurrencyFormat: boolean;
  /** `Intl.RelativeTimeFormat` exists. */
  readonly hasRelativeTimeFormat: boolean;
  /** `Intl.PluralRules` exists — needed for correct Arabic plurals. */
  readonly hasPluralRules: boolean;
  /** `Intl.ListFormat` exists. */
  readonly hasListFormat: boolean;
  /**
   * The engine has real Arabic locale data, rather than falling back to
   * English for an `ar` request.
   */
  readonly hasArabicLocaleData: boolean;
  /**
   * `Intl.DateTimeFormat` can format the `islamic-umalqura` calendar — the
   * civil Hijri calendar Egypt and Saudi Arabia actually use.
   */
  readonly hasUmalquraCalendar: boolean;
  /** The engine reports Hijri dates that differ from plain `islamic`. */
  readonly hasDistinctIslamicCalendars: boolean;
}

const PROBE_DATE = new Date(Date.UTC(2026, 8, 8));

function probe(fn: () => unknown): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

let cached: IntlCapabilities | null = null;

/**
 * Inspects the current engine and reports what its `Intl` can do.
 *
 * The result is computed once and cached, so this is cheap to call from a
 * render path or a startup check.
 *
 * @example
 * ```ts
 * import { getIntlCapabilities } from '@harf/core';
 *
 * const intl = getIntlCapabilities();
 * if (!intl.hasUmalquraCalendar) {
 *   // Fall back to a Gregorian date, or load the polyfill.
 * }
 * ```
 *
 * @example Guarding a feature at startup
 * ```ts
 * import { getIntlCapabilities, missingIntlFeatures } from '@harf/core';
 *
 * const missing = missingIntlFeatures(getIntlCapabilities());
 * if (missing.length > 0 && __DEV__) {
 *   console.warn('Harf: this engine is missing', missing.join(', '));
 * }
 * ```
 */
export function getIntlCapabilities(): IntlCapabilities {
  if (cached !== null) return cached;

  const hasIntl = typeof Intl !== 'undefined';
  if (!hasIntl) {
    cached = {
      hasIntl: false,
      hasDateTimeFormat: false,
      hasNumberFormat: false,
      hasCurrencyFormat: false,
      hasRelativeTimeFormat: false,
      hasPluralRules: false,
      hasListFormat: false,
      hasArabicLocaleData: false,
      hasUmalquraCalendar: false,
      hasDistinctIslamicCalendars: false,
    };
    return cached;
  }

  const hasDateTimeFormat =
    typeof Intl.DateTimeFormat === 'function' &&
    probe(() => new Intl.DateTimeFormat('en').format(PROBE_DATE));

  const hasNumberFormat =
    typeof Intl.NumberFormat === 'function' &&
    probe(() => new Intl.NumberFormat('en').format(1));

  const hasCurrencyFormat =
    hasNumberFormat &&
    probe(() =>
      new Intl.NumberFormat('en', { style: 'currency', currency: 'USD' }).format(1),
    );

  // Arabic locale data is present if a long Arabic month name comes back in
  // Arabic script rather than as English.
  const hasArabicLocaleData =
    hasDateTimeFormat &&
    probe(() => {
      const formatted = new Intl.DateTimeFormat('ar', { month: 'long' }).format(
        PROBE_DATE,
      );
      if (!/[؀-ۿ]/.test(formatted)) throw new Error('no arabic data');
      return formatted;
    });

  const umalqura = hasDateTimeFormat
    ? tryFormat('ar-EG-u-ca-islamic-umalqura', PROBE_DATE)
    : null;
  const islamic = hasDateTimeFormat ? tryFormat('ar-EG-u-ca-islamic', PROBE_DATE) : null;
  const gregorian = hasDateTimeFormat ? tryFormat('ar-EG', PROBE_DATE) : null;

  // A request for a calendar the engine does not have silently falls back to
  // Gregorian, so "it did not throw" is not evidence. Compare the output.
  const hasUmalquraCalendar =
    umalqura !== null && gregorian !== null && umalqura !== gregorian;

  cached = {
    hasIntl: true,
    hasDateTimeFormat,
    hasNumberFormat,
    hasCurrencyFormat,
    hasRelativeTimeFormat: typeof Intl.RelativeTimeFormat === 'function',
    hasPluralRules: typeof Intl.PluralRules === 'function',
    hasListFormat: typeof Intl.ListFormat === 'function',
    hasArabicLocaleData,
    hasUmalquraCalendar,
    hasDistinctIslamicCalendars:
      umalqura !== null && islamic !== null && umalqura !== islamic,
  };
  return cached;
}

function tryFormat(locale: string, date: Date): string | null {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return null;
  }
}

/** Clears the cached result. Exposed for tests that stub `Intl`. */
export function resetIntlCapabilities(): void {
  cached = null;
}

/**
 * The `@formatjs` polyfills needed to fill each gap, with their real install
 * size.
 *
 * Harf deliberately does **not** bundle any of these. They are large, most
 * apps need only one or two, and the cost belongs in your bundle budget where
 * you can see it.
 *
 * Sizes are the unpacked size of the npm package as published, which is what
 * `node_modules` costs you; what reaches your *app* bundle is smaller and
 * depends on how many locales you include. Measure your own build.
 */
export const INTL_POLYFILLS: readonly {
  readonly capability: keyof IntlCapabilities;
  readonly packages: readonly string[];
  readonly note: string;
}[] = Object.freeze([
  {
    capability: 'hasPluralRules',
    packages: ['@formatjs/intl-pluralrules'],
    note: 'Required by the other polyfills. Load it first.',
  },
  {
    capability: 'hasNumberFormat',
    packages: ['@formatjs/intl-numberformat'],
    note: 'Not needed for Harf itself — formatNumber and formatCurrency do their own arithmetic.',
  },
  {
    capability: 'hasDateTimeFormat',
    packages: ['@formatjs/intl-datetimeformat'],
    note: 'Also needs its /add-all-tz or a specific timezone import.',
  },
  {
    capability: 'hasUmalquraCalendar',
    packages: [
      '@formatjs/intl-datetimeformat',
      '@formatjs/intl-datetimeformat/add-all-tz',
    ],
    note: 'Import the ar locale data and the calendar data explicitly.',
  },
  {
    capability: 'hasRelativeTimeFormat',
    packages: ['@formatjs/intl-relativetimeformat'],
    note: 'Only if you render "3 days ago" style strings.',
  },
  {
    capability: 'hasListFormat',
    packages: ['@formatjs/intl-listformat'],
    note: 'Only if you join lists with a localised conjunction.',
  },
]);

/**
 * Which capabilities this engine is missing.
 *
 * @example
 * ```ts
 * import { getIntlCapabilities, missingIntlFeatures } from '@harf/core';
 *
 * missingIntlFeatures(getIntlCapabilities());
 * // [] on Node and modern browsers
 * // ['hasUmalquraCalendar', ...] on a stock Hermes build
 * ```
 */
export function missingIntlFeatures(
  capabilities: IntlCapabilities,
): readonly (keyof IntlCapabilities)[] {
  return (Object.keys(capabilities) as (keyof IntlCapabilities)[]).filter(
    (key) => capabilities[key] === false,
  );
}
