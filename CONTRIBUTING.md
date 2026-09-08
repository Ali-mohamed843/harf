# Contributing to Harf

Thanks for wanting to help. Harf is an RTL and Arabic toolkit, and the most
valuable contributions are usually _evidence_: a reproduction of a real bug in a
real Arabic app, on a specific version of React Native or Next.js.

## Ground rules

1. **Every module that claims to fix a bug ships a test that fails without the
   fix.** No exceptions. If you cannot write a failing test, we probably do not
   understand the bug yet.
2. **If a claimed bug does not reproduce on current versions, say so.** Open an
   issue with what you tested and on which versions. We would rather delete a
   feature than document a fix for a bug that no longer exists — the README's
   credibility is the whole asset.
3. **No `any` in a public API surface.** `strict: true` everywhere.
4. **`@harf/core` has zero runtime dependencies.** A PR that adds one will be
   closed. Adapters may take peer dependencies.

## Setup

Requires Node >= 20.11 and pnpm >= 9.

```bash
pnpm install
pnpm build
pnpm test
```

Useful commands:

| Command              | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `pnpm build`         | Build every package with tsup                            |
| `pnpm test`          | Run the full Vitest suite                                |
| `pnpm test:watch`    | Watch mode across all packages                           |
| `pnpm test:coverage` | Coverage report (`@harf/core` must stay above 90% lines) |
| `pnpm typecheck`     | `tsc --noEmit` across the workspace                      |
| `pnpm lint`          | ESLint                                                   |
| `pnpm format`        | Prettier write                                           |

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org/). Commit
messages are linted in CI.

```
feat(core): add bidi isolation for embedded LTR runs
fix(native): resolve borderTopStartRadius under rtl
docs(readme): correct the ScrollView paging limit
```

Allowed scopes: `core`, `react`, `native`, `next`, `eslint-plugin`, `fonts`,
`docs`, `example-native`, `repo`, `ci`, `deps`, `release`.

## Changesets

Any change to a published package needs a changeset:

```bash
pnpm changeset
```

Pick the affected packages, pick a bump, and describe the change the way a
consumer would want to read it in a changelog. CI will fail a PR that touches
`packages/**` without one.

## Pull requests

- One milestone or one logical change per PR. Do not batch.
- CI (typecheck, lint, test, build, commitlint) must pass before merge.
- Tests for RTL behaviour should assert against **both** directions, not just
  the one you were fixing.
- If you add a documented claim to a README, link the test that proves it.

## Testing notes

- Web and core: Vitest.
- React Native: `@testing-library/react-native`.
- When testing bidirectional text, use real strings. Contrived ASCII stand-ins
  hide exactly the bugs we care about. Good cases include brand names, phone
  numbers such as `+20 114 919 9190`, email addresses, filenames and URLs
  embedded in Arabic sentences.

## Reporting a bug

Include:

- The exact versions of React, React Native / Next.js, and the platform.
- A minimal reproduction.
- What you expected, and a screenshot if it is a layout or typography issue.
- Whether `I18nManager.isRTL` was `true` or `false` at the time.

## Code of Conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
