#!/usr/bin/env node
/**
 * Prepends the `'use client'` directive to built files.
 *
 * tsup's own `banner` option does not survive its bundling stage in the
 * version we build with — the directive is silently dropped — and a directive
 * in the *source* is stripped as dead code. Doing it as an explicit post-build
 * step is the only version-independent way, and it is asserted by a test so it
 * cannot regress unnoticed.
 *
 * Without the directive Next.js treats these modules as server components and
 * the build fails on the first `useState`.
 *
 * Usage: node scripts/use-client.mjs dist/index.js dist/index.cjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { argv, exit } from 'node:process';

const DIRECTIVE = "'use client';";
const files = argv.slice(2);

if (files.length === 0) {
  console.error('use-client: no files given');
  exit(1);
}

let changed = 0;
for (const file of files) {
  if (!existsSync(file)) {
    console.error(`use-client: ${file} does not exist`);
    exit(1);
  }

  const source = readFileSync(file, 'utf8');
  // Already there, or there under double quotes.
  if (/^\s*['"]use client['"]/.test(source)) continue;

  // A CommonJS bundle opens with 'use strict'; the client directive has to
  // come first, because a directive prologue ends at the first statement.
  const withoutStrict = source.replace(/^\s*['"]use strict['"];?\r?\n/, '');
  const hadStrict = withoutStrict !== source;

  writeFileSync(
    file,
    hadStrict
      ? `${DIRECTIVE}\n'use strict';\n${withoutStrict}`
      : `${DIRECTIVE}\n${source}`,
  );
  changed += 1;
}

if (changed > 0) console.log(`use-client: annotated ${changed} file(s)`);
