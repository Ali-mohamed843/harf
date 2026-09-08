import { describe, expect, it } from 'vitest';
import plugin, { configs, meta, rules } from './index';

describe('@harf/eslint-plugin', () => {
  it('exposes a plugin object with meta, rules and configs', () => {
    expect(plugin.meta.name).toBe('@harf/eslint-plugin');
    expect(plugin.rules).toBe(rules);
    expect(plugin.configs).toBe(configs);
  });

  it('exports meta, rules and configs as named exports too, so the CJS namespace object is itself a valid plugin', () => {
    // Legacy `.eslintrc` resolution does `require('@harf/eslint-plugin')` and
    // uses the resulting namespace object directly. If any of these were only
    // reachable via `.default`, that path would silently see an empty plugin.
    expect(meta).toBeDefined();
    expect(rules).toBeDefined();
    expect(configs).toBeDefined();
  });

  it('ships a recommended config that registers itself under the harf prefix', () => {
    expect(configs.recommended.name).toBe('harf/recommended');
    expect(configs.recommended.plugins).toHaveProperty('harf');
  });

  it('registers every exported rule name without the harf/ prefix', () => {
    for (const name of Object.keys(rules)) {
      expect(name.startsWith('harf/')).toBe(false);
    }
  });
});
