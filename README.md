<div align="center">

# حرف · Harf

**An RTL and Arabic toolkit for React Native and Next.js.**

[![CI](https://github.com/harf-rtl/harf/actions/workflows/ci.yml/badge.svg)](https://github.com/harf-rtl/harf/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

</div>

---

> **Status: pre-alpha, under active construction.**
> Nothing here is published to npm yet. This README documents only what exists
> and has a passing test behind it. Sections marked _not built yet_ are the
> plan, not a promise.

## Why

React and React Native have poor right-to-left support. Most published guidance
on the subject is a list of manual workarounds. Harf is an attempt to replace
those workarounds with a real abstraction, for Arabic first and RTL languages
generally.

Harf deliberately does **not** ship a generic wrapper around logical CSS
properties — Tailwind and modern CSS already do that well. The value is in the
parts that are still unsolved:

| #   | Problem                                                                   | Status          |
| --- | ------------------------------------------------------------------------- | --------------- |
| 1   | Direction switching in React Native without an app restart                | _not built yet_ |
| 2   | Bidirectional text isolation for embedded LTR runs                        | _not built yet_ |
| 3   | Numeral systems (Arabic-Indic / Persian / Western) with copy-safety rules | _not built yet_ |
| 4   | Hijri (`islamic-umalqura`) dates and the Hermes `Intl` gap                | _not built yet_ |
| 5   | Deterministic Arabic currency and number formatting across JS engines     | _not built yet_ |
| 6   | A curated icon mirroring registry (what mirrors, and what must not)       | _not built yet_ |
| 7   | Direction-aware gestures, animation and navigation                        | _not built yet_ |
| 8   | Arabic typography metrics — line height, clipping, fallback chains        | _not built yet_ |
| 9   | ESLint rules with autofix for physical properties and Tailwind classes    | _not built yet_ |
| 10  | Testing utilities — render in both directions, assert no physical props   | _not built yet_ |
| 11  | Server-side `dir` on `<html>` for Next.js App Router, RSC-safe            | _not built yet_ |

An honest limits table for React Native — which native components Harf can fix
from JS and which genuinely require `I18nManager.forceRTL()` plus a restart —
will live here once it is measured rather than assumed. It is a feature, not a
disclaimer.

## Packages

| Package               | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `@harf/core`          | Framework-agnostic logic. **Zero runtime dependencies.** |
| `@harf/react`         | `DirectionProvider`, hooks and components for the web    |
| `@harf/native`        | React Native adapter                                     |
| `@harf/next`          | Next.js App Router adapter                               |
| `@harf/eslint-plugin` | Lint rules with autofix                                  |
| `@harf/fonts`         | Arabic font metric presets                               |

## Repository layout

```
packages/
  core/            @harf/core
  react/           @harf/react
  native/          @harf/native
  next/            @harf/next
  eslint-plugin/   @harf/eslint-plugin
  fonts/           @harf/fonts
apps/
  docs/            Next.js docs site with a live LTR/RTL split playground
  example-native/  Expo app demonstrating every feature
```

## Development

Requires Node >= 20.11 and pnpm >= 9.

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
