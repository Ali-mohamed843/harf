/**
 * `@harf/native` — React Native adapter for Harf.
 *
 * The headline: **switching direction without an app restart.**
 * `I18nManager.forceRTL()` requires a full reload to take effect, which is why
 * Arabic React Native apps flash white and restart when the user changes
 * language. Harf does not use `I18nManager` for layout at all. Direction lives
 * in React context and logical styles resolve at render time, so changing
 * direction is an ordinary re-render.
 *
 * Some React Native components are laid out by native code that reads
 * `I18nManager.isRTL` and cannot be corrected from JavaScript. See
 * {@link LIMITS} and the limits table in the README — the list is honest, and
 * every row says how it was established.
 *
 * @packageDocumentation
 */

import {
  createElement,
  useCallback,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  I18nManager,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  autoIsolate,
  convertDigits,
  createStyles,
  formatCurrency,
  formatNumber,
  isCopySensitive,
  isolate as isolateText,
  mirrorIf,
  numeralSystemForLocale,
  resolveStyle,
  shouldMirror,
  stripBidi,
  type Direction,
  type FormatNumberOptions,
  type NumeralSystem,
} from '@harf/core';
import { useDirection, useHarf } from '@harf/core/react';
import {
  arabicSafeText,
  fontFamilyStack,
  metricsFor,
  type ArabicFontMetrics,
} from '@harf/fonts';

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

export {
  createStyles,
  resolveStyle,
  autoIsolate,
  isolateText as isolate,
  stripBidi,
  shouldMirror,
  mirrorIf,
  type Direction,
};

export {
  LIMITS,
  handledSubjects,
  limitsAsMarkdown,
  restartRequiredSubjects,
  type Limit,
  type LimitStatus,
} from './limits';

/**
 * Checks that the app is configured the way Harf's style layer assumes, and
 * warns in development when it is not.
 *
 * Harf reverses a `row` by emitting `row-reverse`. That is correct only while
 * `I18nManager.isRTL` is `false`. If you have also called `forceRTL(true)`,
 * Yoga reverses the row *and* Harf reverses it, and the two cancel out — a
 * confusing failure that looks like Harf not working at all.
 *
 * Call this once at startup.
 *
 * @example
 * ```ts
 * // App.tsx
 * import { assertHarfConfiguration } from '@harf/native';
 *
 * assertHarfConfiguration();
 * ```
 */
export function assertHarfConfiguration(): void {
  if (process.env.NODE_ENV === 'production') return;
  if (!I18nManager.isRTL) return;

  console.warn(
    '[harf] I18nManager.isRTL is true. Harf reverses rows itself, so Yoga ' +
      'reversing them as well cancels the two out and layouts will look ' +
      'unchanged. Remove the I18nManager.forceRTL(true) / allowRTL(true) call ' +
      'and let <DirectionProvider> drive direction instead. ' +
      'See the limits table for the few cases where forceRTL is still needed.',
  );
}

/**
 * Whether the *native* side of the app is in RTL mode.
 *
 * This is `I18nManager.isRTL`, and it is **not** the direction your layout is
 * using — that is `useDirection().dir`. It is exposed so you can check which
 * of the native limits apply to you.
 *
 * @example
 * ```ts
 * import { isNativeRTL, useDirection } from '@harf/native';
 *
 * const { dir } = useDirection();
 * if (dir === 'rtl' && !isNativeRTL()) {
 *   // Layout is RTL, but the TextInput caret and Switch are not. Expected.
 * }
 * ```
 */
export function isNativeRTL(): boolean {
  return I18nManager.isRTL;
}

/** Props for {@link Bidi}. */
export interface BidiProps {
  readonly children?: ReactNode;
  /** Force a direction, rather than letting the run decide from its content. */
  readonly dir?: Direction;
  /** Detect and isolate every embedded opposite-direction run in the string. */
  readonly auto?: boolean;
  readonly style?: StyleProp<TextStyle>;
  readonly numberOfLines?: number;
  readonly testID?: string;
}

