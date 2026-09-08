# @harf/fonts

Arabic font metric presets.

Arabic typefaces (Cairo, Tajawal, IBM Plex Sans Arabic, Noto Naskh Arabic, Almarai) have larger ascenders and descenders than Latin faces. At the same `fontSize` they render visually smaller **and** clip against a `lineHeight` that is fine for Latin. This package ships per-family corrections and fallback chains that keep mixed Arabic/Latin text from jumping.

> **Status: pre-alpha.** Not yet published to npm. See the [root README](../../README.md) for what is and is not built.

## Install

```bash
pnpm add @harf/fonts
```

## License

[MIT](./LICENSE)
