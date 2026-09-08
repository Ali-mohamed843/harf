---
'@harf/core': minor
---

Implement the core: direction resolution, logical style transform, bidi
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