/**
 * Isolates a run of text so it cannot disturb the ordering of the text around
 * it.
 *
 * React Native has no `unicode-bidi` CSS property, so unlike the web version
 * this one applies the Unicode control characters directly.
 *
 * **The characters are invisible but real, and they are copied with the
 * text.** Never pass an isolated string back to an API, a comparison, or a
 * database — this component is for display only.
 *
 * @example
 * ```tsx
 * import { Bidi } from '@harf/native';
 *
 * <Text>
 *   مرحبا بك في <Bidi>Karnak Holidays 2026</Bidi> اليوم
 * </Text>
 * ```
 *
 * @example A whole description, runs detected automatically
 * ```tsx
 * <Bidi auto>{product.description}</Bidi>
 * ```
 */
export function Bidi(props: BidiProps): ReactElement {
  const { children, dir, auto, style, numberOfLines, testID } = props;
  const { dir: contextDir } = useDirection();

  const content = useMemo(() => {
    if (typeof children !== 'string') return children;
    return auto === true
      ? autoIsolate(children, { base: contextDir })
      : isolateText(children, dir === undefined ? {} : { dir });
  }, [children, auto, dir, contextDir]);

  return createElement(Text, { style, numberOfLines, testID }, content);
}

/** Props for {@link Num}. */
export interface NumProps extends FormatNumberOptions {
  readonly children?: string | number;
  /**
   * Render the value exactly as given, in Western digits, never converted.
   *
   * **Use this for anything a machine will parse or a human will copy**:
   * phone numbers, national IDs, order and tracking numbers, OTP codes,
   * IBANs, card numbers, and the value of any `<TextInput keyboardType="numeric">`.
   *
   * A phone number in Arabic-Indic digits cannot be dialled by tapping it. An
   * order number pasted into a courier's website will not be found. An OTP
   * typed back from Arabic-Indic digits will not match.
   */
  readonly literal?: boolean;
  readonly numerals?: NumeralSystem;
  readonly locale?: string;
  readonly currency?: string;
  readonly style?: StyleProp<TextStyle>;
  readonly testID?: string;
}

const warned = new Set<string>();

/**
 * Renders a number, with the copy-safety rule enforced by the API.
 *
 * @example
 * ```tsx
 * <Num decimals={2}>{1234.5}</Num>       // 1,234.50
 * <Num currency="EGP">{1250.5}</Num>     // 1,250.50 ج.م.
 * <Num currency="KWD">{19.5}</Num>       // 19.500 د.ك — three decimals
 * <Num numerals="arabic">{1234}</Num>    // ١٬٢٣٤
 * ```
 *
 * @example Values that must never be converted
 * ```tsx
 * <Num literal>{order.reference}</Num>
 * <Num literal>{user.phone}</Num>
 * ```
 */
export function Num(props: NumProps): ReactElement {
  const { children, literal, numerals, locale, currency, style, testID, ...format } =
    props;
  const { locale: contextLocale } = useHarf();

  const text = useMemo(() => {
    const raw = children ?? '';
    if (literal === true) return isolateText(String(raw));

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
    if (
      process.env.NODE_ENV !== 'production' &&
      system !== 'western' &&
      isCopySensitive(asText) &&
      !warned.has(asText)
    ) {
      warned.add(asText);
      console.warn(
        `[harf] <Num> is about to convert the digits of "${asText}", which looks ` +
          'like a phone number, ID, order reference or code. A converted value ' +
          'cannot be dialled, pasted or parsed. Add the `literal` prop if this ' +
          'value is machine-readable.',
      );
    }
    return convertDigits(asText, system);
  }, [children, literal, numerals, locale, contextLocale, currency, format]);

  return createElement(Text, { style, testID }, text);
}

