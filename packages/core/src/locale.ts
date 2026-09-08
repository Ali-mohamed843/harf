/**
 * Locale → direction resolution, with no dependency on `Intl`.
 *
 * `Intl.Locale.prototype.getTextInfo()` exists on modern browsers but not on
 * Hermes, and older engines expose it as `textInfo`. Harf resolves direction
 * from BCP-47 subtags directly so the answer is identical on every engine.
 *
 * @module
 */

import type { Direction } from './direction';

/**
 * ISO 15924 script codes written right-to-left.
 *
 * Checked before the language subtag, so `az-Arab` resolves RTL and
 * `ku-Latn` resolves LTR.
 */
const RTL_SCRIPTS: ReadonlySet<string> = new Set([
  'adlm', // Adlam
  'arab', // Arabic
  'aran', // Nastaliq
  'armi', // Imperial Aramaic
  'avst', // Avestan
  'chrs', // Chorasmian
  'cprt', // Cypriot
  'egyp', // Egyptian hieroglyphs (RTL variant)
  'elym', // Elymaic
  'hatr', // Hatran
  'hebr', // Hebrew
  'hung', // Old Hungarian
  'khar', // Kharoshthi
  'lydi', // Lydian
  'mand', // Mandaic
  'mani', // Manichaean
  'merc', // Meroitic Cursive
  'mero', // Meroitic Hieroglyphs
  'narb', // Old North Arabian
  'nbat', // Nabataean
  'nkoo', // NKo
  'orkh', // Old Turkic
  'ougr', // Old Uyghur
  'palm', // Palmyrene
  'phli', // Inscriptional Pahlavi
  'phlp', // Psalter Pahlavi
  'phnx', // Phoenician
  'prti', // Inscriptional Parthian
  'rohg', // Hanifi Rohingya
  'samr', // Samaritan
  'sarb', // Old South Arabian
  'sogd', // Sogdian
  'sogo', // Old Sogdian
  'syrc', // Syriac
  'thaa', // Thaana
  'yezi', // Yezidi
]);

/**
 * Language subtags whose default script is right-to-left.
 *
 * A language written in more than one script (Kurdish, Azerbaijani, Punjabi)
 * is deliberately absent — pass an explicit script subtag for those, or the
 * result is LTR.
 */
const RTL_LANGUAGES: ReadonlySet<string> = new Set([
  'ae', // Avestan
  'ar', // Arabic
  'arc', // Aramaic
  'bcc', // Southern Balochi
  'bqi', // Bakhtiari
  'ckb', // Central Kurdish (Sorani)
  'dv', // Dhivehi
  'fa', // Persian
  'glk', // Gilaki
  'he', // Hebrew
  'iw', // Hebrew (deprecated code, still emitted by older Android)
  'khw', // Khowar
  'ks', // Kashmiri
  'ku', // Kurdish — Sorani default; pass ku-Latn for Kurmanji
  'mzn', // Mazanderani
  'nqo', // NKo
  'pnb', // Western Punjabi (Shahmukhi)
  'ps', // Pashto
  'prs', // Dari
  'sd', // Sindhi
  'syr', // Syriac
  'ug', // Uyghur
  'ur', // Urdu
  'yi', // Yiddish
  'ji', // Yiddish (deprecated code)
]);

/**
 * Resolves the writing direction for a BCP-47 locale tag.
 *
 * The script subtag wins when present, so a language written in more than one
 * script resolves correctly without a special case.
 *
 * @param locale - A BCP-47 tag such as `'ar-EG'`, `'ku-Latn-TR'` or `'he'`.
 *   Case-insensitive. An empty or unparseable value resolves to `'ltr'`.
 * @returns The direction for that locale.
 *
 * @example
 * ```ts
 * import { directionForLocale } from '@harf/core';
 *
 * directionForLocale('ar-EG');     // 'rtl'
 * directionForLocale('he');        // 'rtl'
 * directionForLocale('ku-Latn');   // 'ltr' — script subtag wins
 * directionForLocale('az-Arab-IR');// 'rtl'
 * directionForLocale('en-US');     // 'ltr'
 * ```
 */
export function directionForLocale(locale: string): Direction {
  if (typeof locale !== 'string' || locale.length === 0) return 'ltr';

  const subtags = locale.toLowerCase().split(/[-_]/);
  const language = subtags[0];
  if (language === undefined || language.length === 0) return 'ltr';

  // A 4-letter subtag in position 2 or 3 is an ISO 15924 script code.
  for (let i = 1; i < subtags.length && i <= 2; i += 1) {
    const subtag = subtags[i];
    if (subtag !== undefined && subtag.length === 4 && /^[a-z]{4}$/.test(subtag)) {
      return RTL_SCRIPTS.has(subtag) ? 'rtl' : 'ltr';
    }
  }

  return RTL_LANGUAGES.has(language) ? 'rtl' : 'ltr';
}

/**
 * `true` when {@link directionForLocale} resolves the locale to `'rtl'`.
 *
 * @example
 * ```ts
 * import { isRtlLocale } from '@harf/core';
 *
 * isRtlLocale('ar');    // true
 * isRtlLocale('en-GB'); // false
 * ```
 */
export function isRtlLocale(locale: string): boolean {
  return directionForLocale(locale) === 'rtl';
}
