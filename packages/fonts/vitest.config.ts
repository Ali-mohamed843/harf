import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@harf/fonts',
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
