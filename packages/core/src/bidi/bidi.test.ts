import { describe, expect, it } from 'vitest';
import {
  ALM,
  BIDI_CONTROL_CLASS,
  FSI,
  LRE,
  LRI,
  LRM,
  PDF,
  PDI,
  RLI,
  RLM,
  hasBidiControls,
  stripBidi,
} from './controls';
import {
  classifyCodePoint,
  containsLtr,
  containsRtl,
  firstStrongDirection,
} from './classify';
import { isolate, isolateIfNeeded } from './isolate';
import { autoIsolate, findBidiRuns } from './auto';

/** Real strings from the brief. Do not paraphrase these — the bug is in the characters. */
const BRAND = 'مرحبا بك في Karnak Holidays 2026 اليوم';
const PHONE = 'اتصل على +20 114 919 9190 الآن';
const EMAIL = 'راسلنا على ali@karnak-holidays.com لأي استفسار';
const URL = 'زوروا https://karnak-holidays.com/عروض?ref=ar الآن';
const MIXED_LIST = 'المنتجات: iPhone 15 Pro، Galaxy S24، وشاومي Redmi Note 13';

describe('control characters', () => {
  it('are the code points the Unicode standard specifies', () => {
    expect(LRI.codePointAt(0)).toBe(0x2066);
    expect(RLI.codePointAt(0)).toBe(0x2067);
    expect(FSI.codePointAt(0)).toBe(0x2068);
    expect(PDI.codePointAt(0)).toBe(0x2069);
    expect(LRE.codePointAt(0)).toBe(0x202a);
    expect(PDF.codePointAt(0)).toBe(0x202c);
    expect(LRM.codePointAt(0)).toBe(0x200e);
    expect(RLM.codePointAt(0)).toBe(0x200f);
    expect(ALM.codePointAt(0)).toBe(0x061c);
  });

  it('are each one code unit, so slicing a string never splits one', () => {
    for (const control of [LRI, RLI, FSI, PDI, LRE, PDF, LRM, RLM, ALM]) {
      expect(control.length).toBe(1);
    }
  });

  it('compiles into a working character class', () => {
    const re = new RegExp(`[${BIDI_CONTROL_CLASS}]`, 'u');
    expect(re.test(FSI)).toBe(true);
    expect(re.test('a')).toBe(false);
  });
});

describe('stripBidi', () => {
  it('removes every control Harf can emit', () => {
    const dirty = `${FSI}Karnak${PDI}${RLM}${LRM}${LRE}x${PDF}${ALM}`;
    expect(stripBidi(dirty)).toBe('Karnakx');
  });

  it('leaves a clean string byte-for-byte identical', () => {
    expect(stripBidi(BRAND)).toBe(BRAND);
  });

  it('is idempotent', () => {
    const once = stripBidi(autoIsolate(BRAND));
    expect(stripBidi(once)).toBe(once);
  });

  it('is not confused by repeated calls on a global regex (lastIndex reset)', () => {
    const value = isolate('a');
    expect(stripBidi(value)).toBe('a');
    expect(stripBidi(value)).toBe('a');
    expect(stripBidi(value)).toBe('a');
  });
});

describe('hasBidiControls', () => {
  it('distinguishes annotated from raw text', () => {
    expect(hasBidiControls(BRAND)).toBe(false);
    expect(hasBidiControls(autoIsolate(BRAND))).toBe(true);
  });

  it('gives the same answer on consecutive calls', () => {
    const value = isolate('x');
    expect(hasBidiControls(value)).toBe(true);
    expect(hasBidiControls(value)).toBe(true);
  });
});

