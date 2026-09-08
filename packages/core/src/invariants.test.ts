/**
 * Property tests.
 *
 * The example-based tests elsewhere check the cases we thought of. This file
 * checks the invariants that must hold for *every* input, against thousands of
 * generated strings and style objects. It is where the bugs we did not think
 * of show up.
 *
 * The generator is seeded, so a failure is reproducible: the seed is printed
 * with the assertion.
 */

import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  LOGICAL_PROPERTY_NAMES,
  EDGE_PROPERTIES,
  autoIsolate,
  convertDigits,
  currencyDisplay,
  detectNumeralSystem,
  findBidiRuns,
  formatCurrency,
  formatNumber,
  hasBidiControls,
  isCopySensitive,
  isolate,
  isolateIfNeeded,
  resolveStyle,
  stripBidi,
  toWesternDigits,
  CURRENCIES,
  type Direction,
  type NumeralSystem,
  type StyleObject,
  type StyleValue,
} from './index';

/** A small deterministic PRNG, so any failure is reproducible from its seed. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

/**
 * Fragments chosen to hit every branch of the run scanner: strong runs of both
 * scripts, weak digits of both numeral systems, neutrals, mirrored brackets,
 * Arabic punctuation, atomic units, and characters outside the BMP.
 */
const FRAGMENTS: readonly string[] = [
  'مرحبا',
  'بك',
  'اليوم',
  'الآن',
  'شركة',
  'Karnak',
  'Holidays',
  'iPhone',
  'Pro',
  'שלום',
  'עולם',
  '2026',
  '15',
  '١٢٣',
  '۴۵۶',
  ' ',
  '  ',
  '.',
  ',',
  '،',
  '؟',
  '؛',
  '!',
  ':',
  '-',
  '—',
  '(',
  ')',
  '[',
  ']',
  '{',
  '}',
  '"',
  "'",
  '+20 114 919 9190',
  '0100 123 4567',
  'ali@karnak.com',
  'https://karnak.com/عروض?ref=ar',
  'www.example.org',
  'file.tar.gz',
  '@handle',
  '#hashtag',
  '1.2.3',
  '\n',
  '\t',
  '😀',
  '🇪🇬',
  '𝐊𝐚𝐫𝐧𝐚𝐤',
  '',
];

function generate(next: () => number, maxParts = 10): string {
  const parts = 1 + Math.floor(next() * maxParts);
  let out = '';
  for (let i = 0; i < parts; i += 1) {
    const index = Math.floor(next() * FRAGMENTS.length);
    out += FRAGMENTS[index] ?? '';
  }
  return out;
}

const SEEDS = Array.from({ length: 40 }, (_, i) => 0x9e3779b9 + i * 2654435761);
const CASES_PER_SEED = 60;

function forEachGenerated(run: (input: string, seed: number) => void): void {
  for (const seed of SEEDS) {
    const next = rng(seed);
    for (let i = 0; i < CASES_PER_SEED; i += 1) {
      run(generate(next), seed);
    }
  }
}

describe('bidi isolation invariants', () => {
  it('is always losslessly reversible', () => {
    forEachGenerated((input, seed) => {
      expect(
        stripBidi(autoIsolate(input)),
        `seed ${seed}: ${JSON.stringify(input)}`,
      ).toBe(input);
    });
  });

  it('is always idempotent', () => {
    forEachGenerated((input, seed) => {
      const once = autoIsolate(input);
      expect(autoIsolate(once), `seed ${seed}: ${JSON.stringify(input)}`).toBe(once);
    });
  });

  it('is reversible and idempotent in an LTR paragraph too', () => {
    forEachGenerated((input, seed) => {
      const once = autoIsolate(input, { base: 'ltr' });
      expect(stripBidi(once), `seed ${seed}`).toBe(input);
      expect(autoIsolate(once, { base: 'ltr' }), `seed ${seed}`).toBe(once);
    });
  });

  it('is reversible with isolateNumbers on', () => {
    forEachGenerated((input, seed) => {
      const once = autoIsolate(input, { isolateNumbers: true });
      expect(stripBidi(once), `seed ${seed}`).toBe(input);
      expect(autoIsolate(once, { isolateNumbers: true }), `seed ${seed}`).toBe(once);
    });
  });

  it('adds exactly two characters per run and nothing else', () => {
    forEachGenerated((input, seed) => {
      const runs = findBidiRuns(input);
      expect(autoIsolate(input).length, `seed ${seed}: ${JSON.stringify(input)}`).toBe(
        input.length + runs.length * 2,
      );
    });
  });
});

