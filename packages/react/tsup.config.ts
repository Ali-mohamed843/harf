import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.tsx', testing: 'src/testing.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: [
    'react',
    'react-dom',
    '@harf/core',
    '@harf/fonts',
    '@harf/core/react',
    '@harf/core/testing',
    '@testing-library/react',
  ],
});