describe('classifyCodePoint', () => {
  it.each([
    ['Latin capital', 'K', 'L'],
    ['Latin lowercase', 'k', 'L'],
    ['Arabic letter', 'م', 'R'],
    ['Hebrew letter', 'ש', 'R'],
    ['Thaana letter', 'ހ', 'R'],
    ['NKo letter', 'ߊ', 'R'],
    ['Western digit', '7', 'EN'],
    ['Arabic-Indic digit', '٧', 'AN'],
    ['Persian digit', '۷', 'AN'],
    ['space', ' ', 'N'],
    ['full stop', '.', 'N'],
    ['plus sign', '+', 'N'],
    ['Arabic comma', '،', 'RP'],
    ['Arabic question mark', '؟', 'RP'],
    ['Arabic full stop', '۔', 'RP'],
  ])('classifies a %s as %s', (_label, char, expected) => {
    expect(classifyCodePoint(char.codePointAt(0) as number)).toBe(expected);
  });

  it('treats Arabic presentation forms as RTL', () => {
    expect(classifyCodePoint(0xfe70)).toBe('R');
    expect(classifyCodePoint(0xfb50)).toBe('R');
  });

  it('does not count Arabic punctuation as strong RTL', () => {
    // A string of nothing but punctuation has no direction, so `containsRtl`
    // must stay false even though these glyphs belong to an Arabic sentence.
    expect(containsRtl('،؟۔')).toBe(false);
    expect(firstStrongDirection('،؟۔')).toBeNull();
  });
});

describe('Arabic punctuation as a run boundary', () => {
  // A deliberate divergence from the Unicode Bidirectional Algorithm, which
  // would resolve the neutral run between two Latin runs to Latin and merge
  // them. Harf ends the run at the Arabic comma instead, so each item in a
  // list becomes its own isolate. This is more predictable for a product that
  // renders a list of foreign brand names, and never less correct: an isolate
  // per item and a single isolate around all of them lay out identically.
  it('ends a Latin run at an Arabic comma', () => {
    const runs = findBidiRuns('المنتجات: iPhone، Galaxy، Redmi');
    expect(runs.map((r) => r.text)).toEqual(['iPhone', 'Galaxy', 'Redmi']);
  });

  it('keeps an Arabic comma inside an Arabic run when the paragraph is LTR', () => {
    const runs = findBidiRuns('He said مرحبا، أهلا loudly', { base: 'ltr' });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.text).toBe('مرحبا، أهلا');
  });

  it('ends a Latin run at an Arabic question mark', () => {
    const runs = findBidiRuns('هل تعرف Karnak؟ نعم');
    expect(runs.map((r) => r.text)).toEqual(['Karnak']);
  });
});

describe('firstStrongDirection', () => {
  it('follows the first strong character, skipping punctuation and digits', () => {
    expect(firstStrongDirection('مرحبا Karnak')).toBe('rtl');
    expect(firstStrongDirection('Karnak مرحبا')).toBe('ltr');
    expect(firstStrongDirection('  "مرحبا"')).toBe('rtl');
    expect(firstStrongDirection('2026 - Karnak')).toBe('ltr');
  });

  it('returns null when there is no strong character at all', () => {
    expect(firstStrongDirection('2026')).toBeNull();
    expect(firstStrongDirection('+20 114 919 9190')).toBeNull();
    expect(firstStrongDirection('')).toBeNull();
    expect(firstStrongDirection('!!! ... ???')).toBeNull();
  });
});

describe('containsRtl / containsLtr', () => {
  it('detects each script independently', () => {
    expect(containsRtl(BRAND)).toBe(true);
    expect(containsLtr(BRAND)).toBe(true);
    expect(containsRtl('Hello world')).toBe(false);
    expect(containsLtr('مرحبا بك')).toBe(false);
    expect(containsRtl('مرحبا بك')).toBe(true);
  });

  it('does not count digits as strong in either direction', () => {
    expect(containsRtl('٢٠٢٦')).toBe(false);
    expect(containsLtr('2026')).toBe(false);
  });
});

describe('isolate', () => {
  it('wraps in FSI/PDI by default', () => {
    expect(isolate('Karnak')).toBe(`${FSI}Karnak${PDI}`);
  });

  it('uses a directional isolate when asked', () => {
    expect(isolate('Karnak', { dir: 'ltr' })).toBe(`${LRI}Karnak${PDI}`);
    expect(isolate('مرحبا', { dir: 'rtl' })).toBe(`${RLI}مرحبا${PDI}`);
  });

  it('never introduces characters for an empty value', () => {
    // A missing name rendered as two invisible characters is a real bug: it
    // makes an "empty" check pass while the string is not empty.
    expect(isolate('')).toBe('');
    expect(isolate('').length).toBe(0);
  });

  it('round-trips through stripBidi', () => {
    for (const value of ['Karnak', '+20 114 919 9190', 'ali@karnak.com', 'مرحبا']) {
      expect(stripBidi(isolate(value))).toBe(value);
    }
  });
});

