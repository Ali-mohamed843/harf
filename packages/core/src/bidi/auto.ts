/**
 * Automatic detection and isolation of embedded opposite-direction runs.
 *
 * Given a sentence in one direction containing runs of the other, find those
 * runs and wrap each one in an isolate. This is the "I have a database full of
 * mixed-script strings and cannot hand-annotate them" tool.
 *
 * @module
 */

import type { Direction } from '../direction';
import { classifyCodePoint, type CharClass } from './classify';
import { FSI, PDI, hasBidiControls, stripBidi } from './controls';

/** A detected run of text that reads against the base direction. */
export interface BidiRun {
  /** Index of the first code unit of the run. */
  readonly start: number;
  /** Index just past the last code unit of the run. */
  readonly end: number;
  /** The substring `text.slice(start, end)`. */
  readonly text: string;
  /**
   * Why this run was detected: `'script'` for a run of opposite-direction
   * letters, or `'atomic'` for a URL, email, phone number, handle or dotted
   * identifier matched as an indivisible unit.
   */
  readonly reason: 'script' | 'atomic';
}

/** Options for {@link autoIsolate} and {@link findBidiRuns}. */
export interface AutoIsolateOptions {
  /**
   * The direction of the surrounding paragraph. Runs reading the *other* way
   * are the ones that get isolated.
   *
   * @defaultValue `'rtl'`
   */
  readonly base?: Direction;
  /**
   * Also isolate bare numbers that contain no strong character.
   *
   * Off by default: a plain number inside Arabic text is a weak run that the
   * text engine already places correctly, and isolating it only adds invisible
   * characters. Turn it on for tables of figures where every cell should read
   * identically regardless of the text beside it.
   *
   * @defaultValue `false`
   */
  readonly isolateNumbers?: boolean;
  /**
   * Extra patterns to treat as indivisible units, matched before script
   * detection runs.
   *
   * @example
   * ```ts
   * // Treat order numbers like KRN-2026-0042 as one unit.
   * autoIsolate(text, { patterns: [/\bKRN-\d{4}-\d{4}\b/g] });
   * ```
   */
  readonly patterns?: readonly RegExp[];
}

interface AtomicPattern {
  readonly re: RegExp;
  /** Rejects a match the pattern is too loose to exclude on its own. */
  readonly accept?: (match: string) => boolean;
}

/**
 * Indivisible units, matched before script detection.
 *
 * These exist because the runs that break most often contain no strong
 * character at all. `+20 114 919 9190` is a plus sign, digits and spaces —
 * every one of them weak or neutral — so a purely script-based scan finds
 * nothing to isolate while the rendered result is visibly wrong.
 *
 * Order matters: a URL contains `@` and `.`, so it must be matched before the
 * email and dotted-identifier patterns get a chance at its insides.
 */
const ATOMIC_PATTERNS: readonly AtomicPattern[] = [
  {
    // Absolute URLs and bare www. hosts, running to the next whitespace.
    //
    // Deliberately *not* stopped by RTL characters: a URL may legitimately
    // carry Arabic in its path or query, and cutting the match there would
    // split one link into two isolates with the Arabic exposed between them —
    // which is precisely the copy-paste breakage this pattern exists to avoid.
    //
    // The final character class excludes sentence punctuation so a URL ending
    // a sentence does not swallow the full stop, and excludes *opening*
    // brackets as well: a URL never ends with one, and swallowing it puts an
    // unbalanced bracket inside the isolate.
    re: /\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S*[^\s.,;:!?([{)\]}'"]/gi,
  },
  {
    // Email addresses.
    re: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
  },
  {
    // Phone numbers: an optional +, then digits with spaces, dashes, dots and
    // parentheses. Deliberately loose, then narrowed by `accept` to matches
    // carrying a plausible number of digits.
    re: /\+?\d[\d\s().-]{5,}\d/g,
    accept: (match) => {
      const digits = match.replace(/\D/g, '').length;
      return digits >= 7 && digits <= 17;
    },
  },
  {
    // Dotted identifiers: filenames, hostnames, version numbers, IP addresses.
    re: /\b[a-z0-9_-]+(?:\.[a-z0-9_-]+)+\b/gi,
  },
  {
    // Social handles and hashtags written in Latin script.
    re: /[@#][a-z0-9_]{2,}/gi,
  },
];

const OPENERS: ReadonlySet<string> = new Set(['(', '[', '{']);
const CLOSERS: ReadonlySet<string> = new Set([')', ']', '}']);
const WHITESPACE = /\s/;

interface Match {
  readonly start: number;
  readonly end: number;
  readonly reason: 'script' | 'atomic';
}

/**
 * Finds every atomic unit, scanning left to right.
 *
 * Deliberately sequential rather than "collect everything, then drop the
 * overlaps". When one pattern's match swallows another's — `#hashtag1` beating
 * `hashtag1.2.3` — a collect-then-filter pass loses the `2.3` that is still
 * sitting in the gap. Restarting the search from the end of each accepted match
 * finds it.
 */
function collectAtomic(text: string, patterns: readonly AtomicPattern[]): Match[] {
  const compiled = patterns.map((pattern) => ({
    re: new RegExp(
      pattern.re.source,
      pattern.re.flags.includes('g') ? pattern.re.flags : `${pattern.re.flags}g`,
    ),
    accept: pattern.accept,
  }));

  const found: Match[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let best: Match | null = null;

    for (const { re, accept } of compiled) {
      re.lastIndex = cursor;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text)) !== null) {
        const value = match[0];
        if (value.length === 0) {
          re.lastIndex += 1;
          continue;
        }
        if (accept !== undefined && !accept(value)) continue;
        const candidate: Match = {
          start: match.index,
          end: match.index + value.length,
          reason: 'atomic',
        };
        // Earliest wins; on a tie, the longer one.
        if (
          best === null ||
          candidate.start < best.start ||
          (candidate.start === best.start && candidate.end > best.end)
        ) {
          best = candidate;
        }
        break;
      }
    }

    if (best === null) break;
    found.push(best);
    cursor = best.end;
  }

  return found;
}

