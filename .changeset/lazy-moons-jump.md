---
'@harf/next': minor
---

Implement the Next.js App Router adapter.

`@harf/next/server` resolves direction **before any HTML is streamed**, so the
first painted frame is already correct. A client effect that sets `dir` after
hydration paints left-to-right first, which is the flash-of-wrong-direction bug
in most Next.js i18n setups. `htmlDirectionProps(locale)` spreads straight onto
`<html>`.

`getDirection()` is the server-side counterpart to `useDirection()`. React
context does not cross into a server component, and this package does not
pretend otherwise — the boundary is documented, and `@harf/next/server` imports
no React at all so it is safe anywhere in an RSC graph.

`negotiateLocale()` is a small dependency-free `Accept-Language` negotiator
that honours quality values and falls back from `ar-SA` to `ar-EG` rather than
dropping to English.

`@harf/next/tailwind` adds only what Tailwind lacks: `mirror-x`, the
`bidi-*` utilities, `ltr-island`/`rtl-island`, and `rtl:`/`ltr:` variants. It
deliberately does not reimplement logical spacing, which Tailwind already ships
and does well — a test asserts none of `ms-`, `me-`, `ps-`, `pe-` are shadowed.
The bidi utility is prefixed because Tailwind's own `isolate` is
`isolation: isolate`, a stacking-context property with nothing to do with text
direction.
