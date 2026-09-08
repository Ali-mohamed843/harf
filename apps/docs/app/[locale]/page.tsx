import Link from 'next/link';
import { getDirection } from '@harf/next/server';
import { LIMITS } from '@harf/native/limits';
import { formatCurrency } from '@harf/core';

export default function OverviewPage({ params }: { params: { locale: string } }) {
  // A *server* component. There is no React context here — getDirection is how
  // direction reaches this side of the boundary.
  const dir = getDirection({ locale: params.locale });

  return (
    <>
      <h1>An RTL and Arabic toolkit for React Native and Next.js</h1>
      <p>
        Switch language without restarting the app. 8&nbsp;KB. Zero runtime dependencies.
      </p>

      <div className="card">
        <h3>This page proves one of the claims</h3>
        <p>
          The <code>dir</code> attribute on <code>&lt;html&gt;</code> was resolved in a
          server component, before any HTML was streamed. View source: it is already{' '}
          <code>{dir}</code>. Nothing sets it after hydration, so no frame is ever painted
          in the wrong direction.
        </p>
        <pre>{`// app/[locale]/layout.tsx
import { htmlDirectionProps } from '@harf/next/server';

<html {...htmlDirectionProps(locale)}>`}</pre>
      </div>

      <p>
        <Link className="button" href={`/${params.locale}/playground`}>
          Open the playground
        </Link>
      </p>

      <h2>Deterministic prices</h2>
      <p>
        <code>Intl.NumberFormat</code> gives different output on different engines. These
        strings are identical everywhere, and rendered here on the server:
      </p>
      <table>
        <tbody>
          {(
            [
              ['EGP', 1250.5],
              ['SAR', 1250.5],
              ['KWD', 19.5],
              ['AED', 1250.5],
            ] as const
          ).map(([code, value]) => (
            <tr key={code}>
              <td className="mono">{code}</td>
              <td style={{ unicodeBidi: 'isolate' }}>{formatCurrency(value, code)}</td>
              <td className="hint">{code === 'KWD' ? 'three decimal places' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>The honest limits table</h2>
      <p>
        Some React Native components are laid out by native code that reads{' '}
        <code>I18nManager.isRTL</code> and cannot be corrected from JavaScript. This table
        is imported from <code>@harf/native</code>, so it cannot disagree with the README.
      </p>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Status</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {LIMITS.map((limit) => (
            <tr key={limit.subject}>
              <td>{limit.subject}</td>
              <td className={`status-${limit.status}`}>{limit.status}</td>
              <td>
                <span className="badge">{limit.evidence}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        Rows marked <code>unverified</code> have not been reproduced on a device. They are
        recorded so the table is complete, not because they are established.
      </p>
    </>
  );
}
