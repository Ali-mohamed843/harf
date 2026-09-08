/**
 * `@harf/next/tailwind` — a Tailwind plugin for the utilities Tailwind lacks.
 *
 * Tailwind already ships logical spacing (`ms-`, `me-`, `ps-`, `pe-`,
 * `start-`, `end-`, `text-start`, `text-end`) and it does that well. This
 * plugin deliberately does **not** reimplement any of it.
 *
 * What it adds is what is genuinely missing: mirroring, bidi isolation, and
 * variants for writing direction-specific styles.
 *
 * The plugin is written against Tailwind's plugin API surface structurally,
 * so it works with `tailwindcss/plugin` without this package taking a
 * dependency on Tailwind.
 *
 * @packageDocumentation
 */

/** The subset of Tailwind's plugin API this plugin uses. */
export interface TailwindPluginApi {
  addUtilities(utilities: Record<string, Record<string, string>>): void;
  addVariant(name: string, definition: string | string[]): void;
}

/**
 * The utilities this plugin adds.
 *
 * Exposed as data so a consumer can inspect exactly what is being registered,
 * and so the tests can assert on it without instantiating Tailwind.
 */
export const HARF_UTILITIES: Readonly<Record<string, Record<string, string>>> =
  Object.freeze({
    // Mirroring. `rtl:mirror` is the common case; `mirror-x` is unconditional
    // for when you already know.
    '.mirror-x': { transform: 'scaleX(-1)' },
    '.mirror-none': { transform: 'none' },

    // Bidi isolation. Tailwind has `isolate` already, but that is CSS
    // `isolation: isolate` — a stacking-context property with nothing to do
    // with text direction. The name collision is a genuine trap, so these are
    // prefixed.
    '.bidi-isolate': { 'unicode-bidi': 'isolate' },
    '.bidi-isolate-override': { 'unicode-bidi': 'isolate-override' },
    '.bidi-embed': { 'unicode-bidi': 'embed' },
    '.bidi-plaintext': { 'unicode-bidi': 'plaintext' },
    '.bidi-normal': { 'unicode-bidi': 'normal' },

    // Direction. Useful for a single LTR island — a code block, a chart axis,
    // a phone number — inside an otherwise RTL page.
    '.dir-ltr': { direction: 'ltr' },
    '.dir-rtl': { direction: 'rtl' },

    // The two together, which is what an embedded LTR run actually needs.
    '.ltr-island': { direction: 'ltr', 'unicode-bidi': 'isolate' },
    '.rtl-island': { direction: 'rtl', 'unicode-bidi': 'isolate' },
  });

/**
 * The variants this plugin adds.
 *
 * `rtl:` and `ltr:` are the important ones. They key off the `dir` attribute,
 * which `@harf/next/server` sets on `<html>` before the first byte of markup
 * is streamed — so they are correct on first paint rather than after
 * hydration.
 */
export const HARF_VARIANTS: Readonly<Record<string, string>> = Object.freeze({
  rtl: '&:where([dir="rtl"], [dir="rtl"] *)',
  ltr: '&:where([dir="ltr"], [dir="ltr"] *)',
  // Matches only when no ancestor sets a direction — useful for a default
  // that must not win over an explicit island.
  'dir-unset': '&:where(:not([dir]) *)',
});

/**
 * Registers Harf's utilities and variants with Tailwind.
 *
 * @example Tailwind v3
 * ```js
 * // tailwind.config.js
 * const plugin = require('tailwindcss/plugin');
 * const { harfTailwind } = require('@harf/next/tailwind');
 *
 * module.exports = {
 *   plugins: [plugin(harfTailwind)],
 * };
 * ```
 *
 * @example What it gives you
 * ```html
 * <!-- Mirrors only under RTL, and only because you said so -->
 * <svg class="rtl:mirror-x">…</svg>
 *
 * <!-- An LTR island inside an Arabic paragraph -->
 * <span class="ltr-island">+20 114 919 9190</span>
 *
 * <!-- Direction-specific spacing, on top of Tailwind's own logical utilities -->
 * <div class="ms-4 rtl:font-arabic">…</div>
 * ```
 *
 * @remarks
 * Tailwind's own `isolate` utility is `isolation: isolate`, a stacking-context
 * property unrelated to text direction. Harf's is `bidi-isolate`, prefixed
 * precisely so the two cannot be confused.
 */
export function harfTailwind(api: TailwindPluginApi): void {
  api.addUtilities({ ...HARF_UTILITIES });
  for (const [name, definition] of Object.entries(HARF_VARIANTS)) {
    api.addVariant(name, definition);
  }
}

/**
 * The same utilities as a plain CSS string, for Tailwind v4 or for a project
 * that does not use Tailwind at all.
 *
 * @example Tailwind v4
 * ```css
 * @import "tailwindcss";
 * @import "@harf/next/harf.css";
 * ```
 *
 * @example Generating the file
 * ```ts
 * import { harfCss } from '@harf/next/tailwind';
 * import { writeFileSync } from 'node:fs';
 *
 * writeFileSync('app/harf.css', harfCss());
 * ```
 */
export function harfCss(): string {
  const rules = Object.entries(HARF_UTILITIES).map(([selector, declarations]) => {
    const body = Object.entries(declarations)
      .map(([property, value]) => `  ${property}: ${value};`)
      .join('\n');
    return `${selector} {\n${body}\n}`;
  });
  return `${rules.join('\n\n')}\n`;
}

export default harfTailwind;
