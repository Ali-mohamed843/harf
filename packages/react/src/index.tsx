/**
 * `@harf/react` — React adapter for Harf, for the web.
 *
 * On the web, CSS logical properties already handle most layout. This package
 * exists for what CSS does not give you:
 *
 * - a direction value React can *react* to, shared with `@harf/native` so a
 *   react-native-web app has one source of truth;
 * - correct bidirectional isolation of embedded LTR runs, via a component that
 *   sets `unicode-bidi: isolate` rather than injecting control characters into
 *   your strings;
 * - digit rendering with the copy-safety rule enforced by the API;
 * - the mirroring registry, applied as a CSS transform.
 *
 * @packageDocumentation
 */

import {
  createElement,
  useMemo,
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  autoIsolate,
  convertDigits,
  firstStrongDirection,
  formatCurrency,
  formatNumber,
  isCopySensitive,
  isolate as isolateText,
  mirrorTransform,
  numeralSystemForLocale,
  shouldMirror,
  stripBidi,
  type Direction,
  type FormatNumberOptions,
  type NumeralSystem,
} from '@harf/core';
import { useDirection, useHarf } from '@harf/core/react';

export {
  DirectionProvider,
  useDirection,
  useDirectionSign,
  useDirectionalTranslate,
  useDirectionalValue,
  useHarf,
  useLogicalStyles,
  useResolvedStyle,
  type DirectionProviderProps,
  type HarfContextValue,
} from '@harf/core/react';

export type { Direction };