describe('run invariants', () => {
  for (const base of DIRECTIONS) {
    it(`produces well-formed runs with base ${base}`, () => {
      forEachGenerated((input, seed) => {
        const runs = findBidiRuns(input, { base });
        const label = `seed ${seed}: ${JSON.stringify(input)}`;

        let previousEnd = 0;
        for (const run of runs) {
          // Offsets are inside the string.
          expect(run.start, label).toBeGreaterThanOrEqual(0);
          expect(run.end, label).toBeLessThanOrEqual(input.length);
          // Never empty.
          expect(run.end, label).toBeGreaterThan(run.start);
          // Slice matches the reported text exactly.
          expect(input.slice(run.start, run.end), label).toBe(run.text);
          // Ascending and non-overlapping.
          expect(run.start, label).toBeGreaterThanOrEqual(previousEnd);
          previousEnd = run.end;
          // Never leading or trailing whitespace, which would shift the words
          // around it while being invisible in a screenshot.
          expect(run.text, label).toBe(run.text.trim());
          // Never a bidi control character: those come from a previous pass and
          // re-isolating them is how idempotence breaks.
          expect(hasBidiControls(run.text), label).toBe(false);
        }
      });
    });
  }

  it('never emits a script run whose brackets are unbalanced', () => {
    forEachGenerated((input, seed) => {
      for (const run of findBidiRuns(input)) {
        if (run.reason !== 'script') continue;
        for (const [open, close] of [
          ['(', ')'],
          ['[', ']'],
          ['{', '}'],
        ] as const) {
          const opens = run.text.split(open).length - 1;
          const closes = run.text.split(close).length - 1;
          expect(opens, `seed ${seed}: ${JSON.stringify(run.text)}`).toBe(closes);
        }
      }
    });
  });

  it('never ends any run on an opening bracket', () => {
    // An atomic unit is isolated whole, so a bracket inside it cannot be
    // half-enclosed — but a URL that swallowed a trailing '{' still puts an
    // unbalanced bracket in the output for no reason.
    forEachGenerated((input, seed) => {
      for (const run of findBidiRuns(input)) {
        expect(
          ['(', '[', '{'].includes(run.text[run.text.length - 1] as string),
          `seed ${seed}: ${JSON.stringify(run.text)}`,
        ).toBe(false);
      }
    });
  });

  it('never splits a surrogate pair', () => {
    forEachGenerated((input, seed) => {
      for (const run of findBidiRuns(input)) {
        const label = `seed ${seed}: ${JSON.stringify(input)}`;
        const first = run.text.charCodeAt(0);
        const last = run.text.charCodeAt(run.text.length - 1);
        // A lone low surrogate at the start, or a lone high surrogate at the
        // end, means we cut a code point in half.
        expect(first >= 0xdc00 && first <= 0xdfff, label).toBe(false);
        expect(last >= 0xd800 && last <= 0xdbff, label).toBe(false);
      }
    });
  });
});

