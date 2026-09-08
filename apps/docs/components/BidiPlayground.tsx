'use client';

import { Fragment, useMemo, useState } from 'react';
import { autoIsolate, findBidiRuns, stripBidi, type Direction } from '@harf/core';

const SAMPLES: readonly string[] = [
  'مرحبا بك في Karnak Holidays 2026 اليوم',
  'اتصل على +20 114 919 9190 الآن',
  'راسلنا على ali@karnak-holidays.com لأي استفسار',
  'زوروا https://karnak-holidays.com/عروض?ref=ar الآن',
  'المنتجات: iPhone 15 Pro، Galaxy S24، وشاومي Redmi Note 13',
  'اشتر (Karnak Pro) الآن',
];

/**
 * Shows what `autoIsolate` found and what difference it makes.
 *
 * The "before" pane is the raw string in an RTL paragraph — which is what most
 * Arabic apps render today. The "after" pane is the same string through
 * `autoIsolate`. On a run with digits or punctuation at its edges, the two
 * differ visibly.
 */
export function BidiPlayground() {
  const [text, setText] = useState(SAMPLES[0] as string);
  const [base, setBase] = useState<Direction>('rtl');

  const runs = useMemo(() => findBidiRuns(text, { base }), [text, base]);
  const isolated = useMemo(() => autoIsolate(text, { base }), [text, base]);
  const reversible = stripBidi(isolated) === text;

  return (
    <>
      <div className="card">
        <h3>Text</h3>
        <input
          type="text"
          value={text}
          aria-label="Text to isolate"
          onChange={(event) => setText(event.target.value)}
        />

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBlockStart: 12,
          }}
        >
          {SAMPLES.map((sample, index) => (
            <button
              key={sample}
              className="button ghost"
              style={{ fontSize: '0.8rem', padding: '6px 10px' }}
              onClick={() => setText(sample)}
            >
              sample {index + 1}
            </button>
          ))}
          <button
            className="button ghost"
            style={{ fontSize: '0.8rem', padding: '6px 10px' }}
            onClick={() => setBase(base === 'rtl' ? 'ltr' : 'rtl')}
          >
            base: {base}
          </button>
        </div>
      </div>

      <div className="split">
        <div className="pane" dir={base}>
          <p className="pane-label">before — raw</p>
          <div className="preview-box">{text}</div>
        </div>
        <div className="pane" dir={base}>
          <p className="pane-label">after — autoIsolate</p>
          <div className="preview-box">{isolated}</div>
        </div>
      </div>

      <div className="card">
        <h3>
          Runs found <span className="badge">{runs.length}</span>
        </h3>
        {runs.length === 0 ? (
          <p className="hint">
            Nothing to isolate — every character reads the same way as the paragraph.
          </p>
        ) : (
          <>
            <p className="runs" style={{ direction: base, color: 'var(--text)' }}>
              {highlight(text, runs)}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Why</th>
                  <th>Offsets</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={`${run.start}-${run.end}`}>
                    <td style={{ unicodeBidi: 'isolate' }}>{run.text}</td>
                    <td>
                      <span className="badge">{run.reason}</span>
                    </td>
                    <td className="mono">
                      {run.start}–{run.end}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <p className={reversible ? 'hint' : 'error'} style={{ marginBlockStart: 12 }}>
          {reversible
            ? 'stripBidi(autoIsolate(text)) === text — losslessly reversible.'
            : 'Not reversible. That is a bug; please report it.'}
        </p>
        <p className="hint">
          The isolate characters are invisible but real, and they are copied with the
          text. Use them at render time only — never store or transmit an isolated string.
        </p>
      </div>
    </>
  );
}

function highlight(
  text: string,
  runs: readonly { start: number; end: number; text: string }[],
): React.ReactNode {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  runs.forEach((run, index) => {
    if (run.start > cursor) nodes.push(text.slice(cursor, run.start));
    nodes.push(<mark key={index}>{run.text}</mark>);
    cursor = run.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));

  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
