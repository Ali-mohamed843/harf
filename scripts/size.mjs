#!/usr/bin/env node
/**
 * Measures what each package actually costs a consumer.
 *
 * Reports minified + gzipped bytes for the whole entry point, and — because
 * every Harf module is side-effect free — for a handful of realistic partial
 * imports, which is what a tree-shaking bundler will really include.
 *
 * Run with `pnpm size` after `pnpm build`.
 */

import { gzipSync } from 'node:zlib';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

/** Realistic import shapes, as a consumer would write them. */
const SCENARIOS = [
  {
    name: '@harf/core — everything',
    from: '@harf/core',
    code: `export * from '@harf/core';`,
  },
  {
    name: '@harf/core — direction + logical styles only',
    from: '@harf/core',
    code: `
      import { createStyles, resolveStyle, directionForLocale } from '@harf/core';
      export { createStyles, resolveStyle, directionForLocale };
    `,
  },
  {
    name: '@harf/core — bidi isolation only',
    from: '@harf/core',
    code: `
      import { isolate, autoIsolate, stripBidi } from '@harf/core';
      export { isolate, autoIsolate, stripBidi };
    `,
  },
  {
    name: '@harf/core — numerals only',
    from: '@harf/core',
    code: `
      import { toArabicDigits, toWesternDigits } from '@harf/core';
      export { toArabicDigits, toWesternDigits };
    `,
  },
  {
    name: '@harf/core — currency only',
    from: '@harf/core',
    code: `
      import { formatCurrency, formatNumber } from '@harf/core';
      export { formatCurrency, formatNumber };
    `,
  },
  {
    name: '@harf/core — mirroring registry only',
    from: '@harf/core',
    code: `
      import { shouldMirror, mirrorIf } from '@harf/core';
      export { shouldMirror, mirrorIf };
    `,
  },
  {
    name: '@harf/core/testing',
    from: '@harf/core/testing',
    code: `export * from '@harf/core/testing';`,
  },
  {
    name: '@harf/react — everything',
    from: '@harf/react',
    code: `export * from '@harf/react';`,
    external: ['react', 'react/jsx-runtime'],
  },
  {
    name: '@harf/native — everything',
    from: '@harf/native',
    code: `export * from '@harf/native';`,
    external: ['react', 'react/jsx-runtime', 'react-native'],
  },
  {
    name: '@harf/react — provider + hooks only',
    from: '@harf/react',
    code: `
      import { DirectionProvider, useDirection, useLogicalStyles } from '@harf/react';
      export { DirectionProvider, useDirection, useLogicalStyles };
    `,
    external: ['react', 'react/jsx-runtime'],
  },
  {
    name: '@harf/fonts — everything',
    from: '@harf/fonts',
    code: `export * from '@harf/fonts';`,
  },
];

function format(bytes) {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(2)} KB`;
}

// The workspace packages are not linked into the repo root's node_modules,
// so point esbuild straight at each package's built entry instead of relying
// on Node resolution.
const root = process.cwd();
const ALIAS = {
  '@harf/core': join(root, 'packages/core/dist/index.js'),
  '@harf/core/react': join(root, 'packages/core/dist/react.js'),
  '@harf/core/testing': join(root, 'packages/core/dist/testing.js'),
  '@harf/react/testing': join(root, 'packages/react/dist/testing.js'),
  '@harf/native/testing': join(root, 'packages/native/dist/testing.js'),
  '@harf/react': join(root, 'packages/react/dist/index.js'),
  '@harf/native': join(root, 'packages/native/dist/index.js'),
  '@harf/next': join(root, 'packages/next/dist/index.js'),
  '@harf/fonts': join(root, 'packages/fonts/dist/index.js'),
  '@harf/eslint-plugin': join(root, 'packages/eslint-plugin/dist/index.js'),
};

const dir = join(root, '.harf-size');
mkdirSync(dir, { recursive: true });

try {
  const rows = [];

  for (const scenario of SCENARIOS) {
    const entry = join(dir, 'entry.js');
    writeFileSync(entry, scenario.code);

    let output;
    try {
      const result = await build({
        entryPoints: [entry],
        bundle: true,
        minify: true,
        format: 'esm',
        target: 'es2022',
        write: false,
        treeShaking: true,
        external: scenario.external ?? [],
        alias: ALIAS,
        absWorkingDir: process.cwd(),
        logLevel: 'silent',
      });
      output = result.outputFiles[0].text;
    } catch (error) {
      rows.push({
        name: scenario.name,
        min: 'n/a',
        gzip: 'not built',
        error: String(error.message ?? error).split(/\r?\n/)[0],
      });
      continue;
    }

    rows.push({
      name: scenario.name,
      min: format(Buffer.byteLength(output)),
      gzip: format(gzipSync(output).length),
    });
  }

  const nameWidth = Math.max(...rows.map((row) => row.name.length), 'Import'.length);
  const line = (a, b, c) =>
    `| ${a.padEnd(nameWidth)} | ${b.padStart(9)} | ${c.padStart(11)} |`;

  console.log('');
  console.log(line('Import', 'Minified', 'min + gzip'));
  console.log(`|${'-'.repeat(nameWidth + 2)}|${'-'.repeat(11)}|${'-'.repeat(13)}|`);
  for (const row of rows) console.log(line(row.name, row.min, row.gzip));
  const failures = rows.filter((row) => row.error);
  if (failures.length > 0) {
    console.log('');
    for (const row of failures) console.log(`  ${row.name}: ${row.error}`);
  }
  console.log('');
  console.log('Measured with esbuild --minify --bundle, peer dependencies excluded.');
  console.log('Regenerate with: pnpm build && pnpm size');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