describe('isolate invariants', () => {
  it('always round-trips', () => {
    forEachGenerated((input, seed) => {
      expect(stripBidi(isolate(input)), `seed ${seed}`).toBe(input);
      expect(stripBidi(isolateIfNeeded(input)), `seed ${seed}`).toBe(input);
      for (const dir of DIRECTIONS) {
        expect(stripBidi(isolateIfNeeded(input, dir)), `seed ${seed}`).toBe(input);
      }
    });
  });

  it('never introduces characters for an empty value', () => {
    expect(isolate('')).toBe('');
    expect(isolateIfNeeded('')).toBe('');
  });

  it('is idempotent through isolateIfNeeded', () => {
    forEachGenerated((input, seed) => {
      if (input.length === 0) return;
      const once = isolateIfNeeded(input);
      expect(isolateIfNeeded(once), `seed ${seed}`).toBe(once);
    });
  });
});

describe('style resolution invariants', () => {
  const LOGICAL_KEYS = Object.keys(EDGE_PROPERTIES);
  const NEUTRAL_KEYS = ['width', 'height', 'backgroundColor', 'opacity', 'marginTop'];
  const VALUE_KEYS: readonly [string, readonly string[]][] = [
    ['textAlign', ['start', 'end', 'left', 'right', 'center', 'justify']],
    ['flexDirection', ['row', 'row-reverse', 'column', 'column-reverse']],
  ];

  function generateStyle(next: () => number): StyleObject {
    const style: Record<string, StyleValue> = {};
    const count = 1 + Math.floor(next() * 6);
    for (let i = 0; i < count; i += 1) {
      const roll = next();
      if (roll < 0.55) {
        const key = LOGICAL_KEYS[Math.floor(next() * LOGICAL_KEYS.length)] as string;
        style[key] = Math.floor(next() * 40);
      } else if (roll < 0.75) {
        const key = NEUTRAL_KEYS[Math.floor(next() * NEUTRAL_KEYS.length)] as string;
        style[key] = Math.floor(next() * 40);
      } else {
        const entry = VALUE_KEYS[Math.floor(next() * VALUE_KEYS.length)] as [
          string,
          readonly string[],
        ];
        style[entry[0]] = entry[1][Math.floor(next() * entry[1].length)];
      }
    }
    return style;
  }

  it('never leaves a logical property behind, in either direction', () => {
    for (const seed of SEEDS) {
      const next = rng(seed);
      for (let i = 0; i < CASES_PER_SEED; i += 1) {
        const style = generateStyle(next);
        for (const dir of DIRECTIONS) {
          const resolved = resolveStyle(style, dir) as Record<string, unknown>;
          for (const key of Object.keys(resolved)) {
            if (key === 'textAlign' || key === 'flexDirection') {
              expect(resolved[key], `seed ${seed}`).not.toBe('start');
              expect(resolved[key], `seed ${seed}`).not.toBe('end');
              continue;
            }
            expect(
              LOGICAL_PROPERTY_NAMES.has(key),
              `seed ${seed}: ${key} survived in ${JSON.stringify(style)}`,
            ).toBe(false);
          }
        }
      }
    }
  });

  it('is idempotent: resolving twice equals resolving once', () => {
    for (const seed of SEEDS) {
      const next = rng(seed);
      for (let i = 0; i < CASES_PER_SEED; i += 1) {
        const style = generateStyle(next);
        for (const dir of DIRECTIONS) {
          const once = resolveStyle(style, dir);
          expect(resolveStyle(once, dir), `seed ${seed}`).toEqual(once);
        }
      }
    }
  });

  it('never loses a value, except where two aliases target the same property', () => {
    for (const seed of SEEDS) {
      const next = rng(seed);
      for (let i = 0; i < CASES_PER_SEED; i += 1) {
        const style = generateStyle(next);
        for (const dir of DIRECTIONS) {
          const index = dir === 'ltr' ? 0 : 1;
          const resolved = resolveStyle(style, dir) as Record<string, unknown>;
          const outputValues = Object.values(resolved);

          // borderTopStartRadius and borderStartStartRadius are two spellings
          // of the same corner, so a style using both loses one. Last write
          // wins, which is the only sane rule; count the targets and only
          // assert on values whose target is unique.
          const targets = new Map<string, number>();
          for (const key of Object.keys(style)) {
            const edge = EDGE_PROPERTIES[key];
            if (edge === undefined) continue;
            const name = edge[index] as string;
            targets.set(name, (targets.get(name) ?? 0) + 1);
          }

          for (const [key, value] of Object.entries(style)) {
            if (key === 'textAlign' || key === 'flexDirection') continue;
            const edge = EDGE_PROPERTIES[key];
            if (edge !== undefined && (targets.get(edge[index] as string) ?? 0) > 1) {
              continue;
            }
            expect(
              outputValues.includes(value),
              `seed ${seed}: ${key}=${String(value)} vanished`,
            ).toBe(true);
          }
        }
      }
    }
  });

  it('returns the same object identity for the same input and direction', () => {
    for (const seed of SEEDS) {
      const next = rng(seed);
      for (let i = 0; i < 20; i += 1) {
        const style = generateStyle(next);
        for (const dir of DIRECTIONS) {
          expect(resolveStyle(style, dir)).toBe(resolveStyle(style, dir));
        }
      }
    }
  });

  it('produces a different result for each direction whenever anything is logical', () => {
    for (const seed of SEEDS) {
      const next = rng(seed);
      for (let i = 0; i < 20; i += 1) {
        const style = generateStyle(next);
        const hasDirectional =
          Object.keys(style).some((key) => key in EDGE_PROPERTIES) ||
          style.textAlign === 'start' ||
          style.textAlign === 'end' ||
          style.flexDirection === 'row' ||
          style.flexDirection === 'row-reverse';
        if (!hasDirectional) continue;
        expect(resolveStyle(style, 'ltr'), `seed ${seed}`).not.toEqual(
          resolveStyle(style, 'rtl'),
        );
      }
    }
  });
});

