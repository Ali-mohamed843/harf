import { defineConfig, type Options } from 'tsup';

const shared: Options = {
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  target: 'es2022',
  external: [
    'react',
    'react-dom',
    'next',
    '@harf/core',
    '@harf/core/react',
    '@harf/fonts',
    '@harf/react',
  ],
};

// Two configs rather than one so the client and server entries stay separate:
// `server.ts` must never be treated as a client module. The 'use client'
// directive itself is added by scripts/use-client.mjs after the build, because
// tsup's `banner` does not survive its bundling stage.
export default defineConfig([
  {
    ...shared,
    entry: { index: 'src/index.tsx' },
    clean: true,
  },
  {
    ...shared,
    entry: { server: 'src/server.ts', tailwind: 'src/tailwind.ts' },
    clean: false,
  },
]);
