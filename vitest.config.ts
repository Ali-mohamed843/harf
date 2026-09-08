import { defineConfig } from 'vitest/config';

/**
 * Root Vitest config. Individual packages own their own `vitest.config.ts`;
 * this file aggregates them so `pnpm test:watch` at the repo root runs
 * everything in one watcher.
 */
export default defineConfig({
  test: {
    projects: ['packages/*'],
  },
});
