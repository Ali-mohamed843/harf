# @harf/eslint-plugin

ESLint rules with autofix for RTL correctness.

```bash
pnpm add -D @harf/eslint-plugin
```

```js
// eslint.config.js
import harf from '@harf/eslint-plugin';

export default [harf.configs.recommended];
```

```js
// .eslintrc.js — legacy config
module.exports = {
  plugins: ['@harf'],
  rules: {
    'harf/no-physical-properties': 'error',
    'harf/no-physical-tailwind': 'error',
    'harf/require-bidi-isolation': 'warn',
  },
};
```

Two configs: `recommended` (the first two as errors, the heuristic as a warning)
and `strict` (all three as errors).

## no-physical-properties

Flags physical style properties and rewrites them. **Autofixable.**

```ts
// Flagged
const styles = StyleSheet.create({
  row: { marginLeft: 8, textAlign: 'left', borderTopLeftRadius: 4 },
});

// Fixed
const styles = StyleSheet.create({
  row: { marginStart: 8, textAlign: 'start', borderTopStartRadius: 4 },
});
```

The scope is deliberately narrow. The rule fires only inside something it can
identify as a style — `StyleSheet.create`, `createStyles`, a `style` JSX
attribute, a `style`/`styles` property, or a variable whose name ends in
`Style`/`Styles`:

```ts
// Not flagged — not a style
const chart = { axis: { left: 0, right: 100 } };
const config = { padding: { left: 4, right: 4 } };
```

A rule that fires on every object with a `left` key is a rule people switch off.

### Options

```js
[
  'error',
  {
    allow: ['marginLeft'], // properties to leave alone
    checkPosition: false, // stop flagging bare `left` / `right`
  },
];
```

## no-physical-tailwind

Flags physical Tailwind classes and rewrites them. **Autofixable.**

```tsx
// Flagged
<div className="ml-4 pr-2 text-left md:mr-8 hover:border-l-2" />

// Fixed
<div className="ms-4 pe-2 text-start md:me-8 hover:border-s-2" />
```

Variant prefixes (`md:`, `hover:`, `dark:`, `group-hover:`), the `!` important
modifier, and the original whitespace all survive the fix, so a multi-line
`className` keeps its formatting.

It also checks `clsx`, `cn`, `cva`, `twMerge` and friends, including object
keys:

```ts
clsx('ml-4', isActive && 'pr-2'); // both flagged
cn({ 'ml-4': isActive }); // the key is flagged
```

### Options

```js
[
  'error',
  {
    attributes: ['tw'], // extra attributes holding class lists
    allow: ['ml-auto'], // classes to leave alone
    callees: ['clsx', 'myCn'], // extra helper functions to check
  },
];
```

## require-bidi-isolation

Warns when a value is interpolated into a string containing Arabic. This is the
most common bug in Arabic apps and it is invisible in review — the source looks
correct and the rendered result reorders.

```ts
// Warns
const greeting = `مرحبا بك في ${brandName} اليوم`;

// Fine
const greeting = `مرحبا بك في ${isolate(brandName)} اليوم`;
const greeting = `Welcome to ${brandName}`; // no RTL text, nothing to reorder
```

It offers an ESLint **suggestion**, not an autofix, and `recommended` sets it to
`warn`. The rule cannot know whether the interpolated value is Latin, and
rewriting your code on a guess would be worse than a warning. A heuristic that
fails a build is a heuristic that gets deleted.

Isolating costs nothing when the value turns out to be Arabic — a first-strong
isolate around Arabic text is a no-op.

### Options

```js
[
  'warn',
  {
    isolateFunction: 'isolate', // the name to suggest
    safeCallees: ['myWrapper'], // extra functions that already isolate
  },
];
```

## License

[MIT](./LICENSE)