/** Props for {@link Mirror}. */
export interface MirrorProps {
  readonly children?: ReactNode;
  /** Look this icon up in the mirroring registry. */
  readonly name?: string;
  /** Mirror unconditionally under RTL, ignoring the registry. */
  readonly force?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly testID?: string;
}

/**
 * Horizontally flips its children under RTL — but only when that is correct.
 *
 * @example
 * ```tsx
 * import { Mirror } from '@harf/native';
 *
 * <Mirror name="chevron-forward"><Icon /></Mirror>  // flips under RTL
 * <Mirror name="clock"><Icon /></Mirror>            // never flips
 * <Mirror force><CustomArrow /></Mirror>            // flips, your call
 * ```
 */
export function Mirror(props: MirrorProps): ReactElement {
  const { children, name, force, style, testID } = props;
  const { dir } = useDirection();

  const mirror =
    force === true ? dir === 'rtl' : name !== undefined && shouldMirror(name, dir);

  return createElement(
    View,
    { style: [mirror ? mirrorIf('rtl') : null, style], testID },
    children,
  );
}

/**
 * The scroll offset a horizontal pager should start at.
 *
 * A `ScrollView` reversed with `row-reverse` still starts at content offset
 * zero, which under RTL is now the *last* page. The native scroll view knows
 * nothing about your context direction, so the offset has to be set from
 * JavaScript. This is the arithmetic.
 *
 * @param contentWidth - Total width of the scrollable content.
 * @param viewportWidth - Width of the visible area.
 * @returns The `contentOffset` to pass to the ScrollView.
 *
 * @example
 * ```tsx
 * import { useDirectionalScrollOffset } from '@harf/native';
 *
 * const contentOffset = useDirectionalScrollOffset(pages * width, width);
 *
 * <ScrollView horizontal pagingEnabled contentOffset={contentOffset}>
 *   {pages}
 * </ScrollView>
 * ```
 */
export function useDirectionalScrollOffset(
  contentWidth: number,
  viewportWidth: number,
): { readonly x: number; readonly y: number } {
  const { dir } = useDirection();
  return useMemo(
    () => ({ x: dir === 'rtl' ? Math.max(0, contentWidth - viewportWidth) : 0, y: 0 }),
    [dir, contentWidth, viewportWidth],
  );
}

/**
 * Maps a logical page index to the physical index a reversed pager needs.
 *
 * Under RTL a `row-reverse` pager lays page 0 out on the right, so scrolling to
 * "page 2 of 5" means scrolling to physical index 2 counted from the other end.
 *
 * @example
 * ```tsx
 * const toPhysical = useDirectionalIndex(pages.length);
 * scrollRef.current?.scrollTo({ x: toPhysical(currentPage) * width });
 * ```
 */
export function useDirectionalIndex(count: number): (logicalIndex: number) => number {
  const { dir } = useDirection();
  return useCallback(
    (logicalIndex: number) =>
      dir === 'rtl' ? Math.max(0, count - 1 - logicalIndex) : logicalIndex,
    [dir, count],
  );
}

/**
 * The side a drawer should open from.
 *
 * @example
 * ```tsx
 * <DrawerLayoutAndroid drawerPosition={useDrawerSide()}>
 * ```
 */
export function useDrawerSide(): 'left' | 'right' {
  const { dir } = useDirection();
  return dir === 'rtl' ? 'right' : 'left';
}

/**
 * Options for a direction-aware screen transition, in the shape React
 * Navigation's `cardStyleInterpolator` and Reanimated both accept.
 *
 * Harf does **not** import `react-native-reanimated` or
 * `@react-navigation/*` — these are plain numbers, so there is no dependency
 * and no version coupling.
 *
 * @example React Navigation
 * ```tsx
 * import { useScreenTransition } from '@harf/native';
 *
 * const { enterFrom, exitTo } = useScreenTransition();
 *
 * <Stack.Screen
 *   options={{
 *     cardStyleInterpolator: ({ current, layouts }) => ({
 *       cardStyle: {
 *         transform: [{
 *           translateX: current.progress.interpolate({
 *             inputRange: [0, 1],
 *             outputRange: [layouts.screen.width * enterFrom, 0],
 *           }),
 *         }],
 *       },
 *     }),
 *   }}
 * />
 * ```
 *
 * @example Reanimated
 * ```tsx
 * const { enterFrom } = useScreenTransition();
 * const style = useAnimatedStyle(() => ({
 *   transform: [{ translateX: (1 - progress.value) * width * enterFrom }],
 * }));
 * ```
 */
