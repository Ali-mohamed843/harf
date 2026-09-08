/**
 * `@harf/next/server` — direction for server components.
 *
 * React context does not cross into a server component. A server component
 * cannot call `useDirection()`, and a `<DirectionProvider>` rendered in the
 * root layout is invisible to every server component beneath it. That boundary
 * is real and this module does not pretend otherwise: it derives direction
 * from the request instead.
 *
 * Nothing here imports `react`, so it is safe in any server context.
 *
 * @packageDocumentation
 */

import { directionForLocale, type Direction } from '@harf/core';

/** Options for {@link getDirection}. */
export interface GetDirectionOptions {
  /**
   * The locale to resolve from. In the App Router this is usually the dynamic
   * segment: `app/[locale]/layout.tsx` receives it in `params`.
   */
  readonly locale?: string;
  /** Used when no locale is given or it cannot be parsed. @defaultValue `'ltr'` */
  readonly fallback?: Direction;
}

/**
 * The writing direction for a request, for use in a **server** component.
 *
 * @example In a root layout
 * ```tsx
 * // app/[locale]/layout.tsx
 * import { getDirection } from '@harf/next/server';
 *
 * export default async function RootLayout({
 *   children,
 *   params,
 * }: {
 *   children: React.ReactNode;
 *   params: Promise<{ locale: string }>;
 * }) {
 *   const { locale } = await params;
 *   const dir = getDirection({ locale });
 *
 *   return (
 *     <html lang={locale} dir={dir}>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example In any other server component
 * ```tsx
 * import { getDirection } from '@harf/next/server';
 *
 * export default async function Page({ params }) {
 *   const { locale } = await params;
 *   const dir = getDirection({ locale });
 *   return <article dir={dir}>…</article>;
 * }
 * ```
 */
export function getDirection(options: GetDirectionOptions = {}): Direction {
  const { locale, fallback = 'ltr' } = options;
  if (locale === undefined || locale.length === 0) return fallback;
  return directionForLocale(locale);
}

/** What {@link htmlDirectionProps} returns. */
export interface HtmlDirectionProps {
  readonly lang: string;
  readonly dir: Direction;
}

/**
 * The `lang` and `dir` attributes for `<html>`, resolved on the server.
 *
 * Setting `dir` server-side is the whole point: a client-side effect that adds
 * `dir="rtl"` after hydration produces a visible flash of left-to-right
 * layout on first paint, which is a real and widely reported bug in Next.js
 * i18n setups. This is a plain object of attributes computed before any HTML
 * is streamed, so the very first byte of markup already carries the direction.
 *
 * @example
 * ```tsx
 * // app/[locale]/layout.tsx
 * import { htmlDirectionProps } from '@harf/next/server';
 *
 * export default async function RootLayout({ children, params }) {
 *   const { locale } = await params;
 *   return (
 *     <html {...htmlDirectionProps(locale)} suppressHydrationWarning>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */
export function htmlDirectionProps(
  locale: string,
  fallback: Direction = 'ltr',
): HtmlDirectionProps {
  return { lang: locale, dir: getDirection({ locale, fallback }) };
}

/**
 * Picks the best supported locale for a request's `Accept-Language` header.
 *
 * A small, dependency-free negotiator for the common case. If you already use
 * `@formatjs/intl-localematcher` or `negotiator` through `next-intl`, keep
 * using those — this exists so a simple app does not have to add one.
 *
 * Quality values are honoured, and an exact match beats a language-only match
 * at the same quality.
 *
 * @param header - The raw `Accept-Language` header value.
 * @param supported - Locales your app supports, most preferred first.
 * @returns The best match, or `supported[0]` when nothing matches.
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { negotiateLocale } from '@harf/next/server';
 *
 * const locale = negotiateLocale(
 *   request.headers.get('accept-language'),
 *   ['en', 'ar-EG'],
 * );
 * ```
 */
export function negotiateLocale(
  header: string | null | undefined,
  supported: readonly string[],
): string {
  const fallback = supported[0] ?? 'en';
  if (header === null || header === undefined || header.length === 0) return fallback;

  const requested = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number.parseFloat(q);
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isNaN(quality) ? 0 : quality,
      };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  const lower = supported.map((locale) => locale.toLowerCase());

  // Exact match first, at the highest quality available.
  for (const { tag } of requested) {
    const exact = lower.indexOf(tag);
    if (exact !== -1) return supported[exact] as string;
  }

  // Then language-only: an `ar-SA` request is served by `ar-EG` support.
  for (const { tag } of requested) {
    const language = tag.split('-')[0] ?? '';
    const index = lower.findIndex((locale) => locale.split('-')[0] === language);
    if (index !== -1) return supported[index] as string;
  }

  return fallback;
}

export { directionForLocale };
export type { Direction };
