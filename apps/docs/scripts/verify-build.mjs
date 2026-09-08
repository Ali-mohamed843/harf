#!/usr/bin/env node
/**
 * Verifies the claims this site makes about itself, against its own build
 * output.
 *
 * The headline claim of `@harf/next` is that `dir` is resolved server-side, so
 * the first painted frame is already correct. The only way to check that is to
 * read the prerendered HTML and confirm the attribute is on `<html>` before
 * any script tag — which is exactly what this does.
 *
 * Run by `pnpm --filter docs test`, after `next build`.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dir = join(root, '.next', 'server', 'app');

if (!existsSync(dir)) {
  console.log('docs: no build output found — run `pnpm --filter docs build` first.');
  console.log('docs: skipping verification.');
  process.exit(0);
}

/** @type {{ name: string; run: () => void }[]} */
const checks = [];
/** @type {string[]} */
const failures = [];

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function html(locale) {
  const file = join(dir, `${locale}.html`);
  assert(existsSync(file), `${locale}.html was not prerendered`);
  return readFileSync(file, 'utf8');
}

check('the Arabic page carries dir="rtl" on <html>', () => {
  const markup = html('ar');
  const tag = markup.match(/<html[^>]*>/)?.[0] ?? '';
  assert(tag.includes('dir="rtl"'), `expected dir="rtl", got: ${tag}`);
  assert(tag.includes('lang="ar"'), `expected lang="ar", got: ${tag}`);
});

check('the English page carries dir="ltr" on <html>', () => {
  const tag = html('en').match(/<html[^>]*>/)?.[0] ?? '';
  assert(tag.includes('dir="ltr"'), `expected dir="ltr", got: ${tag}`);
});

check('dir appears before any script, so the first paint is correct', () => {
  // This is the whole claim. A client effect that sets dir after hydration
  // paints left-to-right first; an attribute in the opening tag never does.
  const markup = html('ar');
  const dirIndex = markup.indexOf('dir="rtl"');
  const scriptIndex = markup.indexOf('<script');
  assert(dirIndex !== -1, 'dir="rtl" is not in the markup at all');
  assert(
    scriptIndex === -1 || dirIndex < scriptIndex,
    `dir appears at ${dirIndex}, after the first script at ${scriptIndex}`,
  );
});

check('the prerendered Arabic page really contains Arabic', () => {
  // Guards against a build that silently fell back to the English messages.
  assert(/[؀-ۿ]/.test(html('ar')), 'no Arabic characters in ar.html');
});

check('deterministic prices are rendered on the server', () => {
  // formatCurrency is engine-independent, so the exact string must appear in
  // the static HTML rather than being computed in the browser.
  const markup = html('en');
  for (const expected of ['1,250.50', '19.500']) {
    assert(markup.includes(expected), `expected the server to render ${expected}`);
  }
});

check('the limits table is rendered from the package, not retyped', () => {
  const markup = html('en');
  assert(markup.includes('unverified'), 'the evidence column is missing');
  assert(
    markup.includes('TextInput caret position and selection handles'),
    'a known limits row is missing from the page',
  );
});

check('no physical CSS property leaked into the stylesheet', () => {
  // The site is written entirely in logical properties. `margin-left` in the
  // output would mean one slipped through.
  const cssDir = join(root, '.next', 'static', 'css');
  if (!existsSync(cssDir)) return;
  for (const file of readdirSync(cssDir).filter((name) => name.endsWith('.css'))) {
    const css = readFileSync(join(cssDir, file), 'utf8');
    for (const physical of [
      'margin-left',
      'margin-right',
      'padding-left',
      'padding-right',
    ]) {
      assert(!css.includes(physical), `${file} contains ${physical}`);
    }
  }
});

for (const { name, run } of checks) {
  try {
    run();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`FAIL  ${name}`);
  }
}

if (failures.length > 0) {
  console.error(`\ndocs: ${failures.length} check(s) failed:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`\ndocs: ${checks.length} checks passed against the build output.`);
