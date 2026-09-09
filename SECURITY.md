# Security policy

## Supported versions

Harf is pre-1.0. Only the latest published minor is supported; there are no
backports to earlier ones yet.

| Version        | Supported |
| -------------- | --------- |
| latest `0.x`   | yes       |
| anything older | no        |

## Reporting a vulnerability

**Do not open a public issue.**

Use GitHub's private reporting — the **Security** tab of this repository, then
**Report a vulnerability**. It goes only to the maintainers and gives us a
private place to work on a fix with you.

Please include the affected package and version, what an attacker can do, and a
reproduction if you have one.

You should get an acknowledgement within a few days. If a report is accepted we
will agree a disclosure timeline with you, credit you in the advisory unless
you would rather not be, and publish a fixed release before the advisory goes
public.

## What counts

Harf is a layout and text-formatting library. It has no network access, no
filesystem access, and no runtime dependencies in `@harf/core`. The realistic
attack surface is narrow, but these are all in scope:

- **Regular-expression denial of service.** `autoIsolate`, `findBidiRuns` and
  the ESLint rules run patterns over caller-supplied strings. An input that
  makes one of them take superlinear time is a valid report, and a useful one.
- **Crashes or unbounded memory** from any input to a public function. Every
  such function is expected to return or throw, not hang.
- **Bidi text used to mislead.** Harf _inserts_ Unicode isolate characters by
  design, and the documentation is explicit that isolated strings must not be
  stored or transmitted. A case where Harf inserts controls somewhere the
  documentation says it will not — or where `stripBidi` fails to remove what
  Harf added — is in scope. So is any path where the rendered text differs
  misleadingly from the underlying value.
- **Supply chain.** Anything wrong in what we publish: an unexpected file in a
  tarball, a build script that runs at install time (there are none), or a
  dependency that should not be there.

## What does not

- The **Trojan Source** class of attack (CVE-2021-42574), where bidi controls
  in _source code_ make it read differently from how it compiles. That is a
  real problem, but it is your editor's and your linter's to catch, not
  Harf's — and Harf's `stripBidi` is a useful tool against it.
- A rendering difference caused by the platform's own text engine, a font, or
  `I18nManager`. The README's limits table says what Harf can and cannot
  control; a row being wrong is a bug report, not a security report.
- Anything in `apps/docs` or `apps/example-native`. They are demonstrations and
  are not published.

## Verifying what you installed

Every release is published from CI with npm provenance, so you can check that a
tarball was built from this repository:

```bash
npm audit signatures
```
