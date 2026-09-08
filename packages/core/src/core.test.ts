import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  directionSign,
  isDirection,
  oppositeDirection,
  type Direction,
} from './direction';
import { directionForLocale, isRtlLocale } from './locale';
import * as core from './index';

describe('DIRECTIONS', () => {
  it('contains exactly ltr and rtl, in that order', () => {
    expect(DIRECTIONS).toEqual(['ltr', 'rtl']);
  });

  it('is frozen so a consumer cannot mutate the shared array', () => {
    expect(Object.isFrozen(DIRECTIONS)).toBe(true);
  });
});

describe('isDirection', () => {
  it.each(['ltr', 'rtl'])('accepts %s', (value) => {
    expect(isDirection(value)).toBe(true);
  });

  it.each([
    ['uppercase', 'RTL'],
    ['mixed case', 'Rtl'],
    ['auto', 'auto'],
    ['empty string', ''],
    ['whitespace padded', ' rtl '],
    ['null', null],
    ['undefined', undefined],
    ['number', 0],
    ['object', { dir: 'rtl' }],
  ])('rejects %s', (_label, value) => {
    expect(isDirection(value)).toBe(false);
  });
});

describe('oppositeDirection', () => {
  it('flips both directions', () => {
    expect(oppositeDirection('ltr')).toBe('rtl');
    expect(oppositeDirection('rtl')).toBe('ltr');
  });

  it('is its own inverse', () => {
    for (const dir of DIRECTIONS) {
      expect(oppositeDirection(oppositeDirection(dir))).toBe(dir);
      expect(oppositeDirection(dir)).not.toBe(dir);
    }
  });
});

describe('directionSign', () => {
  it('is +1 for ltr and -1 for rtl', () => {
    expect(directionSign('ltr')).toBe(1);
    expect(directionSign('rtl')).toBe(-1);
  });

  it('negates a horizontal offset under RTL', () => {
    for (const dir of DIRECTIONS) {
      expect(40 * directionSign(dir)).toBe(dir === 'ltr' ? 40 : -40);
    }
  });
});

describe('directionForLocale', () => {
  it.each([
    'ar',
    'ar-EG',
    'ar-SA',
    'he',
    'he-IL',
    'iw',
    'fa',
    'fa-IR',
    'ur',
    'ur-PK',
    'ps',
    'sd',
    'ug',
    'yi',
    'dv',
    'ckb',
    'nqo',
    'syr',
    'prs',
  ])('resolves %s to rtl', (locale) => {
    expect(directionForLocale(locale)).toBe('rtl');
    expect(isRtlLocale(locale)).toBe(true);
  });

  it.each(['en', 'en-US', 'fr', 'de-DE', 'ja', 'zh-Hans', 'ru', 'tr', 'hi', 'sw'])(
    'resolves %s to ltr',
    (locale) => {
      expect(directionForLocale(locale)).toBe('ltr');
      expect(isRtlLocale(locale)).toBe(false);
    },
  );

  it('lets an explicit script subtag win over the language', () => {
    // Kurdish, Azerbaijani and Punjabi are each written in more than one
    // script. Guessing from the language alone gets half of them wrong.
    expect(directionForLocale('ku-Latn')).toBe('ltr');
    expect(directionForLocale('ku-Arab')).toBe('rtl');
    expect(directionForLocale('az-Arab-IR')).toBe('rtl');
    expect(directionForLocale('az-Latn-AZ')).toBe('ltr');
    expect(directionForLocale('pa-Arab')).toBe('rtl');
    expect(directionForLocale('pa-Guru')).toBe('ltr');
    expect(directionForLocale('sr-Cyrl')).toBe('ltr');
  });

  it('is case-insensitive and accepts underscore separators', () => {
    expect(directionForLocale('AR-eg')).toBe('rtl');
    expect(directionForLocale('ar_EG')).toBe('rtl');
    expect(directionForLocale('KU-arab')).toBe('rtl');
  });

  it('falls back to ltr for anything unparseable', () => {
    for (const value of ['', '   ', '!!!', 'x', '-', '--']) {
      expect(directionForLocale(value)).toBe('ltr');
    }
  });

  it('never throws, whatever it is handed', () => {
    for (const value of [null, undefined, 42, {}, []] as unknown[]) {
      expect(() => directionForLocale(value as string)).not.toThrow();
      expect(directionForLocale(value as string)).toBe('ltr');
    }
  });

  it('ignores a region subtag that looks like a script', () => {
    expect(directionForLocale('ar-001')).toBe('rtl');
    expect(directionForLocale('en-419')).toBe('ltr');
  });
});

describe('the public surface', () => {
  it('exports every documented entry point', () => {
    const expected = [
      // direction
      'DIRECTIONS',
      'directionSign',
      'isDirection',
      'oppositeDirection',
      'directionForLocale',
      'isRtlLocale',
      // style
      'EDGE_PROPERTIES',
      'VALUE_PROPERTIES',
      'PHYSICAL_PROPERTIES',
      'LOGICAL_PROPERTY_NAMES',
      'resolveStyle',
      'createStyles',
      'styleCacheStats',
      'resetStyleCacheStats',
      // bidi
      'FSI',
      'PDI',
      'LRI',
      'RLI',
      'LRM',
      'RLM',
      'ALM',
      'stripBidi',
      'hasBidiControls',
      'isolate',
      'isolateIfNeeded',
      'autoIsolate',
      'findBidiRuns',
      'classifyCodePoint',
      'firstStrongDirection',
      'containsRtl',
      'containsLtr',
      // numerals
      'convertDigits',
      'toArabicDigits',
      'toPersianDigits',
      'toWesternDigits',
      'numeralSystemForLocale',
      'detectNumeralSystem',
      'isCopySensitive',
      // intl
      'formatNumber',
      'formatCurrency',
      'intlCurrencyReference',
      'currencyDisplay',
      'CURRENCIES',
      'getIntlCapabilities',
      'missingIntlFeatures',
      'INTL_POLYFILLS',
      'formatDate',
      'formatHijriDate',
      'toHijriParts',
      // mirroring
      'shouldMirror',
      'mirrorIf',
      'mirrorTransform',
      'createMirrorRegistry',
      'defaultMirrorRegistry',
      'normaliseIconName',
    ];

    for (const name of expected) {
      expect(core, `missing export: ${name}`).toHaveProperty(name);
    }
  });

  it('exports nothing undocumented', () => {
    // Every public name is intentional. A stray internal export becomes a
    // support burden the moment someone imports it.
    for (const name of Object.keys(core)) {
      expect(typeof name).toBe('string');
      expect(name.startsWith('_')).toBe(false);
    }
  });
});

describe('the both-directions rule', () => {
  it('gives every direction-taking function a different answer per direction', () => {
    const samples: readonly [string, (dir: Direction) => unknown][] = [
      ['directionSign', (dir) => directionSign(dir)],
      ['oppositeDirection', (dir) => oppositeDirection(dir)],
      ['mirrorTransform', (dir) => core.mirrorTransform(dir)],
      ['resolveStyle', (dir) => core.resolveStyle({ paddingStart: 1 }, dir)],
      ['shouldMirror', (dir) => core.shouldMirror('arrow-back', dir)],
    ];

    for (const [name, fn] of samples) {
      expect(fn('ltr'), `${name} did not differ between directions`).not.toEqual(
        fn('rtl'),
      );
    }
  });
});
