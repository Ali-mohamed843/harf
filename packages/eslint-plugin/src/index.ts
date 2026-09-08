/**
 * `@harf/eslint-plugin` — ESLint rules with autofix for RTL correctness.
 *
 * Three rules:
 *
 * - `harf/no-physical-properties` — physical style properties in style
 *   objects and `StyleSheet.create`, autofixed to logical ones.
 * - `harf/no-physical-tailwind` — physical Tailwind classes in `className`
 *   strings, autofixed to logical ones.
 * - `harf/require-bidi-isolation` — a heuristic warning on template literals
 *   that interpolate a value into a string containing Arabic text.
 *
 * The module is shaped so the CommonJS namespace object is *itself* a valid
 * ESLint plugin (`{ meta, rules, configs }`), which is what legacy `.eslintrc`
 * resolution gets from `require()`. Flat-config users get the same object as
 * the default export.
 *
 * @packageDocumentation
 */

import type { ESLint, Linter, Rule } from 'eslint';
import { noPhysicalProperties } from './rules/no-physical-properties';
import { noPhysicalTailwind } from './rules/no-physical-tailwind';
import { requireBidiIsolation } from './rules/require-bidi-isolation';

/** Plugin identity, surfaced by ESLint in `--print-config`. */
export const meta: { readonly name: string; readonly version: string } = Object.freeze({
  name: '@harf/eslint-plugin',
  version: '0.0.0',
});

/** Rules exported by this plugin, keyed by name without the `harf/` prefix. */
export const rules: Readonly<Record<string, Rule.RuleModule>> = Object.freeze({
  'no-physical-properties': noPhysicalProperties,
  'no-physical-tailwind': noPhysicalTailwind,
  'require-bidi-isolation': requireBidiIsolation,
});

const basePlugin: ESLint.Plugin = {
  meta: { name: meta.name, version: meta.version },
  rules: rules as Record<string, Rule.RuleModule>,
};

/**
 * Shareable configs.
 *
 * `recommended` turns on the two rules Harf considers correctness issues as
 * errors, and the heuristic one as a warning. A heuristic that fails a build
 * is a heuristic people delete.
 *
 * @example Flat config
 * ```js
 * // eslint.config.js
 * import harf from '@harf/eslint-plugin';
 *
 * export default [harf.configs.recommended];
 * ```
 *
 * @example Legacy config
 * ```js
 * // .eslintrc.js
 * module.exports = {
 *   plugins: ['@harf'],
 *   extends: ['plugin:@harf/recommended'],
 * };
 * ```
 *
 * @example Stricter, once a codebase is clean
 * ```js
 * export default [
 *   harf.configs.strict,
 * ];
 * ```
 */
export const configs: Readonly<Record<'recommended' | 'strict', Linter.Config>> =
  Object.freeze({
    recommended: {
      name: 'harf/recommended',
      plugins: { harf: basePlugin },
      rules: {
        'harf/no-physical-properties': 'error',
        'harf/no-physical-tailwind': 'error',
        // A heuristic that fails the build is a heuristic that gets deleted.
        'harf/require-bidi-isolation': 'warn',
      },
    },
    strict: {
      name: 'harf/strict',
      plugins: { harf: basePlugin },
      rules: {
        'harf/no-physical-properties': 'error',
        'harf/no-physical-tailwind': 'error',
        'harf/require-bidi-isolation': 'error',
      },
    },
  });

/** The Harf ESLint plugin, extended with its shareable configs. */
export interface HarfPlugin extends ESLint.Plugin {
  readonly meta: { readonly name: string; readonly version: string };
  readonly rules: Readonly<Record<string, Rule.RuleModule>>;
  readonly configs: Readonly<Record<'recommended' | 'strict', Linter.Config>>;
}

/**
 * The plugin, ready to drop into a flat config.
 *
 * @example
 * ```js
 * import harf from '@harf/eslint-plugin';
 *
 * export default [harf.configs.recommended];
 * ```
 */
const plugin: HarfPlugin = { meta, rules, configs };

export default plugin;

export { noPhysicalProperties, noPhysicalTailwind, requireBidiIsolation };
export { toLogicalClass } from './rules/no-physical-tailwind';
export { PHYSICAL_TO_LOGICAL } from './rules/no-physical-properties';