/** Props for {@link Bidi}. */
export interface BidiProps {
  /** The text to isolate. */
  readonly children?: ReactNode;
  /**
   * Force a direction on the isolated run. Leave it off to let the run decide
   * from its own first strong character, which is what you want for a value
   * whose direction is unknown at build time.
   */
  readonly dir?: Direction;
  /**
   * Detect and isolate every embedded opposite-direction run inside the text,
   * instead of isolating the whole thing as one unit.
   *
   * Only works when `children` is a plain string.
   */
  readonly auto?: boolean;
  /** The element to render. @defaultValue `'span'` */
  readonly as?: ElementType;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * Isolates a run of text so it cannot disturb the ordering of the text around
 * it.
 *
 * On the web this uses CSS `unicode-bidi: isolate` rather than injecting
 * U+2068/U+2069 into your string. That matters: the CSS approach leaves the
 * text node itself untouched, so the user copies the value they can see, and
 * `textContent` in a test or a scraper is the value you passed in.
 *
 * @example The bug
 * ```tsx
 * // The trailing '2026' visually jumps to the wrong side of the brand name.
 * <p dir="rtl">مرحبا بك في Karnak Holidays 2026 اليوم</p>
 * ```
 *
 * @example The fix
 * ```tsx
 * import { Bidi } from '@harf/react';
 *
 * <p dir="rtl">
 *   مرحبا بك في <Bidi>Karnak Holidays 2026</Bidi> اليوم
 * </p>
 * ```
 *
 * @example A whole string, runs detected automatically
 * ```tsx
 * <Bidi auto>{product.description}</Bidi>
 * ```
 */
export function Bidi(props: BidiProps): ReactElement {
  const { children, dir, auto, as = 'span', className, style } = props;
  const { dir: contextDir } = useDirection();

  const content = useMemo(() => {
    if (!auto || typeof children !== 'string') return children;
    return autoIsolate(children, { base: contextDir });
  }, [auto, children, contextDir]);

  const resolvedDir =
    dir ??
    (typeof children === 'string'
      ? (firstStrongDirection(children) ?? undefined)
      : undefined);

  return createElement(
    as,
    {
      className,
      dir: resolvedDir,
      style: { unicodeBidi: 'isolate', ...style } as CSSProperties,
    },
    content,
  );
}

/** Props for {@link Num}. */
export interface NumProps extends FormatNumberOptions {
  /** The value to render. */
  readonly children?: string | number;
  /**
   * Render the value exactly as given, in Western digits, never converted.
   *
   * **Use this for anything a machine will parse or a human will copy**: phone
   * numbers, national IDs, order and tracking numbers, OTP codes, IBANs, card
   * numbers, version numbers, coordinates, and the value of any numeric input.
   *
   * Converting those breaks something real. A phone number in Arabic-Indic
   * digits cannot be dialled by tapping it. An order number pasted into a
   * courier's website will not be found. An OTP typed back from Arabic-Indic
   * digits will not match.
   */
  readonly literal?: boolean;
  /** Override the numeral system. Ignored when `literal` is set. */
  readonly numerals?: NumeralSystem;
  /** Derive the numeral system from a locale. Ignored when `numerals` is set. */
  readonly locale?: string;
  /** Format as a currency amount in this ISO 4217 code. */
  readonly currency?: string;
  /** The element to render. @defaultValue `'span'` */
  readonly as?: ElementType;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * Renders a number, with the copy-safety rule enforced by the API.
 *
 * Without `numerals` or `locale`, digits are left as Western — the safe
 * default, and the right one for `ar-EG`, where Western digits are the norm.
 *
 * @example A quantity
 * ```tsx
 * <Num decimals={2}>{1234.5}</Num>          // 1,234.50
 * <Num numerals="arabic">{1234}</Num>       // ١٬٢٣٤
 * <Num locale="fa-IR">{1234}</Num>          // ۱٬۲۳۴
 * ```
 *
 * @example A price
 * ```tsx
 * <Num currency="EGP">{1250.5}</Num>        // 1,250.50 ج.م.
 * <Num currency="KWD">{19.5}</Num>          // 19.500 د.ك — three decimals
 * ```
 *
 * @example A value that must never be converted
 * ```tsx
 * <Num literal>{order.reference}</Num>
 * <Num literal>{user.phone}</Num>
 * <Num literal>{otpCode}</Num>
 * ```
 *
 * @remarks
 * In development, `<Num>` warns when it is about to convert the digits of a
 * value that looks like a phone number, an ID, or an OTP. Silence it by adding
 * `literal`, which is what you wanted anyway.
 */
export function Num(props: NumProps): ReactElement {
  const {
    children,
    literal,
    numerals,
    locale,
    currency,
    as = 'span',
    className,
    style,
    ...format
  } = props;
  const { locale: contextLocale } = useHarf();

  const text = useMemo(() => {
    const raw = children ?? '';
    if (literal === true) {
      // Isolated, so a phone number keeps its digit groups in order inside an
      // RTL sentence, but never converted.
      return isolateText(String(raw));
    }

    const effectiveLocale = locale ?? contextLocale;
    const system: NumeralSystem =
      numerals ??
      (effectiveLocale === undefined
        ? 'western'
        : numeralSystemForLocale(effectiveLocale));

    if (currency !== undefined) {
      const value = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
      if (Number.isNaN(value)) return String(raw);
      return formatCurrency(value, currency, {
        locale: effectiveLocale,
        numerals: system,
      });
    }

    if (typeof raw === 'number') {
      return formatNumber(raw, { ...format, numerals: system });
    }

    const asText = String(raw);
    if (process.env.NODE_ENV !== 'production' && system !== 'western') {
      warnIfCopySensitive(asText);
    }
    return convertDigits(asText, system);
  }, [children, literal, numerals, locale, contextLocale, currency, format]);

  return createElement(as, { className, style }, text);
}

const warned = new Set<string>();

function warnIfCopySensitive(value: string): void {
  if (!isCopySensitive(value) || warned.has(value)) return;
  warned.add(value);
  console.warn(
    `[harf] <Num> is about to convert the digits of "${value}", which looks like ` +
      'a phone number, ID, order reference or code. A converted value cannot be ' +
      'dialled, pasted or parsed. Add the `literal` prop if this value is ' +
      'machine-readable.',
  );
}

/** Props for {@link Mirror}. */
export interface MirrorProps {
  readonly children?: ReactNode;
  /**
   * An icon name to look up in the mirroring registry. When given, the element
   * only mirrors if the registry says that icon should.
   */
  readonly name?: string;
  /** Mirror unconditionally under RTL, ignoring the registry. */
  readonly force?: boolean;
  /** The element to render. @defaultValue `'span'` */
  readonly as?: ElementType;
  readonly className?: string;
  readonly style?: CSSProperties;
}

/**
 * Horizontally flips its children under RTL — but only when that is correct.
 *
 * With a `name`, the decision comes from the curated registry, which knows
 * that a chevron mirrors and a clock face does not. Without one, it mirrors
 * unconditionally, which you should only do when you already know.
 *
 * @example Registry-driven, the safe form
 * ```tsx
 * import { Mirror } from '@harf/react';
 *
 * <Mirror name="chevron-right"><ChevronIcon /></Mirror>  // flips under RTL
 * <Mirror name="clock"><ClockIcon /></Mirror>            // never flips
 * ```
 *
 * @example When you already know
 * ```tsx
 * <Mirror force><CustomArrow /></Mirror>
 * ```
 */
export function Mirror(props: MirrorProps): ReactElement {
  const { children, name, force, as = 'span', className, style } = props;
  const { dir } = useDirection();

  const mirror =
    force === true ? dir === 'rtl' : name !== undefined && shouldMirror(name, dir);

  return createElement(
    as,
    {
      className,
      style: {
        display: 'inline-flex',
        transform: mirror ? mirrorTransform('rtl') : undefined,
        ...style,
      } as CSSProperties,
    },
    children,
  );
}

/**
 * The `dir` attribute value for the current context, ready to spread onto an
 * element.
 *
 * @example
 * ```tsx
 * <div {...useDirAttribute()}>…</div>
 * ```
 */
export function useDirAttribute(): { readonly dir: Direction } {
  const { dir } = useDirection();
  return useMemo(() => ({ dir }), [dir]);
}

export { autoIsolate, isolateText as isolate, stripBidi };