describe('isolateIfNeeded', () => {
  it('leaves text that already agrees with the paragraph alone', () => {
    expect(isolateIfNeeded('مرحبا', 'rtl')).toBe('مرحبا');
    expect(isolateIfNeeded('Hello', 'ltr')).toBe('Hello');
  });

  it('isolates text that disagrees', () => {
    expect(isolateIfNeeded('Karnak', 'rtl')).toBe(`${FSI}Karnak${PDI}`);
    expect(isolateIfNeeded('مرحبا', 'ltr')).toBe(`${FSI}مرحبا${PDI}`);
  });

  it('does not double-wrap an already isolated value', () => {
    const once = isolate('Karnak');
    expect(isolateIfNeeded(once)).toBe(once);
    expect(isolateIfNeeded(once, 'rtl')).toBe(once);
  });

  it('leaves a value with no strong direction alone when a base is given', () => {
    expect(isolateIfNeeded('2026', 'rtl')).toBe('2026');
  });

  it('isolates unconditionally when no base is given', () => {
    expect(isolateIfNeeded('2026')).toBe(`${FSI}2026${PDI}`);
  });

  it('never introduces characters for an empty value', () => {
    expect(isolateIfNeeded('', 'rtl')).toBe('');
  });
});

describe('findBidiRuns — the cases from the brief', () => {
  it('finds the brand name and its trailing year as one run', () => {
    const runs = findBidiRuns(BRAND);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.text).toBe('Karnak Holidays 2026');
    expect(runs[0]?.reason).toBe('script');
  });

  it('does not swallow the Arabic word that follows the run', () => {
    const runs = findBidiRuns(BRAND);
    expect(runs[0]?.text).not.toContain('اليوم');
    // The space between the run and the next Arabic word stays outside.
    expect(runs[0]?.text.endsWith('2026')).toBe(true);
  });

  it('finds a phone number that contains no strong character at all', () => {
    // This is the case a purely script-based scan misses entirely: every
    // character in '+20 114 919 9190' is weak or neutral.
    const runs = findBidiRuns(PHONE);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.text).toBe('+20 114 919 9190');
    expect(runs[0]?.reason).toBe('atomic');
  });

  it('finds an email address as a single unit', () => {
    const runs = findBidiRuns(EMAIL);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.text).toBe('ali@karnak-holidays.com');
    expect(runs[0]?.reason).toBe('atomic');
  });

  it('finds a URL as a single unit and does not split it internally', () => {
    const runs = findBidiRuns(URL);
    const urlRun = runs.find((r) => r.text.startsWith('https://'));
    expect(urlRun).toBeDefined();
    expect(urlRun?.reason).toBe('atomic');
    // Everything between start and end is one contiguous slice of the source,
    // so the URL a user copies is the URL that was in the string.
    expect(URL.slice(urlRun?.start ?? 0, urlRun?.end ?? 0)).toBe(urlRun?.text);
  });

  it('finds each Latin product name in a mixed list', () => {
    const runs = findBidiRuns(MIXED_LIST);
    const texts = runs.map((r) => r.text);
    expect(texts).toContain('iPhone 15 Pro');
    expect(texts).toContain('Galaxy S24');
    expect(texts).toContain('Redmi Note 13');
  });

  it('does not include the Arabic comma separating list items', () => {
    for (const run of findBidiRuns(MIXED_LIST)) {
      expect(run.text).not.toContain('،');
    }
  });

  it('reports byte-accurate offsets for every run', () => {
    for (const source of [BRAND, PHONE, EMAIL, URL, MIXED_LIST]) {
      for (const run of findBidiRuns(source)) {
        expect(source.slice(run.start, run.end)).toBe(run.text);
      }
    }
  });

  it('produces runs that never overlap and are in ascending order', () => {
    const runs = findBidiRuns(MIXED_LIST);
    for (let i = 1; i < runs.length; i += 1) {
      expect(runs[i]?.start).toBeGreaterThanOrEqual(runs[i - 1]?.end ?? 0);
    }
  });
});

