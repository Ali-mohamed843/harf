# @harf/core

## 0.1.0

### Minor Changes

- [`51e9872`](https://github.com/Ali-mohamed843/harf/commit/51e987206d03ce5e241c15cbe0e1004450a50adf) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Implement the core: direction resolution, logical style transform, bidi
  isolation, numerals, dates, deterministic currency, and the mirroring registry.

  **Logical styles.** `resolveStyle` and `createStyles` turn logical properties
  into physical ones at render time rather than at module load, which is what
  lets a React Native app change direction without a restart. Resolution is
  memoised per direction by object identity: a style object is resolved exactly
  once per direction however many times it renders, and a style with nothing
  logical in it is returned by reference so React Native's style diffing still
  sees an unchanged object.

  **Bidi isolation.** `isolate`, `isolateIfNeeded`, `autoIsolate` and
  `findBidiRuns`. The auto-detection handles the cases that break naive
  implementations: trailing digits stay with the brand name, trailing punctuation
  does not, bracket pairs are never half-enclosed, phone numbers are found
  despite containing no strong character at all, and URLs are isolated whole so
  they survive copy and paste. `autoIsolate` is idempotent.

  **Numerals.** `ar-EG` defaults to Western digits, deliberately and documented.
  `isCopySensitive` flags values a machine will parse or a human will copy.

  **Currency.** `formatCurrency` is byte-identical on every engine, covers the
  three-decimal currencies (KWD, BHD, OMR, JOD, TND, IQD), and never uses
  parentheses for negatives because parentheses mirror. `intlCurrencyReference`
  shows what the platform would have done instead.

  **Dates.** `formatHijriDate` defaults to `islamic-umalqura` and returns `null`
  rather than a silently-Gregorian string when the engine lacks the data —
  `Intl` falls back without throwing, so "it did not throw" is not evidence.

  **Mirroring.** A curated registry with a written reason for every exclusion.
  Unknown icons are left alone.

  `@harf/core/testing` ships `findPhysicalProperties`, `createRenderBoth`, and
  two matchers: one that fails on physical properties in a source sheet, one that
  fails on unresolved logical properties in rendered output.

  387 tests. 98.75% lines, 100% functions. 7.96 KB min+gzip for the whole
  package, 2.9-4.6 KB for a typical tree-shaken import. Still zero runtime
  dependencies.

- [`12dbfc1`](https://github.com/Ali-mohamed843/harf/commit/12dbfc1764b3e7ec52259f3e60afb4de24ac8a79) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Add the React and React Native adapters.

  `@harf/core/react` holds the direction context, provider and hooks that both
  adapters share, so there is exactly one context in a process — a
  react-native-web app, or a monorepo sharing component code between web and
  native, would otherwise get two and a `useDirection()` that silently returns
  the default. `react` is an optional peer dependency of `@harf/core`; it stays
  out of `dependencies`, so the zero-runtime-dependency rule still holds.

  `@harf/native` switches direction **without an app restart**. `DirectionProvider`
  holds the direction in React state and logical styles resolve at render time,
  so changing language is an ordinary re-render: no reload, no white flash, no
  `I18nManager.forceRTL`. A test asserts component state survives the switch,
  proving nothing remounted, and another asserts Harf never calls `forceRTL` or
  `allowRTL` at all.

  Also in `@harf/native`: `assertHarfConfiguration()`, which warns if you have
  left `I18nManager.isRTL` true (Yoga would reverse rows and Harf would reverse
  them again, cancelling out); `useDirectionalScrollOffset` and
  `useDirectionalIndex` for horizontal pagers, which still start at content
  offset zero — the wrong end — when reversed by style; `useScreenTransition` for
  React Navigation's back button side, transition direction and back-gesture
  edge, expressed as plain numbers so there is no dependency on Reanimated or
  React Navigation.

  `LIMITS` is the honest limits table as data, with an `evidence` column marking
  each row `measured`, `reasoned` or `unverified`. The README table is generated
  from it. A test forbids any row claiming `handled` while marked `unverified`.

  `@harf/react` ships `<Bidi>` using CSS `unicode-bidi: isolate` rather than
  injecting control characters, so copied text and `textContent` are the value
  you passed in. `@harf/native` applies the control characters, because React
  Native has no such CSS property.

  `<Num literal>` on both platforms renders a value untouched and isolated, and
  in development `<Num>` warns before converting the digits of anything that
  looks like a phone number, ID, order reference or OTP.

  The mirroring registry gained the names real icon sets actually ship —
  Ionicons' `chevron-forward`/`chevron-back`, Material's `keyboard-arrow-*`,
  Feather's `chevrons-*` and `corner-*`, Lucide's `circle-chevron-*` — after a
  test caught `chevron-forward` missing.

- [`32947ad`](https://github.com/Ali-mohamed843/harf/commit/32947add397a6b4b3f193048ed0368550a399136) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Initial package scaffolding.

  Establishes the build and release surface for every Harf package: ESM + CJS dual
  output via tsup, a correct `exports` map with per-format type declarations,
  `sideEffects: false`, and `strict: true` TypeScript throughout.

  `@harf/core` ships the direction primitives every other package builds on:
  the `Direction` type, the `DIRECTIONS` tuple for both-direction test matrices,
  `isDirection()` for narrowing untrusted input, and `oppositeDirection()`.
  It has zero runtime dependencies, and will keep it that way.

  `@harf/eslint-plugin` is shaped so that the CommonJS namespace object is itself
  a valid ESLint plugin, which keeps legacy `.eslintrc` resolution working
  alongside flat config's default import.

  No RTL behaviour is implemented yet — see the root README for what is and is
  not built.

### Patch Changes

- [`b0ac301`](https://github.com/Ali-mohamed843/harf/commit/b0ac30188e4e2e7783b112172040c7449e928cda) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Fix five bugs found by property testing.

  A new property-test suite generates ~2400 mixed-script strings and style
  objects from a seeded PRNG and asserts the invariants that must hold for every
  input. It found five defects the example-based tests had missed:

  - **`resolveStyle` was not idempotent.** `flexDirection` is an involution —
    `'row'` becomes `'row-reverse'` under RTL — so resolving an already-resolved
    style flipped the row back and silently laid it out the wrong way. Harf now
    recognises its own output and returns it untouched, in either direction, so
    composing style helpers that each resolve cannot corrupt a layout.
  - **`autoIsolate` was not idempotent in two more ways.** Isolate characters
    change what the scanner sees: a word boundary appears where there was none
    (`…9190www.example.org` gains one before `www`), and a sub-match previously
    swallowed by a longer one becomes visible. `autoIsolate` now analyses the
    text with controls stripped, which makes idempotence structural rather than
    something the scanner has to get right.
  - **Runs could split a surrogate pair**, cutting an astral character such as
    𝐊 in half. A low surrogate now takes the class of the pair it completes.
  - **A closing bracket whose partner sat outside a run stayed inside it**, and a
    URL could swallow a trailing `{`. Both produce an unbalanced bracket inside
    an isolate, and brackets mirror.
  - **Rounding corrupted large numbers.** The epsilon nudge was proportional to
    the scaled magnitude, so `formatNumber(1e15, { decimals: 3 })` was off by
    several hundred. Rounding now shifts the decimal point through the number's
    decimal string, which is exact, and still gets `1.005` → `1.01` right.

  Atomic units are also now matched sequentially rather than collected and
  filtered, so a unit sitting in the gap left by a longer overlapping match is
  found on the first pass.

- [`9d371a4`](https://github.com/Ali-mohamed843/harf/commit/9d371a41a4ac005ad45a2456af548c8c695b5dad) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Add `@harf/native/limits`, and widen `StyleValue`.

  The limits table is now its own entry point with no `react-native` import, so a
  docs site, a build script or anything else that is not a React Native app can
  read it. React Native ships untranspiled Flow that plain Node and a Next.js
  server cannot parse, which previously made the table unreadable outside an app.

  `StyleValue` is now `unknown` rather than a union of the types React Native
  happens to accept. Harf only ever _moves_ a value from one property name to
  another, and guards the two it inspects with a `typeof` check, so the narrower
  type bought no safety while rejecting the `Record<string, unknown>` callers
  naturally have.

- [`6c8898e`](https://github.com/Ali-mohamed843/harf/commit/6c8898eb0b3f22ada4a6dfb34b7462b702b64a15) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Document the whole library, with every claim backed by a test.

  The root README carries the usage guide, the weight table generated by
  `pnpm size`, and the React Native limits table generated by `pnpm docs:limits`
  from `packages/native/src/limits.ts` — so neither can drift from the code.

  `packages/core/src/readme.test.ts` asserts every literal output any README
  states: the headline style resolution, all six rows of the bidi table, the
  currency strings, the numeral conversions, the mirroring decisions, the ten
  font multipliers, the Tailwind before/after pair, and the Next.js server
  helpers. A README claim that stops being true now fails CI.

- [`05e643e`](https://github.com/Ali-mohamed843/harf/commit/05e643edfa243cb617a978518ae1a778f09f2335) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Fix the `exports` map so CommonJS consumers get CommonJS type declarations.

  A single top-level `types` entry under `"."` is interpreted as ESM when
  resolved through the `require` condition, so `require('@harf/core')` under
  `node16`/`nodenext` module resolution received declarations that masquerade as
  ESM. Each package now declares `types` per condition, pointing at
  `./dist/index.d.cts` for `require` and `./dist/index.d.ts` for `import`.

  `publint --strict` and `attw --pack` now run in CI for every package, so this
  class of packaging bug fails the build rather than reaching npm.
