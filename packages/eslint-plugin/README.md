# @harf/eslint-plugin

ESLint rules with autofix for RTL correctness.

- `no-physical-properties` — flags `marginLeft`/`marginRight`, `paddingLeft`/`paddingRight`, `left`/`right`, `textAlign: 'left' | 'right'` and `borderLeft*`/`borderRight*` in style objects and `StyleSheet.create`.
- `no-physical-tailwind` — flags `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right` in `className` strings and autofixes them to their logical equivalents.
- `require-bidi-isolation` — warns on template literals interpolating a value into a string containing Arabic characters.

> **Status: pre-alpha.** Not yet published to npm. See the [root README](../../README.md) for what is and is not built.

## Install

```bash
pnpm add @harf/eslint-plugin
```

## License

[MIT](./LICENSE)
