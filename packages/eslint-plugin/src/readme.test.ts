/**
 * Every literal output the READMEs claim for `@harf/eslint-plugin`.
 *
 * See `packages/core/src/readme.test.ts` for the rule these files enforce:
 * no README states a result that is not backed by a test.
 */

import { describe, expect, it } from 'vitest';
import { toLogicalClass } from './rules/no-physical-tailwind';
import plugin from './index';

describe('@harf/eslint-plugin README — the fix example', () => {
  it('rewrites every class in the documented before/after pair', () => {
    const before = 'ml-4 pr-2 text-left md:mr-8 hover:border-l-2'.split(' ');
    const after = 'ms-4 pe-2 text-start md:me-8 hover:border-s-2'.split(' ');
    expect(before.map((c) => toLogicalClass(c) ?? c)).toEqual(after);
  });

  it('ships the three rules the README documents, under the names it uses', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual([
      'no-physical-properties',
      'no-physical-tailwind',
      'require-bidi-isolation',
    ]);
  });

  it('sets the severities the README table claims', () => {
    // The heuristic is a warning on purpose; a heuristic that fails a build is
    // a heuristic that gets deleted.
    const rules = plugin.configs.recommended.rules ?? {};
    expect(rules['harf/no-physical-properties']).toBe('error');
    expect(rules['harf/no-physical-tailwind']).toBe('error');
    expect(rules['harf/require-bidi-isolation']).toBe('warn');
  });
});
