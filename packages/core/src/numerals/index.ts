/**
 * Numeral systems.
 *
 * Three digit sets appear in Arabic-script languages:
 *
 * | System | Digits | Used by |
 * | --- | --- | --- |
 * | `western` | 0123456789 | Egypt, the Maghreb, most of the Gulf in practice |
 * | `arabic` | ٠١٢٣٤٥٦٧٨٩ | Traditional Arabic typography, parts of the Levant and Gulf |
 * | `persian` | ۰۱۲۳۴۵۶۷۸۹ | Persian, Urdu, Pashto, Dari |
 *
 * **Egypt uses Western digits far more than people assume.** `ar-EG` therefore
 * defaults to `western` here. This is a configuration decision, not magic: see
 * {@link numeralSystemForLocale} and override it per locale if your product
 * says otherwise.
 *
 * @module
 */

/** A digit set. */
export type NumeralSystem = 'western' | 'arabic' | 'persian';

const ZERO: Readonly<Record<NumeralSystem, number>> = Object.freeze({
  western: 0x0030,
  arabic: 0x0660,
  persian: 0x06f0,
});

/** Matches any digit from any of the three systems. */
const ANY_DIGIT = /[0-9٠-٩۰-۹]/g;

function digitValue(code: number): number | null {
  if (code >= 0x0030 && code <= 0x0039) return code - 0x0030;
  if (code >= 0x0660 && code <= 0x0669) return code - 0x0660;
  if (code >= 0x06f0 && code <= 0x06f9) return code - 0x06f0;
  return null;
}

/**
 * Converts every digit in a string to the given numeral system.
 *
 * Digits from *any* of the three systems are converted, so this is safe to run
 * on text that already mixes them.
 *
 * @param input - Text, or a number, whose digits should be converted.
 * @param to - The target numeral system.
 * @returns The text with its digits replaced. Everything else is untouched.
 *
 * @example
 * ```ts
 * import { convertDigits } from '@harf/core';
 *
 * convertDigits('2026', 'arabic');       // '٢٠٢٦'
 * convertDigits('٢٠٢٦', 'western');      // '2026'
 * convertDigits('صفحة 3 من 10', 'persian'); // 'صفحة ۳ من ۱۰'
 * ```
 *
 * @remarks
 * **Never call this on a value a machine will parse or a human will copy.**
 * See {@link isCopySensitive} for the list of cases that matters, and the
 * `<Num literal>` prop in `@harf/react` and `@harf/native` for the safe way to
 * render one.
 */
export function convertDigits(input: string | number, to: NumeralSystem): string {
  const text = typeof input === 'number' ? String(input) : input;
  const base = ZERO[to];
  ANY_DIGIT.lastIndex = 0;
  return text.replace(ANY_DIGIT, (char) => {
    const value = digitValue(char.codePointAt(0) as number);
    /* c8 ignore next */
    if (value === null) return char;
    return String.fromCodePoint(base + value);
  });
}

/**
 * Converts digits to Arabic-Indic (٠١٢٣٤٥٦٧٨٩).
 *
 * @example
 * ```ts
 * import { toArabicDigits } from '@harf/core';
 *
 * toArabicDigits(2026);   // '٢٠٢٦'
 * toArabicDigits('12.5'); // '١٢.٥' — the decimal point is not a digit
 * ```
 */
export function toArabicDigits(input: string | number): string {
  return convertDigits(input, 'arabic');
}

/**
 * Converts digits to Extended Arabic-Indic / Persian (۰۱۲۳۴۵۶۷۸۹).
 *
 * @example
 * ```ts
 * import { toPersianDigits } from '@harf/core';
 *
 * toPersianDigits(1405); // '۱۴۰۵'
 * ```
 */
export function toPersianDigits(input: string | number): string {
  return convertDigits(input, 'persian');
}

/**
 * Converts digits to Western / ASCII (0123456789).
 *
 * This is the direction that is almost always safe, and the one to reach for
 * before parsing a user-entered value: a numeric keypad on an Arabic keyboard
 * layout can emit Arabic-Indic digits that `Number()` and `parseInt` reject.
 *
 * @example
 * ```ts
 * import { toWesternDigits } from '@harf/core';
 *
 * Number('٢٠٢٦');                   // NaN
 * Number(toWesternDigits('٢٠٢٦'));  // 2026
 * ```
 */
export function toWesternDigits(input: string | number): string {
  return convertDigits(input, 'western');
}

