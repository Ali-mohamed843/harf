/**
 * `@harf/core/react` — the React context and hooks every Harf adapter shares.
 *
 * This module lives in `@harf/core` rather than in an adapter so there is
 * exactly **one** direction context in a process. An app running
 * react-native-web, or a monorepo with a web app and a native app sharing
 * component code, would otherwise end up with two contexts and a
 * `useDirection()` that silently returns the default.
 *
 * `react` is an *optional peer dependency* of `@harf/core`. It is not in
 * `dependencies`, so the zero-runtime-dependency rule still holds, and nothing
 * here is reachable unless you import this subpath.
 *
 * No JSX is used, so this compiles to plain `createElement` calls with no
 * `jsx-runtime` import — one less thing in a React Native bundle.
 *
 * @packageDocumentation
 */

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { directionSign, oppositeDirection, type Direction } from '../direction';
import { directionForLocale } from '../locale';
import { resolveStyle, type LogicalStyleSheet } from '../style/resolve';
import type { StyleInput, StyleObject } from '../style/types';

/** What {@link useHarf} returns. */
export interface HarfContextValue {
  /** The current writing direction. */
  readonly dir: Direction;
  /** `true` when `dir` is `'rtl'`. A convenience, because the check is everywhere. */
  readonly isRTL: boolean;
  /** The locale the direction was derived from, when one was given. */
  readonly locale: string | undefined;
  /**
   * Change the direction.
   *
   * On React Native this is an ordinary state update: the tree re-renders and
   * every logical style resolves the other way. **No reload, no white flash,
   * no `I18nManager.forceRTL`.**
   */
  setDirection(dir: Direction): void;
  /** Switch to the opposite direction. */
  toggleDirection(): void;
}

const FALLBACK: HarfContextValue = Object.freeze({
  dir: 'ltr',
  isRTL: false,
  locale: undefined,
  setDirection: () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[harf] setDirection was called outside a <DirectionProvider>. ' +
          'Wrap your app in one, or pass `dir` explicitly.',
      );
    }
  },
  toggleDirection: () => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[harf] toggleDirection was called outside a <DirectionProvider>.');
    }
  },
});

const HarfContext = createContext<HarfContextValue>(FALLBACK);
HarfContext.displayName = 'HarfContext';

/** Props for {@link DirectionProvider}. */
export interface DirectionProviderProps {
  /**
   * The direction to use. Pass this to control the provider yourself; leave it
   * off (with `defaultDir` or `locale`) to let the provider hold the state.
   */
  readonly dir?: Direction;
  /**
   * The initial direction when the provider is uncontrolled.
   * @defaultValue derived from `locale`, or `'ltr'`
   */
  readonly defaultDir?: Direction;
  /**
   * A BCP-47 locale to derive the direction from, e.g. `'ar-EG'`. Ignored when
   * `dir` is given.
   */
  readonly locale?: string;
  /** Called whenever the direction changes, controlled or not. */
  readonly onDirectionChange?: (dir: Direction) => void;
  readonly children?: ReactNode;
}

/**
 * Provides the writing direction to everything below it.
 *
 * @example Uncontrolled, from a locale
 * ```tsx
 * import { DirectionProvider } from '@harf/native';
 *
 * <DirectionProvider locale="ar-EG">
 *   <App />
 * </DirectionProvider>
 * ```
 *
 * @example Controlled, driven by your own i18n state
 * ```tsx
 * const [language, setLanguage] = useState('ar');
 *
 * <DirectionProvider locale={language}>
 *   <App />
 * </DirectionProvider>
 * ```
 *
 * @example Switching direction with no restart
 * ```tsx
 * import { useDirection } from '@harf/native';
 *
 * function LanguageToggle() {
 *   const { toggleDirection, isRTL } = useDirection();
 *   return (
 *     <Button
 *       title={isRTL ? 'English' : 'العربية'}
 *       onPress={toggleDirection}
 *     />
 *   );
 * }
 * ```
 */
export function DirectionProvider(props: DirectionProviderProps): ReactElement {
  const { dir, defaultDir, locale, onDirectionChange, children } = props;

  const derived = locale === undefined ? undefined : directionForLocale(locale);
  const [uncontrolled, setUncontrolled] = useState<Direction>(
    () => defaultDir ?? derived ?? 'ltr',
  );

  // A controlled `dir` wins; then a locale; then our own state.
  const active: Direction = dir ?? derived ?? uncontrolled;

  const setDirection = useCallback(
    (next: Direction) => {
      setUncontrolled(next);
      onDirectionChange?.(next);
    },
    [onDirectionChange],
  );

  const value = useMemo<HarfContextValue>(
    () => ({
      dir: active,
      isRTL: active === 'rtl',
      locale,
      setDirection,
      toggleDirection: () => setDirection(oppositeDirection(active)),
    }),
    [active, locale, setDirection],
  );

  return createElement(HarfContext.Provider, { value }, children);
}

