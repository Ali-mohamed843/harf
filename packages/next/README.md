# @harf/next

Next.js App Router adapter for Harf.

```bash
pnpm add @harf/core @harf/react @harf/next
```

## No flash of wrong direction

Setting `dir` from a client effect means the first painted frame is
left-to-right. Resolve it on the server, before any HTML is streamed:

```tsx
// app/[locale]/layout.tsx
import { htmlDirectionProps } from '@harf/next/server';
import { DirectionProvider } from '@harf/next';

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  return (
    <html {...htmlDirectionProps(locale)}>
      <body>
        <DirectionProvider locale={locale}>{children}</DirectionProvider>
      </body>
    </html>
  );
}
```

## The RSC boundary

React context does not cross into a server component. Harf does not pretend
otherwise — the two live in separate entry points, so the boundary is enforced
by your imports rather than left to memory.

| Where            | Import              | Use                        |
| ---------------- | ------------------- | -------------------------- |
| Server component | `@harf/next/server` | `getDirection({ locale })` |
| Client component | `@harf/next`        | `useDirection()`           |

`@harf/next/server` imports no React at all, so it is safe anywhere in an RSC
graph.

```tsx
// A server component
import { getDirection } from '@harf/next/server';

export default async function Page({ params }) {
  const { locale } = await params;
  return <article dir={getDirection({ locale })}>…</article>;
}
```

## Locale negotiation

```ts
// middleware.ts
import { negotiateLocale } from '@harf/next/server';

const locale = negotiateLocale(request.headers.get('accept-language'), ['en', 'ar-EG']);
```

Honours quality values, and serves an `ar-SA` browser with `ar-EG` rather than
dropping it to English. If you already use `next-intl`, keep its negotiator —
this exists so a simple app does not have to add one.

## Tailwind plugin

Tailwind already ships logical spacing (`ms-`, `me-`, `ps-`, `pe-`, `start-`,
`end-`, `text-start`, `text-end`) and does it well. This plugin adds only what is
missing.

```js
// tailwind.config.js
const plugin = require('tailwindcss/plugin');
const { harfTailwind } = require('@harf/next/tailwind');

module.exports = { plugins: [plugin(harfTailwind)] };
```

```html
<svg class="rtl:mirror-x">…</svg>
<span class="ltr-island">+20 114 919 9190</span>
<div class="ms-4 rtl:font-arabic">…</div>
```

| Utility                             | CSS                                        |
| ----------------------------------- | ------------------------------------------ |
| `mirror-x` / `mirror-none`          | `transform: scaleX(-1)` / `none`           |
| `bidi-isolate`, `bidi-plaintext`, … | `unicode-bidi: …`                          |
| `dir-ltr` / `dir-rtl`               | `direction: …`                             |
| `ltr-island` / `rtl-island`         | both together                              |
| `rtl:` / `ltr:` variants            | keyed off the `dir` the server already set |

> Tailwind's own `isolate` is `isolation: isolate`, a stacking-context property
> unrelated to text direction. Harf's is `bidi-isolate`, prefixed so the two
> cannot be confused.

For Tailwind v4 or a project without Tailwind, `harfCss()` returns the same
utilities as plain CSS.

## next-intl

Harf handles direction; `next-intl` handles messages. They compose without
adapters — pass the locale `next-intl` already resolved:

```tsx
import { getLocale } from 'next-intl/server';
import { htmlDirectionProps } from '@harf/next/server';

const locale = await getLocale();
<html {...htmlDirectionProps(locale)}>
```

## License

[MIT](./LICENSE)
