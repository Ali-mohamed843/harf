---
'@harf/eslint-plugin': patch
'@harf/native': patch
'@harf/react': patch
'@harf/fonts': patch
'@harf/core': patch
'@harf/next': patch
---

Fix the `exports` map so CommonJS consumers get CommonJS type declarations.

A single top-level `types` entry under `"."` is interpreted as ESM when
resolved through the `require` condition, so `require('@harf/core')` under
`node16`/`nodenext` module resolution received declarations that masquerade as
ESM. Each package now declares `types` per condition, pointing at
`./dist/index.d.cts` for `require` and `./dist/index.d.ts` for `import`.

`publint --strict` and `attw --pack` now run in CI for every package, so this
class of packaging bug fails the build rather than reaching npm.