/**
 * The numeral system Harf uses for a locale unless told otherwise.
 *
 * The mapping is deliberately conservative — `western` for everything except
 * the locales where another system is genuinely the norm in software today:
 *
 * - `fa`, `ps`, `ur`, `prs` → `persian`
 * - `ar-YE`, `ar-SD`, `ar-IQ` → `arabic`
 * - every other Arabic locale, **including `ar-EG`** → `western`
 *
 * If your product has decided otherwise, pass the system explicitly rather
 * than fighting this function. It exists to give you a defensible default, not
 * to be authoritative about how a country writes numbers.
 *
 * @example
 * ```ts
 * import { numeralSystemForLocale } from '@harf/core';
 *
 * numeralSystemForLocale('ar-EG'); // 'western' — deliberate; see above
 * numeralSystemForLocale('fa-IR'); // 'persian'
 * numeralSystemForLocale('ar-YE'); // 'arabic'
 * numeralSystemForLocale('en-US'); // 'western'
 * ```
 */
export function numeralSystemForLocale(locale: string): NumeralSystem {
  const lower = locale.toLowerCase();
  const language = lower.split(/[-_]/)[0] ?? '';

  if (language === 'fa' || language === 'ps' || language === 'ur' || language === 'prs') {
    return 'persian';
  }
  if (language === 'ar') {
    const region = lower.split(/[-_]/).find((part) => part.length === 2 && part !== 'ar');
    if (region === 'ye' || region === 'sd' || region === 'iq') return 'arabic';
    return 'western';
  }
  return 'western';
}

/**
 * Detects which numeral system a string's digits are written in.
 *
 * @returns The system, or `null` for a string containing no digits or a mix of
 *   more than one system.
 *
 * @example
 * ```ts
 * import { detectNumeralSystem } from '@harf/core';
 *
 * detectNumeralSystem('٢٠٢٦');   // 'arabic'
 * detectNumeralSystem('2026');   // 'western'
 * detectNumeralSystem('٢0');     // null — mixed
 * detectNumeralSystem('مرحبا');  // null — no digits
 * ```
 */
export function detectNumeralSystem(text: string): NumeralSystem | null {
  let found: NumeralSystem | null = null;
  for (const char of text) {
    const code = char.codePointAt(0) as number;
    let system: NumeralSystem | null = null;
    if (code >= 0x0030 && code <= 0x0039) system = 'western';
    else if (code >= 0x0660 && code <= 0x0669) system = 'arabic';
    else if (code >= 0x06f0 && code <= 0x06f9) system = 'persian';
    if (system === null) continue;
    if (found === null) found = system;
    else if (found !== system) return null;
  }
  return found;
}

/**
 * Values whose digits must never be transformed.
 *
 * Converting these breaks something real:
 *
 * - **Phone numbers** — the user taps to dial, or copies into a dialler.
 * - **National ID and passport numbers** — copied into a government form.
 * - **Order and tracking numbers** — pasted into a courier's website.
 * - **OTP codes** — typed back into an SMS field, or read by an autofill API.
 * - **IBANs, card numbers, invoice references** — parsed by a payment system.
 * - **Anything in a numeric `TextInput`** — the keyboard emits Western digits,
 *   so a converted value cannot be edited without corrupting it.
 * - **Version numbers, IDs, coordinates** — parsed by your own code.
 */
export type CopySensitiveKind =
  'phone' | 'id' | 'order' | 'otp' | 'payment' | 'input' | 'code';

/**
 * A conservative heuristic for "this looks like a value a machine will read".
 *
 * Harf uses it to warn in development when {@link convertDigits} is applied to
 * something risky. It is not a security boundary and it is not exhaustive —
 * the reliable fix is to mark the value literal at the call site.
 *
 * @example
 * ```ts
 * import { isCopySensitive } from '@harf/core';
 *
 * isCopySensitive('+20 114 919 9190'); // true — phone
 * isCopySensitive('EG380019000500000000263180002'); // true — IBAN-shaped
 * isCopySensitive('483920');           // true — OTP-shaped
 * isCopySensitive('1,250.00');         // false — a formatted quantity
 * isCopySensitive('25');               // false — a plain small number
 * ```
 */
export function isCopySensitive(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // A leading + with digits is a dialable number.
  if (/^\+\d[\d\s().-]*$/.test(trimmed)) return true;

  const digits = trimmed.replace(/\D/g, '');

  // Long unbroken runs are identifiers, not quantities.
  if (/^\d{6,}$/.test(trimmed)) return true;

  // Mixed letters and digits with no spaces: IBANs, order refs, plates.
  if (/^[A-Z0-9-]{6,}$/.test(trimmed) && /\d/.test(trimmed) && /[A-Z]/.test(trimmed)) {
    return true;
  }

  // Grouped digits with no thousands-style grouping: 0100 123 4567.
  if (digits.length >= 9 && /^[\d\s().-]+$/.test(trimmed)) return true;

  // Dotted numeric identifiers: version numbers, IP addresses.
  if (/^\d+(\.\d+){2,}$/.test(trimmed)) return true;

  return false;
}