export function useScreenTransition(): {
  /** Multiply the screen width by this for a push animation's start offset. */
  readonly enterFrom: 1 | -1;
  /** Multiply the screen width by this for a pop animation's end offset. */
  readonly exitTo: 1 | -1;
  /** The side the back button belongs on. */
  readonly backButtonSide: 'left' | 'right';
  /** The screen edge a swipe-to-go-back gesture starts from. */
  readonly backGestureEdge: 'left' | 'right';
} {
  const { dir } = useDirection();
  return useMemo(
    () =>
      dir === 'rtl'
        ? {
            enterFrom: -1,
            exitTo: -1,
            backButtonSide: 'right',
            backGestureEdge: 'right',
          }
        : {
            enterFrom: 1,
            exitTo: 1,
            backButtonSide: 'left',
            backGestureEdge: 'left',
          },
    [dir],
  );
}

/**
 * Reverses a list's data when it is rendered in a `row-reverse` container.
 *
 * Returns the array by reference under LTR, so `FlatList`'s own memoisation is
 * not disturbed.
 *
 * @example
 * ```tsx
 * <FlatList horizontal data={useDirectionalData(items)} />
 * ```
 */
export function useDirectionalData<T>(data: readonly T[]): readonly T[] {
  const { dir } = useDirection();
  return useMemo(() => (dir === 'rtl' ? [...data].reverse() : data), [data, dir]);
}

/** What {@link useArabicSafeText} returns, in React Native style shape. */
export interface ArabicTextStyle {
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly paddingVertical: number;
  /** The Arabic family, for React Native's single-family `fontFamily`. */
  readonly fontFamily: string | undefined;
}

/**
 * A font size, line height and padding that will not clip an Arabic face.
 *
 * Arabic typefaces need more vertical room than Latin ones. A `lineHeight` of
 * `fontSize * 1.2` — perfectly comfortable for Latin — cuts the tail off ج and
 * the dots off ي in every family `@harf/fonts` ships a preset for. On React
 * Native the failure is worse than on the web, because a `<Text>` inside a
 * fixed-height row clips silently rather than overflowing visibly.
 *
 * React Native takes a single `fontFamily` rather than a stack, so only the
 * Arabic family is returned. Use {@link fontFamilyStack} on the web, and load
 * a family with genuine Latin coverage (IBM Plex Sans Arabic, Rubik) if your
 * text mixes scripts.
 *
 * @example
 * ```tsx
 * import { useArabicSafeText } from '@harf/native';
 *
 * function Body({ children }: { children: string }) {
 *   const style = useArabicSafeText({ family: 'Cairo', fontSize: 16 });
 *   return <Text style={style}>{children}</Text>;
 * }
 * ```
 */
export function useArabicSafeText(options: {
  readonly family?: string;
  readonly fontSize: number;
  readonly opticalAdjust?: boolean;
  readonly lineHeight?: number;
}): ArabicTextStyle {
  const { family, fontSize, opticalAdjust, lineHeight } = options;
  return useMemo(() => {
    const style = arabicSafeText({ family, fontSize, opticalAdjust, lineHeight });
    return {
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      paddingVertical: style.paddingVertical,
      fontFamily: family,
    };
  }, [family, fontSize, opticalAdjust, lineHeight]);
}

export { arabicSafeText, fontFamilyStack, metricsFor };
export type { ArabicFontMetrics };
