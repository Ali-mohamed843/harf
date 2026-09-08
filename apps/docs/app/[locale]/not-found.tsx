import Link from 'next/link';

/**
 * Lives under the locale segment because that is where the root layout is —
 * every route on this site is `/[locale]/…`, and middleware redirects anything
 * without a locale.
 */
export default function NotFound() {
  return (
    <>
      <h1>Not found</h1>
      <p>
        Nothing here. Try the <Link href="./">overview</Link> or the{' '}
        <Link href="./playground">playground</Link>.
      </p>
    </>
  );
}