/** Drops any match overlapping one already accepted. Earlier, then longer, wins. */
function dedupe(matches: readonly Match[]): Match[] {
  const sorted = [...matches].sort((a, b) =>
    a.start === b.start ? b.end - a.end : a.start - b.start,
  );
  const out: Match[] = [];
  let cursor = -1;
  for (const match of sorted) {
    if (match.start >= cursor) {
      out.push(match);
      cursor = match.end;
    }
  }
  return out;
}

/**
 * Never let an isolate open inside a bracket pair and close outside it: the
 * bracket glyphs mirror, and a half-enclosed pair looks worse than no
 * isolation at all.
 */
function balanceBrackets(text: string, start: number, end: number): [number, number] {
  let s = start;
  let e = end;

  // A closer at the very start belongs to a pair opened before the run, so it
  // is simply dropped.
  while (s < e && CLOSERS.has(text[s] as string)) s += 1;

  // A closer *inside* the run with no opener inside it is the other half of a
  // pair that starts outside — end the run before it rather than enclose it.
  const openStack: number[] = [];
  for (let i = s; i < e; i += 1) {
    const char = text[i] as string;
    if (OPENERS.has(char)) {
      openStack.push(i);
    } else if (CLOSERS.has(char)) {
      if (openStack.length > 0) openStack.pop();
      else {
        e = i;
        break;
      }
    }
  }

  // Now no unmatched closers remain in [s, e). Any opener still on the stack
  // has its partner outside the run, so cut before the first of them.
  const firstUnmatchedOpener = openStack.find((index) => index < e);
  if (firstUnmatchedOpener !== undefined) e = firstUnmatchedOpener;

  while (e > s && WHITESPACE.test(text[e - 1] as string)) e -= 1;
  while (s < e && WHITESPACE.test(text[s] as string)) s += 1;
  return [s, e];
}

/** Scans a gap between atomic matches for runs reading against the base direction. */
function scanScriptRuns(
  text: string,
  from: number,
  to: number,
  base: Direction,
  isolateNumbers: boolean,
  out: Match[],
): void {
  const opposite: CharClass = base === 'rtl' ? 'L' : 'R';
  const len = to - from;
  const classes = new Array<CharClass>(len);
  for (let i = 0; i < len; i += 1) {
    const unit = text.charCodeAt(from + i);
    // A low surrogate takes the class of the pair it completes. Classifying it
    // on its own gives 'N', which lets a run end between the two halves of a
    // code point and emit an isolate that splits a character in two.
    if (unit >= 0xdc00 && unit <= 0xdfff && i > 0) {
      classes[i] = classes[i - 1] as CharClass;
      continue;
    }
    const code = text.codePointAt(from + i);
    classes[i] = code === undefined ? 'N' : classifyCodePoint(code);
  }

  // Arabic punctuation continues an Arabic run but ends a Latin one. When the
  // paragraph is LTR the run we are collecting *is* the Arabic one, so the
  // punctuation stays inside it.
  const punctuationContinues = opposite === 'R';

  let i = 0;
  while (i < len) {
    const cls = classes[i];
    const isSeed = cls === opposite || (isolateNumbers && (cls === 'EN' || cls === 'AN'));
    if (!isSeed) {
      i += 1;
      continue;
    }

    // Extend forwards over same-direction letters, weak digits, and neutrals.
    // `lastKept` tracks the end of the last character that genuinely belongs to
    // the run, so trailing neutrals — the space and full stop that belong to
    // the surrounding sentence — are left outside the isolate.
    let end = i + 1;
    let lastKept = i + 1;
    let sawStrong = cls === opposite;
    while (end < len) {
      const next = classes[end];
      if (next === opposite) {
        sawStrong = true;
        end += 1;
        lastKept = end;
        continue;
      }
      if (next === 'RP') {
        if (!punctuationContinues) break;
        end += 1;
        lastKept = end;
        continue;
      }
      if (next === 'EN' || next === 'AN' || next === 'N') {
        end += 1;
        // A digit is part of the run ("Karnak Holidays 2026"); a neutral only
        // survives if more of the run follows it.
        if (next !== 'N') lastKept = end;
        continue;
      }
      break; // A strong character of the base direction ends the run.
    }

    if (!sawStrong && !isolateNumbers) {
      i = end;
      continue;
    }

    const [s, e] = balanceBrackets(text, from + i, from + lastKept);
    if (e > s) out.push({ start: s, end: e, reason: 'script' });
    i = end;
  }
}