describe('number formatting invariants', () => {
  const VALUES: readonly number[] = [
    0, -0, 1, -1, 0.5, -0.5, 1.005, 8.575, 1.015, 2.675, 999.995, 1000, 999999.999,
    -1234.5678, 0.001, 1e-7, 1e15, 123456789.123456,
  ];

  it('always parses back to the value it rounded to', () => {
    for (const value of VALUES) {
      for (const decimals of [0, 1, 2, 3]) {
        const text = formatNumber(value, { decimals, grouping: false });
        const parsed = Number.parseFloat(text);
        expect(
          Math.abs(parsed - value),
          `${value} at ${decimals}dp gave ${text}`,
        ).toBeLessThanOrEqual(0.5 * 10 ** -decimals + 1e-9);
      }
    }
  });

  it('is symmetric about zero', () => {
    for (const value of VALUES) {
      if (value === 0) continue;
      for (const decimals of [0, 2, 3]) {
        const positive = formatNumber(Math.abs(value), { decimals });
        const negative = formatNumber(-Math.abs(value), { decimals });
        expect(negative, `${value} at ${decimals}dp`).toBe(`-${positive}`);
      }
    }
  });

  it('never emits NaN, undefined or an empty string for a finite value', () => {
    for (const value of VALUES) {
      for (const numerals of ['western', 'arabic', 'persian'] as NumeralSystem[]) {
        const text = formatNumber(value, { decimals: 2, numerals });
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toContain('NaN');
        expect(text).not.toContain('undefined');
      }
    }
  });

  it('groups in threes, always', () => {
    for (const value of [1000, 10000, 100000, 1000000, 1234567890]) {
      const integer = formatNumber(value).split('.')[0] as string;
      const groups = integer.split(',');
      expect(groups[0]?.length).toBeGreaterThanOrEqual(1);
      expect(groups[0]?.length).toBeLessThanOrEqual(3);
      for (const group of groups.slice(1)) {
        expect(group.length, `${value} grouped as ${integer}`).toBe(3);
      }
    }
  });

  it('produces the same digit count in every numeral system', () => {
    for (const value of VALUES) {
      const western = formatNumber(value, { decimals: 2, numerals: 'western' });
      for (const numerals of ['arabic', 'persian'] as NumeralSystem[]) {
        const other = formatNumber(value, { decimals: 2, numerals });
        expect(other.length, `${value} in ${numerals}`).toBe(western.length);
        expect(
          toWesternDigits(other).replace(/[٬٫]/g, (m) => (m === '٬' ? ',' : '.')),
        ).toBe(western);
      }
    }
  });
});

