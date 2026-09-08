<div align="center">

# حرف · Harf

**An RTL and Arabic toolkit for React Native and Next.js.**

[![CI](https://github.com/harf-rtl/harf/actions/workflows/ci.yml/badge.svg)](https://github.com/harf-rtl/harf/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

**Switch language without restarting the app.** 8 KB. Zero runtime dependencies.

</div>

---

## Why

React and React Native have poor right-to-left support. Most published guidance
on the subject is a list of manual workarounds. Harf replaces those workarounds
with a real abstraction.

It deliberately does **not** wrap logical CSS properties — Tailwind and modern
CSS already do that well, and reimplementing it would be worthless. Harf is the
parts nobody built.

```bash
pnpm add @harf/core @harf/native      # React Native / Expo
pnpm add @harf/core @harf/react       # React on the web
pnpm add @harf/core @harf/next        # Next.js App Router
pnpm add -D @harf/eslint-plugin       # the lint rules
```

## The headline: no restart

`I18nManager.forceRTL()` requires a full app reload to take effect. It is the
single most-complained-about issue in Arabic React Native apps: the user picks
Arabic, the screen flashes white, the app restarts, and any unsaved state is
gone.

Harf does not use `I18nManager` for layout at all. Direction lives in React
context, and logical styles resolve to physical ones **at render time**. So
changing direction is an ordinary re-render.

```tsx
import { DirectionProvider, useDirection, useLogicalStyles } from '@harf/native';
import { createStyles } from '@harf/core';

const styles = createStyles({
  row: { flexDirection: 'row', paddingStart: 16, borderTopStartRadius: 12 },
  title: { textAlign: 'start', fontSize: 18 },
});

function Header() {
  const s = useLogicalStyles(styles);
  const { toggleDirection, isRTL } = useDirection();

  return (
    <View style={s.row}>
      <Text style={s.title}>مرحبا</Text>
      <Button title={isRTL ? 'English' : 'العربية'} onPress={toggleDirection} />
    </View>
  );
}

export default function App() {
  return (
    <DirectionProvider locale="ar-EG">
      <Header />
    </DirectionProvider>
  );
}
```

`s.row` is `{ flexDirection: 'row', paddingLeft: 16, borderTopLeftRadius: 12 }`
under LTR and `{ flexDirection: 'row-reverse', paddingRight: 16,
borderTopRightRadius: 12 }` under RTL. No reload. No white flash. Component
state survives — [there is a test for
that](./packages/core/src/react/react.test.tsx), and [another asserting Harf
never calls `forceRTL`](./packages/native/src/index.test.tsx).

Resolution is memoised per direction by object identity, so a style object is
resolved **once per direction** however many times it renders, and a style with
nothing logical in it comes back by reference so React Native's own style
diffing still sees an unchanged object.

> **One setup rule.** Do not call `I18nManager.forceRTL(true)`. Harf reverses
> rows itself; if Yoga also reverses them the two cancel out and it looks like
> Harf does not work. Call `assertHarfConfiguration()` once at startup and it
> will tell you.

## The honest limits table

Some React Native components are laid out by **native** code that reads
`I18nManager.isRTL`, a value fixed when the process starts. Those cannot be
corrected from JavaScript, by Harf or by anything else.

Read the **Evidence** column. `measured` means it was reproduced and the result
recorded. `reasoned` means it follows from React Native's layout model but has
not been reproduced end to end. `unverified` means neither — the row is a
hypothesis, recorded so the table is complete, not because it is established.

If you have a device and five minutes, [turning one `unverified` row into
`measured`](./CONTRIBUTING.md) — or deleting it — is the most valuable
contribution you can make.

<!-- BEGIN GENERATED LIMITS TABLE -->

> 7 handled from JavaScript · 2 partial · 5 need `forceRTL` and a restart · 2 not applicable.
>
> Evidence: 5 measured, 4 reasoned from React Native's layout model, 7 **unverified**.

| Subject                                                       | Status                     | Evidence   | Detail                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| View / Text layout (margin, padding, position, border radius) | Handled                    | measured   | Resolved to physical properties at render time by createStyles and useLogicalStyles. Changing direction is an ordinary React state update.                                                                                                                                                                                                                                                 |
| flexDirection: row                                            | Handled                    | measured   | Emitted as 'row-reverse' under RTL. Correct as long as I18nManager.isRTL stays false, which is what Harf asks you to keep. **Workaround:** Do not call I18nManager.forceRTL(true). If you have, Yoga will reverse rows itself and Harf will reverse them again, cancelling out.                                                                                                            |
| textAlign                                                     | Handled                    | measured   | 'start' and 'end' resolve to 'left' and 'right' at render time.                                                                                                                                                                                                                                                                                                                            |
| Text rendering and bidi reordering inside a string            | Not applicable             | measured   | The platform text engine runs the Unicode Bidirectional Algorithm itself and does so correctly. Harf only supplies isolation around embedded runs.                                                                                                                                                                                                                                         |
| Icon and image mirroring                                      | Handled                    | measured   | A scaleX(-1) transform driven by the curated registry. Nothing native is involved.                                                                                                                                                                                                                                                                                                         |
| ScrollView / FlatList content layout                          | Handled                    | reasoned   | The content is laid out by Yoga from your styles, so a horizontal list reverses when its row does.                                                                                                                                                                                                                                                                                         |
| ScrollView / FlatList initial scroll offset and paging        | Partial                    | reasoned   | Content order follows Harf, but the initial content offset does not: a horizontal pager reversed by style still starts at offset 0, which is now the last page. The native scroll view has no notion of your context direction. **Workaround:** Set contentOffset (or call scrollToEnd on mount) when the direction is RTL. useDirectionalScrollOffset does this arithmetic for you.       |
| TextInput text alignment and typing direction                 | Handled                    | reasoned   | textAlign resolves like any other style, and the platform keyboard determines the script.                                                                                                                                                                                                                                                                                                  |
| TextInput caret position and selection handles                | Needs `forceRTL` + restart | unverified | The caret and the selection grab-handles are drawn by the platform text widget, which reads the process-level RTL flag rather than any React prop. Harf cannot reach them. **Workaround:** For a text-heavy Arabic-first app, this is the one case where forceRTL plus a restart is genuinely justified. For a mostly-LTR app with some Arabic fields, the mismatch is usually acceptable. |
| Switch thumb travel direction                                 | Needs `forceRTL` + restart | unverified | Rendered by the native platform control (UISwitch, SwitchCompat), which mirrors according to the process RTL flag. **Workaround:** Wrap it in <Mirror force> if you want the visual flip without a restart. The touch target does not move, so this is a cosmetic fix.                                                                                                                     |
| Modal presentation and dismissal animation                    | Partial                    | unverified | Content inside the modal follows Harf normally. The presentation animation itself is native and its horizontal direction is not affected by context.                                                                                                                                                                                                                                       |
| DrawerLayoutAndroid drawer side                               | Needs `forceRTL` + restart | unverified | The drawer side is a native Android property. It has a drawerPosition prop you can set explicitly, but the gesture edge follows the native flag. **Workaround:** Pass drawerPosition={dir === 'rtl' ? 'right' : 'left'} for the visual side. Prefer a JavaScript drawer (react-native-drawer-layout) for a fully context-driven one.                                                       |
| Native date and time pickers                                  | Needs `forceRTL` + restart | unverified | Presented by the platform. Layout, calendar and numeral system all come from the OS locale, not from your app. **Workaround:** Use a JavaScript picker if the calendar must match your in-app language rather than the device language.                                                                                                                                                    |
| Android's native back gesture                                 | Not applicable             | unverified | The predictive back gesture edge follows the system, not the app. It is the same for every app on the device, so users do not experience it as an inconsistency.                                                                                                                                                                                                                           |
| ActionSheetIOS / native alerts                                | Needs `forceRTL` + restart | unverified | Presented by the OS and laid out by the OS locale.                                                                                                                                                                                                                                                                                                                                         |
| Accessibility reading order                                   | Handled                    | reasoned   | Follows the view hierarchy, which Harf reverses through flexDirection along with the visual order.                                                                                                                                                                                                                                                                                         |

<!-- END GENERATED LIMITS TABLE -->

This table is generated from
[`packages/native/src/limits.ts`](./packages/native/src/limits.ts) by
`pnpm docs:limits`, so it cannot drift from the data the runtime uses.

## What else it does

### Bidirectional isolation

An LTR run inside an RTL sentence reorders incorrectly at its boundaries. Almost
every Arabic app has this bug, and it is invisible in code review — the source
looks fine.

```tsx
// Broken: the trailing '2026' jumps to the wrong side of the brand name.
<Text>مرحبا بك في Karnak Holidays 2026 اليوم</Text>

// Fixed:
<Text>مرحبا بك في <Bidi>Karnak Holidays 2026</Bidi> اليوم</Text>

// Or let Harf find the runs itself:
<Bidi auto>{product.description}</Bidi>
```

`autoIsolate` handles the cases that break naive implementations:

| Case                                     | Behaviour                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `مرحبا بك في Karnak Holidays 2026 اليوم` | Trailing digits stay with the brand; the following Arabic word does not          |
| `اتصل على +20 114 919 9190 الآن`         | Found and isolated whole, even though it contains **no strong character at all** |
| `راسلنا على ali@karnak.com لأي استفسار`  | The address stays contiguous                                                     |
| `زوروا https://karnak.com/عروض?ref=ar`   | The URL is isolated **whole, never internally**, so it survives copy-paste       |
| `اشتر (Karnak Pro) الآن`                 | Bracket pairs are never half-enclosed — they mirror                              |
| `المنتجات: iPhone، Galaxy، Redmi`        | One isolate per item; the Arabic comma ends a Latin run                          |

It is idempotent, and `stripBidi(autoIsolate(x)) === x` for every case above.

> On the web `<Bidi>` uses CSS `unicode-bidi: isolate`, so the text node is
> untouched and the user copies what they see. On React Native there is no such
> CSS property, so the control characters are applied directly — **never store
> or transmit an isolated string.**

### Numerals, with the copy-safety rule in the API

Egypt uses Western digits far more than people assume, so `ar-EG` defaults to
Western. That is a configuration decision, documented, not magic.

```tsx
<Num decimals={2}>{1234.5}</Num>       // 1,234.50
<Num numerals="arabic">{1234}</Num>    // ١٬٢٣٤
<Num locale="fa-IR">{1234}</Num>       // ۱٬۲۳۴
```

**Never convert the digits of a value a machine will parse or a human will
copy.** A phone number in Arabic-Indic digits cannot be dialled by tapping it.
An order number pasted into a courier's site will not be found. An OTP typed
back will not match.

```tsx
<Num literal>{order.reference}</Num>
<Num literal>{user.phone}</Num>
<Num literal>{otpCode}</Num>
```

In development, `<Num>` warns before converting anything that looks like a phone
number, ID, IBAN or OTP. `literal` also isolates the value, so its digit groups
keep their order inside an Arabic sentence.

### Currency that is the same on every engine

`Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' })` produces
different output across JavaScript engines and OS versions. Harf does its own
grouping and rounding, so a price is byte-identical in a browser, on Hermes, and
in a snapshot test.

```ts
formatCurrency(1250.5, 'EGP'); // '1,250.50 ج.م.'
formatCurrency(1250.5, 'EGP', { locale: 'en' }); // 'E£1,250.50'
formatCurrency(19.5, 'KWD'); // '19.500 د.ك'  ← three decimals
formatCurrency(-42, 'SAR'); // '-42.00 ر.س'
```

KWD, BHD, OMR, JOD, TND and IQD carry **three** decimal places. Treating them as
two is a thousand-fold error that reaches production regularly. Negatives never
use parentheses, because parentheses mirror under RTL.

`intlCurrencyReference()` shows what the platform would have produced, so you
can justify the divergence in review.

### Hijri dates that do not lie

```ts
formatHijriDate(new Date()); // Umm al-Qura, the calendar Egypt and Saudi use
toHijriParts(new Date()); // { year: 1448, month: 3, day: 16 }
```

`Intl` accepts an unknown calendar and **silently falls back to Gregorian**, so
"it did not throw" is not evidence of support. Harf compares the formatted
output, and `formatHijriDate` returns `null` rather than a Gregorian date under
a Hijri heading.

React Native's Hermes ships a reduced `Intl`. `getIntlCapabilities()` reports
what this engine actually has, and `INTL_POLYFILLS` names the `@formatjs`
package for each gap. **Harf bundles none of them** — that cost belongs in your
budget where you can see it.

### Icon mirroring, curated

Mirroring the wrong thing is worse than mirroring nothing. A flipped clock reads
as broken; a flipped wordmark reads as a counterfeit.

```tsx
<Mirror name="chevron-forward"><Icon /></Mirror>  // flips under RTL
<Mirror name="clock"><Icon /></Mirror>            // never flips
<Mirror name="your-own-glyph"><Icon /></Mirror>   // unknown → left alone
```

The registry knows the names real icon sets ship — Ionicons'
`chevron-forward`/`chevron-back`, Material's `keyboard-arrow-*`, Feather's
`chevrons-*` and `corner-*`, Lucide's `circle-chevron-*`. Every exclusion
carries a written reason, including
[why `play` is not mirrored](./packages/core/src/mirror/registry.ts). Override
any of it with `createMirrorRegistry()`.

### Gestures, animation, navigation

```tsx
const translateX = useDirectionalTranslate(40); // 40 or -40
const contentOffset = useDirectionalScrollOffset(w, v); // a reversed pager starts at the far end
const { backButtonSide, enterFrom } = useScreenTransition();
const drawerSide = useDrawerSide();
```

These return plain numbers and sides, so Harf takes **no dependency** on
Reanimated or React Navigation and cannot break when either releases.

### Arabic typography

Arabic faces need more vertical room than Latin ones. `lineHeight: fontSize *
1.2` — fine for Latin — clips the tail of ج and the dots of ي in every family
`@harf/fonts` covers.

```tsx
const style = useArabicSafeText({ family: 'Cairo', fontSize: 16 });
// { fontSize: 16, lineHeight: 28, paddingVertical: 1.6, … }
```

Presets for Cairo, Tajawal, IBM Plex Sans Arabic, Noto Naskh Arabic, Noto Sans
Arabic, Almarai, Rubik, Amiri, Changa and Lateef, plus metric-compatible Latin
fallback chains.

### Next.js: no flash of wrong direction

Setting `dir` from a client effect means the first painted frame is LTR. Resolve
it on the server instead:

```tsx
// app/[locale]/layout.tsx
import { htmlDirectionProps } from '@harf/next/server';

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  return (
    <html {...htmlDirectionProps(locale)}>
      <body>
        <DirectionProvider locale={locale}>{children}</DirectionProvider>
      </body>
    </html>
  );
}
```

React context does not cross into a server component. Harf does not pretend
otherwise — `getDirection()` is for server components, `useDirection()` for
client ones, and they live in different entry points so the boundary is
enforced rather than documented.

### The lint rules

```js
// eslint.config.js
import harf from '@harf/eslint-plugin';
export default [harf.configs.recommended];
```

| Rule                          | Does                                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `harf/no-physical-properties` | `marginLeft` → `marginStart`, `textAlign: 'left'` → `'start'`, the radius corners. **Autofix.** |
| `harf/no-physical-tailwind`   | `ml-4` → `ms-4`, keeping `md:`/`hover:` variants, `!`, and your whitespace. **Autofix.**        |
| `harf/require-bidi-isolation` | Warns on `` `مرحبا ${value}` ``. Suggestion, not autofix — it cannot know the value is Latin.   |

`no-physical-properties` fires only inside something it can identify as a style,
so it does not flag `{ axis: { left: 0 } }` in a chart config. A rule that
fires on every object with a `left` key is a rule people switch off.

### Testing utilities

```tsx
import { renderBoth } from '@harf/native/testing'; // or @harf/react/testing

const { ltr, rtl } = renderBoth(<Card title="مرحبا" />);
expect(ltr.toJSON()).toMatchSnapshot('ltr');
expect(rtl.toJSON()).toMatchSnapshot('rtl');
```

```ts
import { toHaveNoPhysicalProperties } from '@harf/core/testing';

expect.extend({ toHaveNoPhysicalProperties });
expect(styles.source).toHaveNoPhysicalProperties();
```

## Weight

Measured with `pnpm size` — esbuild, minified, gzipped, peer dependencies
excluded. Every module is side-effect free, so these are what a tree-shaking
bundler actually includes.

| Import                                    | Minified |  min + gzip |
| ----------------------------------------- | -------: | ----------: |
| `@harf/react` — provider + hooks only     |  2.98 KB | **1.13 KB** |
| `@harf/core` — mirroring registry only    |  8.66 KB |     2.94 KB |
| `@harf/core` — numerals only              |  8.94 KB |     3.12 KB |
| `@harf/core` — direction + logical styles | 10.13 KB |     3.69 KB |
| `@harf/core` — currency only              | 10.08 KB |     3.70 KB |
| `@harf/core` — bidi isolation only        | 12.02 KB |     4.67 KB |
| `@harf/core` — everything                 | 21.17 KB |     8.03 KB |
| `@harf/react` — everything                | 22.97 KB |     8.23 KB |
| `@harf/native` — everything               | 29.44 KB |    10.42 KB |
| `@harf/fonts`                             |  3.79 KB |     1.36 KB |

`@harf/core` has **zero runtime dependencies** and always will. `react` is an
optional peer for the `@harf/core/react` subpath only.

## Packages

| Package                                           | Description                                          |
| ------------------------------------------------- | ---------------------------------------------------- |
| [`@harf/core`](./packages/core)                   | Framework-agnostic logic. Zero runtime dependencies. |
| [`@harf/react`](./packages/react)                 | React adapter for the web                            |
| [`@harf/native`](./packages/native)               | React Native adapter                                 |
| [`@harf/next`](./packages/next)                   | Next.js App Router adapter                           |
| [`@harf/eslint-plugin`](./packages/eslint-plugin) | Lint rules with autofix                              |
| [`@harf/fonts`](./packages/fonts)                 | Arabic font metric presets                           |

## Status

Pre-alpha, not yet published to npm. 578 tests across six packages; `@harf/core`
is at 98% line and 100% function coverage with thresholds enforced in CI.

Every claim on this page is backed by a test. If you find one that is not,
[that is a bug](./CONTRIBUTING.md) and the most useful issue you can open.

## Development

Requires Node ≥ 20.11 and pnpm ≥ 9.

```bash
pnpm install
pnpm build && pnpm test
pnpm size          # regenerate the weight table
pnpm docs:limits   # regenerate the limits table
```

## License

[MIT](./LICENSE)
