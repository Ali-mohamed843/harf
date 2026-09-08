'use client';

import { useMemo, useState } from 'react';
import { resolveStyle, type Direction, type StyleObject } from '@harf/core';

const DEFAULT_STYLE = `{
  "display": "flex",
  "flexDirection": "row",
  "alignItems": "center",
  "gap": 12,
  "paddingStart": 16,
  "paddingEnd": 8,
  "paddingBlock": 12,
  "borderStartWidth": 4,
  "borderStartColor": "#38bdf8",
  "borderStartStyle": "solid",
  "borderTopStartRadius": 14,
  "borderBottomStartRadius": 14,
  "textAlign": "start",
  "background": "#1d2740"
}`;

const DEFAULT_TEXT = 'مرحبا بك في Karnak Holidays 2026';

/**
 * A style key whose *name* changes with direction but which `resolveStyle` does
 * not know about, because it is CSS-only and has no React Native equivalent.
 *
 * `@harf/core` deliberately models the React Native property set. On the web
 * you would normally just write the CSS logical property and let the browser
 * do it; the playground resolves these too so the two panes stay comparable.
 */
const CSS_ONLY: Readonly<Record<string, readonly [string, string]>> = {
  paddingInline: ['paddingInline', 'paddingInline'],
  paddingBlock: ['paddingBlock', 'paddingBlock'],
  borderStartStyle: ['borderLeftStyle', 'borderRightStyle'],
  borderEndStyle: ['borderRightStyle', 'borderLeftStyle'],
};

function resolveForCss(style: StyleObject, dir: Direction): Record<string, unknown> {
  const index = dir === 'ltr' ? 0 : 1;
  const cssOnly: Record<string, unknown> = {};
  const rest: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(style)) {
    const mapping = CSS_ONLY[key];
    if (mapping === undefined) rest[key] = value;
    else cssOnly[mapping[index] as string] = value;
  }

  return { ...(resolveStyle(rest, dir) as Record<string, unknown>), ...cssOnly };
}

interface ParseResult {
  readonly style: StyleObject | null;
  readonly error: string | null;
}

function parse(source: string): ParseResult {
  try {
    const value: unknown = JSON.parse(source);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { style: null, error: 'Expected a JSON object.' };
    }
    return { style: value as StyleObject, error: null };
  } catch (error) {
    return {
      style: null,
      error: error instanceof Error ? error.message : 'Could not parse that.',
    };
  }
}

/**
 * The live split playground.
 *
 * Both panes render from the *same* source object. Nothing is duplicated and
 * nothing is hand-mirrored: the only difference between them is the direction
 * passed to `resolveStyle`. Edit the style and both update.
 *
 * The editor takes JSON rather than JavaScript on purpose — a docs site that
 * evaluates arbitrary code typed into a text box is a docs site with a
 * cross-site scripting hole in it.
 */
export function Playground() {
  const [source, setSource] = useState(DEFAULT_STYLE);
  const [text, setText] = useState(DEFAULT_TEXT);

  const { style, error } = useMemo(() => parse(source), [source]);

  return (
    <>
      <div className="card">
        <h3>Style</h3>
        <p className="hint">
          Edit this and watch both panes below. Try changing <code>paddingStart</code>, or
          adding <code>marginEnd</code>.
        </p>
        <textarea
          value={source}
          spellCheck={false}
          aria-label="Logical style object, as JSON"
          onChange={(event) => setSource(event.target.value)}
        />
        {error === null ? null : <p className="error">{error}</p>}

        <h3 style={{ marginBlockStart: 16 }}>Text</h3>
        <input
          type="text"
          value={text}
          aria-label="Sample text"
          onChange={(event) => setText(event.target.value)}
        />
      </div>

      <div className="split">
        {(['ltr', 'rtl'] as const).map((dir) => (
          <Pane key={dir} dir={dir} style={style} text={text} />
        ))}
      </div>

      {style === null ? null : (
        <div className="card">
          <h3>What Harf resolved it to</h3>
          <div className="split">
            {(['ltr', 'rtl'] as const).map((dir) => (
              <div key={dir}>
                <p className="pane-label">{dir}</p>
                <pre>{JSON.stringify(resolveForCss(style, dir), null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Pane({
  dir,
  style,
  text,
}: {
  dir: Direction;
  style: StyleObject | null;
  text: string;
}) {
  const resolved = style === null ? {} : resolveForCss(style, dir);

  return (
    <div className="pane" dir={dir}>
      <p className="pane-label">{dir}</p>
      <div className="preview-box">
        <div style={resolved as React.CSSProperties}>
          <span
            aria-hidden
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: '#38bdf8',
              flexShrink: 0,
            }}
          />
          <span style={{ unicodeBidi: 'isolate' }}>{text}</span>
        </div>
      </div>
    </div>
  );
}
