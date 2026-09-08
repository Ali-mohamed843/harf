import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDirection, htmlDirectionProps, negotiateLocale } from './server';
import { HARF_UTILITIES, HARF_VARIANTS, harfCss, harfTailwind } from './tailwind';

describe('getDirection — the server-side counterpart to useDirection', () => {
  it('resolves RTL locales', () => {
    for (const locale of ['ar', 'ar-EG', 'he-IL', 'fa', 'ur-PK']) {
      expect(getDirection({ locale })).toBe('rtl');
    }
  });

  it('resolves LTR locales', () => {
    for (const locale of ['en', 'en-US', 'fr-FR', 'ja']) {
      expect(getDirection({ locale })).toBe('ltr');
    }
  });

  it('falls back rather than throwing on a missing or unparseable locale', () => {
    expect(getDirection({})).toBe('ltr');
    expect(getDirection({ locale: '' })).toBe('ltr');
    expect(getDirection({ locale: '!!!' })).toBe('ltr');
  });

  it('honours an explicit fallback', () => {
    expect(getDirection({ fallback: 'rtl' })).toBe('rtl');
    expect(getDirection({ locale: '', fallback: 'rtl' })).toBe('rtl');
  });

  it('does not import react, so it is safe in any server context', async () => {
    // A server module that pulls in react would drag client-only code into an
    // RSC graph. Assert on the built output rather than trusting the source.
    const source = await import('./server');
    expect(typeof source.getDirection).toBe('function');
    expect(Object.keys(source)).not.toContain('useDirection');
  });
});

describe('htmlDirectionProps — no flash of wrong direction', () => {
  it('produces both attributes for <html>', () => {
    expect(htmlDirectionProps('ar-EG')).toEqual({ lang: 'ar-EG', dir: 'rtl' });
    expect(htmlDirectionProps('en-US')).toEqual({ lang: 'en-US', dir: 'ltr' });
  });

  it('is a pure function of the locale, computed before any HTML is streamed', () => {
    // The point: this value exists before the first byte of markup, so the
    // first painted frame is already in the right direction. A client effect
    // that sets dir after hydration paints LTR first, which is the bug.
    const first = htmlDirectionProps('ar-EG');
    const second = htmlDirectionProps('ar-EG');
    expect(first).toEqual(second);
  });

  it('preserves the locale exactly, casing and all', () => {
    expect(htmlDirectionProps('ar-EG').lang).toBe('ar-EG');
    expect(htmlDirectionProps('zh-Hant-TW').lang).toBe('zh-Hant-TW');
  });

  it('honours the fallback for an unparseable locale', () => {
    expect(htmlDirectionProps('', 'rtl').dir).toBe('rtl');
  });
});

describe('negotiateLocale', () => {
  it('prefers an exact match', () => {
    expect(negotiateLocale('ar-EG,en;q=0.8', ['en', 'ar-EG'])).toBe('ar-EG');
  });

  it('honours quality values', () => {
    expect(negotiateLocale('en;q=0.5,ar-EG;q=0.9', ['en', 'ar-EG'])).toBe('ar-EG');
    expect(negotiateLocale('en;q=0.9,ar-EG;q=0.5', ['en', 'ar-EG'])).toBe('en');
  });

  it('falls back to a language-only match', () => {
    // An ar-SA browser is served by ar-EG support, which is nearly always what
    // you want, rather than being dropped to English.
    expect(negotiateLocale('ar-SA', ['en', 'ar-EG'])).toBe('ar-EG');
    expect(negotiateLocale('en-AU', ['en-GB', 'ar'])).toBe('en-GB');
  });

  it('returns the first supported locale when nothing matches', () => {
    expect(negotiateLocale('ja,ko;q=0.8', ['en', 'ar-EG'])).toBe('en');
  });

  it('handles a missing or empty header', () => {
    expect(negotiateLocale(null, ['en', 'ar'])).toBe('en');
    expect(negotiateLocale(undefined, ['en', 'ar'])).toBe('en');
    expect(negotiateLocale('', ['en', 'ar'])).toBe('en');
  });

  it('ignores entries with q=0', () => {
    expect(negotiateLocale('ar;q=0,en', ['en', 'ar'])).toBe('en');
  });

  it('is case-insensitive', () => {
    expect(negotiateLocale('AR-eg', ['en', 'ar-EG'])).toBe('ar-EG');
  });

  it('survives a malformed header rather than throwing', () => {
    for (const header of [';;;', 'q=', ',,,', 'ar;q=notanumber']) {
      expect(() => negotiateLocale(header, ['en', 'ar'])).not.toThrow();
    }
  });

  it('never returns a locale the app does not support', () => {
    const supported = ['en', 'ar-EG'];
    for (const header of ['ja', 'ar-SA', 'fr;q=0.9,de;q=0.8', '', 'xx-YY']) {
      expect(supported).toContain(negotiateLocale(header, supported));
    }
  });
});