/**
 * The full Harf context: direction, locale, and the setters.
 *
 * @example
 * ```tsx
 * const { dir, isRTL, setDirection } = useHarf();
 * ```
 */
export function useHarf(): HarfContextValue {
  return useContext(HarfContext);
}

/**
 * The current direction context.
 *
 * Outside a `<DirectionProvider>` this returns `'ltr'` rather than throwing, so
 * a component is still renderable in isolation — in a test, in Storybook, in a
 * design-system playground.
 *
 * @example
 * ```tsx
 * import { useDirection } from '@harf/native';
 *
 * function Chevron() {
 *   const { dir } = useDirection();
 *   return <Icon name="chevron-forward" style={mirrorIf(dir)} />;
 * }
 * ```
 */
export function useDirection(): HarfContextValue {
  return useContext(HarfContext);
}

/**
 * Resolves a sheet from `createStyles` for the current direction.
 *
 * The result is memoised inside the sheet, so this returns the *identical*
 * object on every render at a given direction and does not defeat `React.memo`
 * on a child.
 *
 * @example
 * ```tsx
 * import { createStyles } from '@harf/core';
 * import { useLogicalStyles } from '@harf/native';
 *
 * const styles = createStyles({
 *   row: { flexDirection: 'row', paddingStart: 16 },
 *   title: { textAlign: 'start', fontSize: 18 },
 * });
 *
 * function Header() {
 *   const s = useLogicalStyles(styles);
 *   return (
 *     <View style={s.row}>
 *       <Text style={s.title}>مرحبا</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export function useLogicalStyles<T extends Readonly<Record<string, StyleObject>>>(
  sheet: LogicalStyleSheet<T>,
): { readonly [K in keyof T]: StyleObject } {
  const { dir } = useContext(HarfContext);
  return sheet(dir);
}

/**
 * Resolves an ad-hoc style for the current direction.
 *
 * Prefer {@link useLogicalStyles} with a sheet declared outside the component:
 * an inline object literal is a new identity every render, so it can only be
 * cached once per render rather than once per direction.
 *
 * @example
 * ```tsx
 * const style = useResolvedStyle(
 *   useMemo(() => ({ paddingStart: gap }), [gap]),
 * );
 * ```
 */
export function useResolvedStyle<T extends StyleInput>(style: T): T {
  const { dir } = useContext(HarfContext);
  return useMemo(() => resolveStyle(style, dir), [style, dir]);
}

/**
 * Picks between two values by direction.
 *
 * @example
 * ```tsx
 * const icon = useDirectionalValue('chevron-right', 'chevron-left');
 * const drawerSide = useDirectionalValue('left', 'right');
 * ```
 */
export function useDirectionalValue<T>(ltrValue: T, rtlValue: T): T {
  const { dir } = useContext(HarfContext);
  return dir === 'ltr' ? ltrValue : rtlValue;
}

/**
 * Flips the sign of a horizontal offset to match the current direction.
 *
 * `translateX`, drag deltas, scroll offsets and carousel positions all need
 * this. Forgetting it is why a slide-in panel enters from the wrong side under
 * RTL while everything else looks right.
 *
 * @param value - A horizontal offset expressed as "distance towards the end".
 * @returns The offset with the correct sign for the current direction.
 *
 * @example
 * ```tsx
 * import { useDirectionalTranslate } from '@harf/native';
 *
 * function SlideIn({ progress }: { progress: number }) {
 *   // Enters from the start edge in both directions.
 *   const translateX = useDirectionalTranslate((1 - progress) * 300);
 *   return <Animated.View style={{ transform: [{ translateX }] }} />;
 * }
 * ```
 */
export function useDirectionalTranslate(value: number): number {
  const { dir } = useContext(HarfContext);
  return value * directionSign(dir);
}

/**
 * `1` under LTR and `-1` under RTL.
 *
 * The building block behind {@link useDirectionalTranslate}, for when you need
 * the multiplier itself — inside a Reanimated worklet, for instance, where a
 * hook cannot run.
 *
 * @example
 * ```tsx
 * const sign = useDirectionSign();
 * const style = useAnimatedStyle(() => ({
 *   transform: [{ translateX: offset.value * sign }],
 * }));
 * ```
 */
export function useDirectionSign(): 1 | -1 {
  const { dir } = useContext(HarfContext);
  return directionSign(dir);
}

export { HarfContext };
export type { Direction };
