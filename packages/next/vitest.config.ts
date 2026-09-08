import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@harf/next',
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
