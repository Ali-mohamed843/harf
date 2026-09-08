# @harf/fonts

Arabic font metric presets.

```bash
pnpm add @harf/fonts
```

## The problem

Arabic typefaces carry taller ascenders and deeper descenders than Latin faces —
the script needs room for stacked diacritics above and the descending bowls of
ج ح خ ع غ م ه below. Two consequences, both visible in almost every bilingual
app:

1. **They render visually smaller at the same `fontSize`.**
2. **They clip against a `lineHeight` that is fine for Latin.** The common
   `lineHeight: fontSize * 1.2` cuts the tail off ج and the dots off ي.

## Usage

```ts
import { arabicSafeText, fontFamilyStack, metricsFor } from '@harf/fonts';

arabicSafeText({ family: 'Cairo', fontSize: 16 });
// { fontSize: 16, lineHeight: 28, paddingVertical: 1.6,
//   fontFamily: 'Cairo, Inter, "Helvetica Neue", Arial, sans-serif' }

// The naive value that clips:
const wrong = 16 * 1.2; // 19.2
```

Or as a hook, from either adapter:

```tsx
import { useArabicSafeText } from '@harf/react'; // or '@harf/native'

const style = useArabicSafeText({ family: 'Cairo', fontSize: 16 });
```

## Families

| Family               | lineHeight × | Note                                                                |
| -------------------- | -----------: | ------------------------------------------------------------------- |
| Rubik                |         1.50 | One family covering both scripts, so metrics match exactly          |
| Tajawal              |         1.60 | Renders slightly small; nudge the size up beside Latin              |
| IBM Plex Sans Arabic |         1.60 | Designed alongside its Latin sibling — the safest bilingual pairing |
| Changa               |         1.65 | Display-leaning; good for headings                                  |
| Almarai              |         1.70 | Geometric and even in colour                                        |
| Noto Sans Arabic     |         1.70 | Forgiving vertically                                                |
| Cairo                |         1.75 | The most common choice in Egyptian product work                     |
| Noto Naskh Arabic    |         2.00 | Traditional Naskh; 1.2 will clip badly                              |
| Lateef               |         2.00 | Extended Arabic for Urdu, Sindhi, Persian; renders small            |
| Amiri                |         2.10 | A book face for long-form text; not a UI font                       |

Every multiplier is derived from the family's published vertical metrics,
rounded up. They are **safe** values, not beautiful ones: they guarantee no
clipping at any size, and a designer may well tighten one for a specific size
and weight.

An unlisted family falls back to a deliberately generous default — an unfamiliar
Arabic face is far likelier to clip at 1.4 than to look loose at 1.7, and
clipping is the worse failure.

## Fallback chains

```ts
fontFamilyStack('Cairo');
// 'Cairo, Inter, "Helvetica Neue", Arial, sans-serif'
```

Order is load-bearing. A browser uses the **first** family with a glyph for each
character, so the Arabic family goes first and Latin runs fall through to Latin
fallbacks chosen to match its metrics. A Latin family placed first would serve
the Arabic too — badly — on any system where it happens to have coverage.

React Native takes a single `fontFamily` rather than a stack, so
`useArabicSafeText` there returns only the Arabic family. For mixed-script text
on React Native, load a family with real Latin coverage: IBM Plex Sans Arabic or
Rubik.

## License

[MIT](./LICENSE)
