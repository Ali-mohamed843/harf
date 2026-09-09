# @harf/native

## 0.1.0

### Minor Changes

- [`5d097cd`](https://github.com/Ali-mohamed843/harf/commit/5d097cd81d4e70997a01f31eafe8cec3663639a4) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Add the ESLint rules and the Arabic font metric presets.

  `@harf/eslint-plugin` ships three rules and two configs:

  - `no-physical-properties` autofixes `marginLeft` to `marginStart`,
    `textAlign: 'left'` to `'start'`, the border-radius corners, and the rest.
    Its scope is deliberately narrow — it fires only inside something it can
    recognise as a style, so it does not flag `{ axis: { left: 0 } }` in a chart
    config. A rule that fires on every object with a `left` key is a rule people
    switch off.
  - `no-physical-tailwind` autofixes `ml-4` to `ms-4` and friends, preserving
    variant prefixes (`md:`, `hover:`, `dark:`), the `!` important modifier, and
    the original whitespace, so a multi-line `className` keeps its formatting. It
    also checks `clsx`/`cn`/`cva` calls and object keys.
  - `require-bidi-isolation` warns on template literals interpolating a value
    into a string containing Arabic. It offers a _suggestion_ rather than an
    autofix, because it cannot know whether the value is Latin and silently
    rewriting on a guess would be worse than a warning. `recommended` sets it to
    `warn`; a heuristic that fails a build is a heuristic that gets deleted.

  `@harf/fonts` ships presets for Cairo, Tajawal, IBM Plex Sans Arabic, Noto
  Naskh Arabic, Noto Sans Arabic, Almarai, Rubik, Amiri, Changa and Lateef, with
  `arabicSafeText()` and `fontFamilyStack()`. Every preset's line-height
  multiplier is above 1.4, because the usual Latin 1.2 clips the tail of ج and
  the dots of ي in all of them. `useArabicSafeText()` is exported from both
  `@harf/react` and `@harf/native`.

  All six packages now resolve cleanly under legacy `moduleResolution: "node"`
  as well, which React Native projects still commonly use.

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

- [`05e643e`](https://github.com/Ali-mohamed843/harf/commit/05e643edfa243cb617a978518ae1a778f09f2335) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Fix the `exports` map so CommonJS consumers get CommonJS type declarations.

  A single top-level `types` entry under `"."` is interpreted as ESM when
  resolved through the `require` condition, so `require('@harf/core')` under
  `node16`/`nodenext` module resolution received declarations that masquerade as
  ESM. Each package now declares `types` per condition, pointing at
  `./dist/index.d.cts` for `require` and `./dist/index.d.ts` for `import`.

  `publint --strict` and `attw --pack` now run in CI for every package, so this
  class of packaging bug fails the build rather than reaching npm.

- Updated dependencies [[`b0ac301`](https://github.com/Ali-mohamed843/harf/commit/b0ac30188e4e2e7783b112172040c7449e928cda), [`51e9872`](https://github.com/Ali-mohamed843/harf/commit/51e987206d03ce5e241c15cbe0e1004450a50adf), [`5d097cd`](https://github.com/Ali-mohamed843/harf/commit/5d097cd81d4e70997a01f31eafe8cec3663639a4), [`9d371a4`](https://github.com/Ali-mohamed843/harf/commit/9d371a41a4ac005ad45a2456af548c8c695b5dad), [`6c8898e`](https://github.com/Ali-mohamed843/harf/commit/6c8898eb0b3f22ada4a6dfb34b7462b702b64a15), [`12dbfc1`](https://github.com/Ali-mohamed843/harf/commit/12dbfc1764b3e7ec52259f3e60afb4de24ac8a79), [`05e643e`](https://github.com/Ali-mohamed843/harf/commit/05e643edfa243cb617a978518ae1a778f09f2335), [`32947ad`](https://github.com/Ali-mohamed843/harf/commit/32947add397a6b4b3f193048ed0368550a399136)]:
  - @harf/core@0.1.0
  - @harf/fonts@0.1.0
