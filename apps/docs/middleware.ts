import { NextResponse, type NextRequest } from 'next/server';
import { negotiateLocale } from '@harf/next/server';

const LOCALES = ['en', 'ar'];

/**
 * Every route lives under a locale segment, so `/` has to become one.
 *
 * `negotiateLocale` picks from the browser's Accept-Language header, honouring
 * quality values and falling back from `ar-SA` to the `ar` this site supports
 * rather than dropping to English.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = negotiateLocale(request.headers.get('accept-language'), LOCALES);
  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\..*).*)'],
};
