/**
 * `@harf/eslint-plugin` — ESLint rules with autofix for RTL correctness.
 *
 * The rules (`no-physical-properties`, `no-physical-tailwind`,
 * `require-bidi-isolation`) land in M4. This entry exposes the plugin shape and
 * the `recommended` config so downstream configuration can be wired up early.
 *
 * The module is shaped so that the CJS namespace object is *itself* a valid
 * ESLint plugin (`{ meta, rules, configs }`), which is what legacy `.eslintrc`
 * resolution gets from `require()`. Flat config users get the same object as
 * the default export.
 *
 * @packageDocumentation
 */

import type { ESLint, Linter, Rule } from 'eslint';

/** Plugin identity, surfaced by ESLint in `--print-config` and rule reports. */
export const meta: { readonly name: string; readonly version: string } = Object.freeze({
  name: '@harf/eslint-plugin',
  version: '0.0.0',
});

/** Rules exported by this plugin, keyed by rule name (without the `harf/` prefix). */
export const rules: Readonly<Record<string, Rule.RuleModule>> = Object.freeze({});

const basePlugin: ESLint.Plugin = {
  meta: { name: meta.name, version: meta.version },
  rules: rules as Record<string, Rule.RuleModule>,
};

/**
 * Shareable configs. `recommended` turns on every rule Harf considers a
 * correctness issue rather than a preference.
 *
 * @example
 * ```js
 * // eslint.config.js
 * import harf from '@harf/eslint-plugin';
 *
 * export default [
 *   harf.configs.recommended,
 *   { rules: { 'harf/no-physical-tailwind': 'error' } },
 * ];
 * ```
 */
export const configs: Readonly<Record<'recommended', Linter.Config>> = Object.freeze({
  recommended: {
    name: 'harf/recommended',
    plugins: { harf: basePlugin },
    rules: {},
  },
});

/** The Harf ESLint plugin, extended with its shareable configs. */
export interface HarfPlugin extends ESLint.Plugin {
  readonly meta: { readonly name: string; readonly version: string };
  readonly rules: Readonly<Record<string, Rule.RuleModule>>;
  readonly configs: Readonly<Record<'recommended', Linter.Config>>;
}

/**
 * The plugin, ready to drop into a flat config.
 *
 * @example
 * ```js
 * // eslint.config.js
 * import harf from '@harf/eslint-plugin';
 *
 * export default [harf.configs.recommended];
 * ```
 */
const plugin: HarfPlugin = { meta, rules, configs };

export default plugin;
