import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    // A separate entry with no react-native import, so the limits table can be
    // read by a docs site, a script, or anything else that is not a React
    // Native app. React Native ships untranspiled Flow that plain Node and a
    // Next.js server cannot parse.
    limits: 'src/limits.ts',
    testing: 'src/testing.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: [
    'react',
    'react-native',
    '@harf/core',
    '@harf/fonts',
    '@harf/core/react',
    '@harf/core/testing',
    '@testing-library/react-native',
  ],
});
