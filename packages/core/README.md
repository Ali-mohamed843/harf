# @harf/core

Framework-agnostic RTL and Arabic logic. **Zero runtime dependencies** — the
`dependencies` field is empty and a PR that adds one will be closed.

**8.03 KB** min+gzip for everything; 2.9–4.7 KB for a typical tree-shaken
import. Every module is side-effect free.

```bash
pnpm add @harf/core
```

## Direction

```ts
import { directionForLocale, isDirection, directionSign } from '@harf/core';

directionForLocale('ar-EG'); // 'rtl'
directionForLocale('ku-Latn'); // 'ltr' — the script subtag wins
isDirection(fromCookie); // narrows unknown → Direction
40 * directionSign('rtl'); // -40
```

## Logical styles

The mechanism behind no-restart direction switching. Nothing is baked in at
module load, so a direction change is an ordinary re-render.

```ts
import { createStyles } from '@harf/core';

const styles = createStyles({
  row: { flexDirection: 'row', paddingStart: 16, borderTopStartRadius: 12 },
});

styles('ltr').row; // { flexDirection: 'row',         paddingLeft: 16,  borderTopLeftRadius: 12 }
styles('rtl').row; // { flexDirection: 'row-reverse', paddingRight: 16, borderTopRightRadius: 12 }

styles('rtl') === styles('rtl'); // true — memoised, so React.memo still holds
```

A hand-written physical property always wins, so your escape hatch is never
silently overwritten:

```ts
resolveStyle({ marginStart: 8, marginLeft: 99 }, 'rtl'); // { marginLeft: 99, marginRight: 8 }
```

## Bidi isolation

```ts
import { isolate, autoIsolate, stripBidi, findBidiRuns } from '@harf/core';

isolate('Karnak Holidays 2026'); // wrapped in U+2068 … U+2069
autoIsolate('مرحبا بك في Karnak 2026 اليوم'); // finds the runs itself
stripBidi(x); // always reversible

findBidiRuns('اتصل على +20 114 919 9190 الآن');
// [{ text: '+20 114 919 9190', reason: 'atomic', start: 9, end: 25 }]
```

Isolate characters are invisible but real and **are copied with the text**. Use
them at render time only; never store, compare or transmit an isolated string.

## Numerals

```ts
import { toArabicDigits, toWesternDigits, numeralSystemForLocale } from '@harf/core';

toArabicDigits(2026); // '٢٠٢٦'
Number('٢٠٢٦'); // NaN
Number(toWesternDigits('٢٠٢٦')); // 2026

numeralSystemForLocale('ar-EG'); // 'western' — deliberate, see the docs
numeralSystemForLocale('fa-IR'); // 'persian'
```

`isCopySensitive(value)` flags phone numbers, IDs, IBANs and OTPs — values whose
digits must never be converted.

## Numbers, currency, dates

```ts
import { formatCurrency, formatNumber, formatHijriDate } from '@harf/core';

formatNumber(1.005, { decimals: 2 }); // '1.01'  — (1.005).toFixed(2) is '1.00'
formatCurrency(19.5, 'KWD'); // '19.500 د.ك' — three decimals
formatHijriDate(new Date()); // Umm al-Qura, or null if unsupported
```

Deterministic across every JavaScript engine, because it does its own grouping
and rounding rather than delegating to `Intl`.

## Mirroring

```ts
import { shouldMirror, mirrorIf, createMirrorRegistry } from '@harf/core';

shouldMirror('chevron-forward', 'rtl'); // true
shouldMirror('clock', 'rtl'); // false — a clock face never mirrors
shouldMirror('anything-unknown', 'rtl'); // false — the safe default

mirrorIf('rtl'); // { transform: [{ scaleX: -1 }] } — a frozen singleton
```

## Subpaths

| Import               | Contents                                                                                             |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `@harf/core`         | Everything above                                                                                     |
| `@harf/core/react`   | `DirectionProvider`, `useDirection`, `useLogicalStyles`. `react` is an **optional** peer dependency. |
| `@harf/core/testing` | `findPhysicalProperties`, `createRenderBoth`, and two custom matchers                                |

## License

[MIT](./LICENSE)