/**
 * Finds every run in `text` that reads against the base direction.
 *
 * Exposed so you can inspect what {@link autoIsolate} is about to do — in a
 * test, in a debug overlay, or to decide that a particular string needs
 * hand-annotation instead.
 *
 * Expects text with no bidi control characters in it. Offsets are reported
 * against the string you pass, so `autoIsolate` strips first and calls this
 * with the clean text; pass annotated text here and the offsets will be right
 * but the runs will reflect the annotation. Use `stripBidi` first if in doubt.
 *
 * @example
 * ```ts
 * import { findBidiRuns } from '@harf/core';
 *
 * findBidiRuns('مرحبا بك في Karnak Holidays 2026 اليوم');
 * // one run: 'Karnak Holidays 2026', reason 'script'
 *
 * findBidiRuns('اتصل على +20 114 919 9190 الآن');
 * // one run: '+20 114 919 9190', reason 'atomic'
 * ```
 */
export function findBidiRuns(
  text: string,
  options: AutoIsolateOptions = {},
): readonly BidiRun[] {
  const base = options.base ?? 'rtl';
  const isolateNumbers = options.isolateNumbers ?? false;
  const patterns =
    options.patterns === undefined
      ? ATOMIC_PATTERNS
      : [...ATOMIC_PATTERNS, ...options.patterns.map((re) => ({ re }))];

  const all: Match[] = [];
  const atomic = collectAtomic(text, patterns);
  let cursor = 0;
  for (const match of atomic) {
    if (match.start > cursor) {
      scanScriptRuns(text, cursor, match.start, base, isolateNumbers, all);
    }
    all.push(match);
    cursor = match.end;
  }
  if (cursor < text.length) {
    scanScriptRuns(text, cursor, text.length, base, isolateNumbers, all);
  }

  return (
    dedupe(all)
      // A script run spanning the whole string has nothing to be isolated from.
      .filter((m) => !(m.start === 0 && m.end === text.length && m.reason === 'script'))
      .map((m) => ({
        start: m.start,
        end: m.end,
        text: text.slice(m.start, m.end),
        reason: m.reason,
      }))
  );
}

/**
 * Wraps every embedded opposite-direction run in a first-strong isolate.
 *
 * Handles the cases that break naive implementations: adjacent punctuation,
 * trailing digits, mirrored brackets, phone numbers containing no strong
 * character, and URLs — which are isolated *whole*, never internally, so the
 * URL text stays contiguous and survives copy and paste.
 *
 * @param text - A sentence, possibly containing runs of the other direction.
 * @param options - See {@link AutoIsolateOptions}.
 * @returns The same text with U+2068…U+2069 around each detected run.
 *
 * @example
 * ```ts
 * import { autoIsolate, stripBidi } from '@harf/core';
 *
 * const out = autoIsolate('مرحبا بك في Karnak Holidays 2026 اليوم');
 * // the brand run is now wrapped in invisible isolate characters
 *
 * stripBidi(out) === 'مرحبا بك في Karnak Holidays 2026 اليوم'; // true
 * ```
 *
 * @example An LTR paragraph with Arabic in it
 * ```ts
 * autoIsolate('The word مرحبا means hello', { base: 'ltr' });
 * ```
 *
 * @remarks
 * The added characters are invisible but real, and they *are* copied with the
 * text. Call this at render time on display strings only. Never store the
 * result, never compare it against a raw value, and never send it to an API —
 * use `stripBidi` if you must.
 */
export function autoIsolate(text: string, options: AutoIsolateOptions = {}): string {
  // Analyse the text with any existing bidi controls removed. Isolate
  // characters change what the scanner sees — a word boundary appears where
  // one did not exist, a previously-swallowed sub-match becomes visible — so
  // running over annotated text would give a different answer than running
  // over the original. Normalising first makes idempotence structural:
  // autoIsolate(autoIsolate(x)) analyses exactly the same string both times.
  const clean = hasBidiControls(text) ? stripBidi(text) : text;

  const runs = findBidiRuns(clean, options);
  if (runs.length === 0) return clean;

  let out = '';
  let cursor = 0;
  for (const run of runs) {
    out += clean.slice(cursor, run.start) + FSI + run.text + PDI;
    cursor = run.end;
  }
  return out + clean.slice(cursor);
}
