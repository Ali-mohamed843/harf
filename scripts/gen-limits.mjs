#!/usr/bin/env node
/**
 * Regenerates the React Native limits table in the root README.
 *
 * The table is *generated*, not written by hand, so the honest-limits claim in
 * the README and the `LIMITS` data the runtime uses cannot drift apart. Run it
 * whenever a row changes:
 *
 * ```bash
 * pnpm docs:limits
 * ```
 *
 * The source module is bundled with esbuild rather than imported directly,
 * because `@harf/native`'s built entry pulls in React Native, which ships
 * untranspiled Flow that Node cannot parse.
 */

import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

const ROOT = process.cwd();
const README = join(ROOT, 'README.md');
const START = '<!-- BEGIN GENERATED LIMITS TABLE -->';
const END = '<!-- END GENERATED LIMITS TABLE -->';

const bundle = await build({
  entryPoints: [join(ROOT, 'packages/native/src/limits.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'silent',
});

const code = bundle.outputFiles[0].text;
const module = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

const table = module.limitsAsMarkdown();

const counts = module.LIMITS.reduce((acc, limit) => {
  acc[limit.status] = (acc[limit.status] ?? 0) + 1;
  acc[`evidence:${limit.evidence}`] = (acc[`evidence:${limit.evidence}`] ?? 0) + 1;
  return acc;
}, {});

const summary = [
  `> ${counts.handled ?? 0} handled from JavaScript · ` +
    `${counts.partial ?? 0} partial · ` +
    `${counts['needs-restart'] ?? 0} need \`forceRTL\` and a restart · ` +
    `${counts['not-applicable'] ?? 0} not applicable.`,
  '>',
  `> Evidence: ${counts['evidence:measured'] ?? 0} measured, ` +
    `${counts['evidence:reasoned'] ?? 0} reasoned from React Native's layout model, ` +
    `${counts['evidence:unverified'] ?? 0} **unverified**.`,
].join('\n');

const readme = readFileSync(README, 'utf8');
const startIndex = readme.indexOf(START);
const endIndex = readme.indexOf(END);

if (startIndex === -1 || endIndex === -1) {
  console.error(`gen-limits: markers not found in ${README}`);
  console.log(`\n${summary}\n\n${table}\n`);
  process.exit(1);
}

const next =
  readme.slice(0, startIndex + START.length) +
  `\n\n${summary}\n\n${table}\n\n` +
  readme.slice(endIndex);

writeFileSync(README, next);
console.log(`gen-limits: wrote ${module.LIMITS.length} rows to README.md`);
console.log(summary.replace(/^> ?/gm, ''));

// Guard the claim the whole table rests on.
const overclaimed = module.LIMITS.filter(
  (limit) => limit.status === 'handled' && limit.evidence === 'unverified',
);
if (overclaimed.length > 0) {
  console.error(
    `gen-limits: ${overclaimed.length} row(s) claim 'handled' without evidence:`,
  );
  for (const limit of overclaimed) console.error(`  - ${limit.subject}`);
  process.exit(1);
}

void pathToFileURL;