describe('findBidiRuns — punctuation and brackets', () => {
  it('excludes the trailing full stop of a sentence', () => {
    const runs = findBidiRuns('هذا هو Karnak.');
    expect(runs[0]?.text).toBe('Karnak');
  });

  it('excludes a trailing comma', () => {
    const runs = findBidiRuns('عندنا Karnak، وغيره');
    expect(runs[0]?.text).toBe('Karnak');
  });

  it('keeps punctuation that sits between two parts of the same run', () => {
    const runs = findBidiRuns('اسمه Karnak - Holidays اليوم');
    expect(runs[0]?.text).toBe('Karnak - Holidays');
  });

  it('does not open an isolate inside a bracket pair and close it outside', () => {
    // Brackets mirror under RTL. A half-enclosed pair looks worse than none.
    const runs = findBidiRuns('اشتر (Karnak Pro) الآن');
    for (const run of runs) {
      const opens = (run.text.match(/\(/g) ?? []).length;
      const closes = (run.text.match(/\)/g) ?? []).length;
      expect(opens).toBe(closes);
    }
  });

  it('handles a run wholly inside brackets', () => {
    const runs = findBidiRuns('اشتر (Karnak) الآن');
    expect(runs.map((r) => r.text)).toContain('Karnak');
  });

  it('does not emit a run that is only whitespace or punctuation', () => {
    for (const run of findBidiRuns('مرحبا ... !!! اليوم')) {
      expect(run.text.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('findBidiRuns — what it deliberately does not do', () => {
  it('does not isolate bare numbers by default', () => {
    // A weak digit run inside Arabic is already placed correctly by the text
    // engine. Isolating it would add invisible characters for no gain.
    expect(findBidiRuns('عمره 25 سنة')).toHaveLength(0);
  });

  it('isolates bare numbers when explicitly asked to', () => {
    const runs = findBidiRuns('عمره 25 سنة', { isolateNumbers: true });
    expect(runs.map((r) => r.text)).toContain('25');
  });

  it('does not isolate a string that is entirely one direction', () => {
    expect(findBidiRuns('Karnak Holidays', { base: 'rtl' })).toHaveLength(0);
    expect(findBidiRuns('مرحبا بك', { base: 'ltr' })).toHaveLength(0);
  });

  it('finds nothing in an empty string', () => {
    expect(findBidiRuns('')).toHaveLength(0);
  });
});

describe('findBidiRuns — base direction', () => {
  it('isolates Arabic when the paragraph is LTR', () => {
    const runs = findBidiRuns('The word مرحبا means hello', { base: 'ltr' });
    expect(runs).toHaveLength(1);
    expect(runs[0]?.text).toBe('مرحبا');
  });

  it('finds different runs in the same string for each base direction', () => {
    const rtl = findBidiRuns(BRAND, { base: 'rtl' }).map((r) => r.text);
    const ltr = findBidiRuns(BRAND, { base: 'ltr' }).map((r) => r.text);
    expect(rtl).not.toEqual(ltr);
  });
});

describe('findBidiRuns — custom patterns', () => {
  it('treats a caller-supplied pattern as an indivisible unit', () => {
    const runs = findBidiRuns('طلبك رقم KRN-2026-0042 جاهز', {
      patterns: [/\bKRN-\d{4}-\d{4}\b/g],
    });
    expect(runs.map((r) => r.text)).toContain('KRN-2026-0042');
  });
});

describe('autoIsolate', () => {
  it('is losslessly reversible for every case in the brief', () => {
    for (const source of [BRAND, PHONE, EMAIL, URL, MIXED_LIST]) {
      expect(stripBidi(autoIsolate(source))).toBe(source);
    }
  });

  it('wraps each run in FSI and PDI', () => {
    const out = autoIsolate(BRAND);
    expect(out).toContain(`${FSI}Karnak Holidays 2026${PDI}`);
  });

  it('adds exactly two characters per run', () => {
    const runs = findBidiRuns(MIXED_LIST);
    expect(autoIsolate(MIXED_LIST).length).toBe(MIXED_LIST.length + runs.length * 2);
  });

  it('leaves a single-direction string untouched, by identity', () => {
    const arabic = 'مرحبا بك في مصر';
    expect(autoIsolate(arabic)).toBe(arabic);
    expect(autoIsolate('')).toBe('');
  });

  it('keeps a URL contiguous so it survives copy and paste', () => {
    const out = autoIsolate(URL);
    expect(out).toContain('https://karnak-holidays.com/عروض?ref=ar');
    // No control character anywhere inside the URL itself.
    const start = out.indexOf('https://');
    const end = out.indexOf(PDI, start);
    expect(hasBidiControls(out.slice(start, end))).toBe(false);
  });

  it('keeps an email address contiguous', () => {
    const out = autoIsolate(EMAIL);
    expect(out).toContain('ali@karnak-holidays.com');
  });

  it('keeps a phone number contiguous, digits and separators together', () => {
    const out = autoIsolate(PHONE);
    expect(out).toContain('+20 114 919 9190');
  });

  it('is idempotent — running it twice does not double-wrap', () => {
    const once = autoIsolate(BRAND);
    const twice = autoIsolate(once);
    expect(stripBidi(twice)).toBe(BRAND);
    expect(twice.length).toBe(once.length);
  });
});

describe('autoIsolate — regression guards', () => {
  it('fails loudly if a run ever ends with whitespace', () => {
    // A trailing space inside an isolate is invisible in a screenshot but
    // shifts the following word, which is exactly the bug we are fixing.
    for (const source of [BRAND, PHONE, EMAIL, URL, MIXED_LIST]) {
      for (const run of findBidiRuns(source)) {
        expect(run.text).toBe(run.text.trim());
      }
    }
  });

  it('never produces a run of zero length', () => {
    for (const source of [BRAND, PHONE, EMAIL, URL, MIXED_LIST, 'a', 'م', '']) {
      for (const run of findBidiRuns(source)) {
        expect(run.end).toBeGreaterThan(run.start);
      }
    }
  });
});

describe('regression: idempotence through re-annotation', () => {
  it('does not find new runs once isolates have changed the word boundaries', () => {
    // '...9190www.example.org' has no word boundary before 'www', so the URL
    // pattern does not match. After the phone number is isolated, the PDI
    // creates one — a second pass would isolate the URL that the first pass
    // could not see.
    const source = '+20 114 919 9190www.example.org';
    const once = autoIsolate(source);
    expect(autoIsolate(once)).toBe(once);
    expect(stripBidi(once)).toBe(source);
  });

  it('does not find a sub-match that the first pass had swallowed', () => {
    // '#hashtag1' beats 'hashtag1.2.3', leaving '.2.3' in the gap. Splitting
    // the string at the isolate boundary would expose '2.3' to the dotted
    // identifier pattern on a second pass.
    const source = '#hashtag1.2.3Pro';
    const once = autoIsolate(source);
    expect(autoIsolate(once)).toBe(once);
    expect(stripBidi(once)).toBe(source);
  });

  it('finds the sub-match on the first pass, not the second', () => {
    // The sequential scan restarts from the end of each accepted match, so the
    // dotted identifier left in the gap is found straight away rather than
    // surfacing only once isolation has split the string.
    expect(findBidiRuns('#hashtag1.2.3Pro').map((run) => run.text)).toEqual([
      '#hashtag1',
      '2.3Pro',
    ]);
  });
});

describe('regression: characters outside the Basic Multilingual Plane', () => {
  it('never cuts a surrogate pair in half', () => {
    // Mathematical Bold Latin is a pair of code units. Classifying the low
    // surrogate on its own makes it neutral, which lets a run end between the
    // two halves and emit an isolate that splits a character.
    const source = 'مرحبا 𝐊𝐚𝐫𝐧𝐚𝐤 اليوم';
    for (const run of findBidiRuns(source)) {
      const first = run.text.charCodeAt(0);
      const last = run.text.charCodeAt(run.text.length - 1);
      expect(first >= 0xdc00 && first <= 0xdfff).toBe(false);
      expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
    }
    expect(stripBidi(autoIsolate(source))).toBe(source);
  });

  it('treats an astral Latin run as one unit', () => {
    const runs = findBidiRuns('مرحبا 𝐊𝐚𝐫𝐧𝐚𝐤 اليوم');
    expect(runs).toHaveLength(1);
    expect(runs[0]?.text).toBe('𝐊𝐚𝐫𝐧𝐚𝐤');
  });
});

describe('regression: stray brackets', () => {
  it('ends a run before a closing bracket whose partner is outside it', () => {
    for (const run of findBidiRuns('Holidays.)𝐊𝐚𝐫𝐧𝐚𝐤')) {
      expect(run.text).not.toContain(')');
    }
  });

  it('never lets a URL swallow a trailing opening brace', () => {
    const runs = findBidiRuns('https://karnak.com/عروض?ref=ar{');
    for (const run of runs) {
      expect(run.text.endsWith('{')).toBe(false);
    }
  });
});