describe('the Tailwind plugin', () => {
  it('does not reimplement Tailwind’s own logical spacing', () => {
    // Tailwind already ships ms-, me-, ps-, pe-, start-, end-, text-start and
    // text-end, and does them well. Shadowing them would be worse than useless.
    const selectors = Object.keys(HARF_UTILITIES);
    for (const owned of [
      '.ms-4',
      '.me-4',
      '.ps-4',
      '.pe-4',
      '.text-start',
      '.text-end',
    ]) {
      expect(selectors).not.toContain(owned);
    }
    for (const selector of selectors) {
      expect(selector).not.toMatch(/^\.(ms|me|ps|pe|start|end)-/);
    }
  });

  it('adds the mirroring utilities', () => {
    expect(HARF_UTILITIES['.mirror-x']).toEqual({ transform: 'scaleX(-1)' });
    expect(HARF_UTILITIES['.mirror-none']).toEqual({ transform: 'none' });
  });

  it('prefixes its bidi utility, because Tailwind’s `isolate` means something else', () => {
    // Tailwind's `isolate` is CSS `isolation: isolate`, a stacking-context
    // property with nothing to do with text direction. Reusing the name would
    // be a genuine trap.
    expect(Object.keys(HARF_UTILITIES)).not.toContain('.isolate');
    expect(HARF_UTILITIES['.bidi-isolate']).toEqual({ 'unicode-bidi': 'isolate' });
  });

  it('adds an island utility combining direction and isolation', () => {
    expect(HARF_UTILITIES['.ltr-island']).toEqual({
      direction: 'ltr',
      'unicode-bidi': 'isolate',
    });
  });

  it('adds rtl: and ltr: variants keyed off the dir attribute', () => {
    // dir is set server-side by htmlDirectionProps, so these variants are
    // correct on first paint rather than after hydration.
    expect(HARF_VARIANTS.rtl).toContain('[dir="rtl"]');
    expect(HARF_VARIANTS.ltr).toContain('[dir="ltr"]');
  });

  it('registers everything through the plugin API', () => {
    const utilities: Record<string, Record<string, string>>[] = [];
    const variants: [string, string | string[]][] = [];

    harfTailwind({
      addUtilities: (u) => utilities.push(u),
      addVariant: (name, definition) => variants.push([name, definition]),
    });

    expect(utilities).toHaveLength(1);
    expect(Object.keys(utilities[0] ?? {})).toEqual(Object.keys(HARF_UTILITIES));
    expect(variants.map(([name]) => name)).toEqual(Object.keys(HARF_VARIANTS));
  });

  it('does not hand Tailwind its own frozen object to mutate', () => {
    let received: Record<string, unknown> | undefined;
    harfTailwind({
      addUtilities: (u) => {
        received = u;
      },
      addVariant: () => {},
    });
    expect(received).not.toBe(HARF_UTILITIES);
    expect(received).toEqual(HARF_UTILITIES);
  });

  it('emits valid CSS for a project not using Tailwind', () => {
    const css = harfCss();
    expect(css).toContain('.mirror-x {');
    expect(css).toContain('transform: scaleX(-1);');
    expect(css).toContain('unicode-bidi: isolate;');
    // Braces balance, so the output parses.
    expect((css.match(/\{/g) ?? []).length).toBe((css.match(/\}/g) ?? []).length);
    expect((css.match(/\{/g) ?? []).length).toBe(Object.keys(HARF_UTILITIES).length);
  });
});

describe('the client/server boundary in the built output', () => {
  const read = (relative: string): string =>
    readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');

  const built = (relative: string): boolean =>
    existsSync(new URL(`../${relative}`, import.meta.url));

  it("marks the client entry with 'use client'", () => {
    // Without the directive Next.js treats every re-exported hook as a server
    // component and the build fails on the first useState. tsup's own banner
    // option does not survive its bundling stage, so this is added by
    // scripts/use-client.mjs — and asserted here so it cannot regress.
    if (!built('dist/index.js')) return;
    expect(read('dist/index.js').startsWith("'use client';")).toBe(true);
    expect(read('dist/index.cjs').startsWith("'use client';")).toBe(true);
  });

  it("never marks the server entry with 'use client'", () => {
    // getDirection exists precisely because context cannot cross into a server
    // component. Marking its module as client-only would defeat the purpose.
    if (!built('dist/server.js')) return;
    expect(read('dist/server.js')).not.toContain('use client');
    expect(read('dist/server.cjs')).not.toContain('use client');
  });

  it("never marks the Tailwind plugin with 'use client'", () => {
    if (!built('dist/tailwind.js')) return;
    expect(read('dist/tailwind.js')).not.toContain('use client');
  });

  it("keeps 'use strict' after the directive in the CJS bundle", () => {
    // A directive prologue ends at the first statement, so 'use client' has to
    // come first or it is not a directive at all.
    if (!built('dist/index.cjs')) return;
    const lines = read('dist/index.cjs').split('\n');
    expect(lines[0]).toBe("'use client';");
    expect(lines[1]).toBe("'use strict';");
  });
});