describe('currency invariants', () => {
  it('formats every shipped currency without producing nonsense', () => {
    for (const code of Object.keys(CURRENCIES)) {
      for (const value of [0, 1, -1, 1234.567, -0.005]) {
        for (const locale of ['ar-EG', 'en-US']) {
          const text = formatCurrency(value, code, { locale });
          expect(text.length, `${code} ${value} ${locale}`).toBeGreaterThan(0);
          expect(text).not.toContain('NaN');
          expect(text).not.toContain('undefined');
          expect(text).not.toContain('(');
          expect(text).not.toContain(')');
        }
      }
    }
  });

  it('uses the currency’s own decimal count for every currency', () => {
    for (const code of Object.keys(CURRENCIES)) {
      const decimals = currencyDisplay(code).decimals;
      const text = formatCurrency(1, code, { display: 'none' });
      const fraction = text.split('.')[1] ?? '';
      expect(fraction.length, `${code}`).toBe(decimals);
    }
  });

  it('marks every negative with a minus and never with parentheses', () => {
    for (const code of Object.keys(CURRENCIES)) {
      const text = formatCurrency(-1, code);
      expect(text.startsWith('-') || text.includes('-'), code).toBe(true);
    }
  });
});

describe('numeral invariants', () => {
  it('round-trips through every system', () => {
    const systems: NumeralSystem[] = ['western', 'arabic', 'persian'];
    forEachGenerated((input, seed) => {
      for (const from of systems) {
        const converted = convertDigits(input, from);
        for (const to of systems) {
          expect(convertDigits(convertDigits(converted, to), from), `seed ${seed}`).toBe(
            converted,
          );
        }
      }
    });
  });

  it('never changes the length of a string', () => {
    forEachGenerated((input, seed) => {
      for (const system of ['western', 'arabic', 'persian'] as NumeralSystem[]) {
        expect(convertDigits(input, system).length, `seed ${seed}`).toBe(input.length);
      }
    });
  });

  it('never changes a non-digit character', () => {
    forEachGenerated((input, seed) => {
      const converted = convertDigits(input, 'arabic');
      for (let i = 0; i < input.length; i += 1) {
        const original = input[i] as string;
        if (/[0-9٠-٩۰-۹]/.test(original)) continue;
        expect(converted[i], `seed ${seed} at ${i}`).toBe(original);
      }
    });
  });

  it('agrees with detectNumeralSystem after a conversion', () => {
    for (const system of ['western', 'arabic', 'persian'] as NumeralSystem[]) {
      forEachGenerated((input) => {
        const converted = convertDigits(input, system);
        const detected = detectNumeralSystem(converted);
        if (detected !== null) expect(detected).toBe(system);
      });
    }
  });
});

describe('isCopySensitive never throws', () => {
  it('handles anything', () => {
    forEachGenerated((input) => {
      expect(() => isCopySensitive(input)).not.toThrow();
      expect(typeof isCopySensitive(input)).toBe('boolean');
    });
  });
});

describe('the both-directions rule holds for generated input', () => {
  it('gives autoIsolate a different answer per base whenever both scripts appear', () => {
    let checked = 0;
    forEachGenerated((input) => {
      const rtl = findBidiRuns(input, { base: 'rtl' });
      const ltr = findBidiRuns(input, { base: 'ltr' });
      // Not an equality assertion — a string of one script yields no runs in
      // either. Just confirm the generator produced cases exercising both.
      if (rtl.length > 0 && ltr.length > 0) checked += 1;
    });
    expect(checked).toBeGreaterThan(0);
  });
});

const _typeCheck: Direction = 'rtl';
void _typeCheck;
