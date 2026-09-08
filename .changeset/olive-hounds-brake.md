---
'@harf/eslint-plugin': minor
'@harf/fonts': minor
'@harf/react': minor
'@harf/native': minor
---

Add the ESLint rules and the Arabic font metric presets.

`@harf/eslint-plugin` ships three rules and two configs:

- `no-physical-properties` autofixes `marginLeft` to `marginStart`,
  `textAlign: 'left'` to `'start'`, the border-radius corners, and the rest.
  Its scope is deliberately narrow — it fires only inside something it can
  recognise as a style, so it does not flag `{ axis: { left: 0 } }` in a chart
  config. A rule that fires on every object with a `left` key is a rule people
  switch off.
- `no-physical-tailwind` autofixes `ml-4` to `ms-4` and friends, preserving
  variant prefixes (`md:`, `hover:`, `dark:`), the `!` important modifier, and
  the original whitespace, so a multi-line `className` keeps its formatting. It
  also checks `clsx`/`cn`/`cva` calls and object keys.
- `require-bidi-isolation` warns on template literals interpolating a value
  into a string containing Arabic. It offers a _suggestion_ rather than an
  autofix, because it cannot know whether the value is Latin and silently
  rewriting on a guess would be worse than a warning. `recommended` sets it to
  `warn`; a heuristic that fails a build is a heuristic that gets deleted.

`@harf/fonts` ships presets for Cairo, Tajawal, IBM Plex Sans Arabic, Noto
Naskh Arabic, Noto Sans Arabic, Almarai, Rubik, Amiri, Changa and Lateef, with
`arabicSafeText()` and `fontFamilyStack()`. Every preset's line-height
multiplier is above 1.4, because the usual Latin 1.2 clips the tail of ج and
the dots of ي in all of them. `useArabicSafeText()` is exported from both
`@harf/react` and `@harf/native`.

All six packages now resolve cleanly under legacy `moduleResolution: "node"`
as well, which React Native projects still commonly use.
