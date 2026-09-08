import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@harf/native',
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
