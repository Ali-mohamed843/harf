# @harf/next

## 0.1.0

### Minor Changes

- [`cbc8481`](https://github.com/Ali-mohamed843/harf/commit/cbc848176cf97e85e86138a7ae61eb85e1281f50) Thanks [@Ali-mohamed843](https://github.com/Ali-mohamed843)! - Implement the Next.js App Router adapter.

  `@harf/next/server` resolves direction **before any HTML is streamed**, so the
  first painted frame is already correct. A client effect that sets `dir` after
  hydration paints left-to-right first, which is the flash-of-wrong-direction bug
  in most Next.js i18n setups. `htmlDirectionProps(locale)` spreads straight onto
  `<html>`.

  `getDirection()` is the server-side counterpart to `useDirection()`. React
  context does not cross into a server component, and this package does not
  pretend otherwise — the boundary is documented, and `@harf/next/server` imports
  no React at all so it is safe anywhere in an RSC graph.

  `negotiateLocale()` is a small dependency-free `Accept-Language` negotiator
  that honours quality values and falls back from `ar-SA` to `ar-EG` rather than
  dropping to English.

  `@harf/next/tailwind` adds only what Tailwind lacks: `mirror-x`, the
  `bidi-*` utilities, `ltr-island`/`rtl-island`, and `rtl:`/`ltr:` variants. It
  deliberately does not reimplement logical spacing, which Tailwind already ships
  and does well — a test asserts none of `ms-`, `me-`, `ps-`, `pe-` are shadowed.
  The bidi utility is prefixed because Tailwind's own `isolate` is
  `isolation: isolate`, a stacking-context property with nothing to do with text
  direction.

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
  - @harf/react@0.1.0
