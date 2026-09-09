# @harf/fonts

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
