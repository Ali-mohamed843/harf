---
'@harf/eslint-plugin': minor
'@harf/native': minor
'@harf/react': minor
'@harf/fonts': minor
'@harf/core': minor
'@harf/next': minor
---

Initial package scaffolding.

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
