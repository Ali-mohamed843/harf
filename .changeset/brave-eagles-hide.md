---
'@harf/core': patch
---

Fix five bugs found by property testing.

A new property-test suite generates ~2400 mixed-script strings and style
objects from a seeded PRNG and asserts the invariants that must hold for every
input. It found five defects the example-based tests had missed:

- **`resolveStyle` was not idempotent.** `flexDirection` is an involution —
  `'row'` becomes `'row-reverse'` under RTL — so resolving an already-resolved
  style flipped the row back and silently laid it out the wrong way. Harf now
  recognises its own output and returns it untouched, in either direction, so
  composing style helpers that each resolve cannot corrupt a layout.
- **`autoIsolate` was not idempotent in two more ways.** Isolate characters
  change what the scanner sees: a word boundary appears where there was none
  (`…9190www.example.org` gains one before `www`), and a sub-match previously
  swallowed by a longer one becomes visible. `autoIsolate` now analyses the
  text with controls stripped, which makes idempotence structural rather than
  something the scanner has to get right.
- **Runs could split a surrogate pair**, cutting an astral character such as
  𝐊 in half. A low surrogate now takes the class of the pair it completes.
- **A closing bracket whose partner sat outside a run stayed inside it**, and a
  URL could swallow a trailing `{`. Both produce an unbalanced bracket inside
  an isolate, and brackets mirror.
- **Rounding corrupted large numbers.** The epsilon nudge was proportional to
  the scaled magnitude, so `formatNumber(1e15, { decimals: 3 })` was off by
  several hundred. Rounding now shifts the decimal point through the number's
  decimal string, which is exact, and still gets `1.005` → `1.01` right.

Atomic units are also now matched sequentially rather than collected and
filtered, so a unit sitting in the gap left by a longer overlapping match is
found on the first pass.
