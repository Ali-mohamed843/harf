import type { Metadata } from 'next';
import Link from 'next/link';
import { htmlDirectionProps } from '@harf/next/server';
import { DirectionProvider } from '@harf/next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Harf · RTL and Arabic toolkit',
  description:
    'An RTL and Arabic toolkit for React Native and Next.js. Switch language without restarting the app.',
};

/** The locales this site is built for. Anything else 404s. */
export const LOCALES = ['en', 'ar'] as const;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * The whole point of `@harf/next/server`.
 *
 * `dir` is resolved here, in a server component, before a single byte of HTML
 * is streamed. View source on any page of this site and the attribute is
 * already correct — there is no client effect setting it after hydration, and
 * therefore no frame painted in the wrong direction.
 *
 * `<DirectionProvider>` below it is for the *client* components: React context
 * does not cross into a server component, so the two are separate on purpose.
 */
export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  return (
    <html {...htmlDirectionProps(locale)}>
      <body>
        <DirectionProvider locale={locale}>
          <main>
            <header className="header">
              <strong style={{ fontSize: '1.1rem' }}>حرف · Harf</strong>
              <nav className="nav">
                <Link href={`/${locale}`}>Overview</Link>
                <Link href={`/${locale}/playground`}>Playground</Link>
                <Link
                  className="button ghost"
                  href={locale === 'ar' ? '/en' : '/ar'}
                  prefetch={false}
                >
                  {locale === 'ar' ? 'English' : 'العربية'}
                </Link>
              </nav>
            </header>
            {children}
          </main>
        </DirectionProvider>
      </body>
    </html>
  );
}
