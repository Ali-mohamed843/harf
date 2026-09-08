## What

<!-- One or two sentences. What does this change do? -->

## Why

<!-- What RTL or Arabic problem does it solve? Link the issue if there is one. -->

Closes #

## The failing test

<!--
Required for anything claiming to fix a bug. Point at the test and say what it
asserts. If you removed the fix, which assertion fails?
-->

- Test: `packages/…/src/….test.ts`
- Fails without this change because:

## Checklist

- [ ] Conventional commit messages (`feat(core): …`), scope from the allowed list
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` all pass locally
- [ ] Added a changeset (`pnpm changeset`) if `packages/**` changed
- [ ] No `any` in a public API surface
- [ ] `@harf/core` still has zero runtime dependencies
- [ ] Every new public function has a TSDoc comment with a runnable example
- [ ] Tests assert against **both** directions, not just the one being fixed
- [ ] Any new README claim is backed by a test linked above

## Limits

<!--
If this touches React Native, does it change the honest limits table in the
README? Say so explicitly, including "no change".
-->

## Screenshots

<!-- Required for layout, mirroring, and typography changes. LTR and RTL, side by side. -->
