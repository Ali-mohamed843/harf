# @harf/native

React Native adapter for Harf.

The headline feature: **switching direction without an app restart.** `I18nManager.forceRTL()` requires a full reload, which is why Arabic React Native apps flash white and restart when the user changes language. Harf implements direction at the style layer instead, so a direction change is an ordinary React re-render.

Some React Native components are laid out by native code that reads `I18nManager.isRTL` and cannot be corrected from JavaScript. The README at the repository root carries an honest limits table saying exactly which ones, and whether Harf handles, partially handles, or cannot handle each.

> **Status: pre-alpha.** Not yet published to npm. See the [root README](../../README.md) for what is and is not built.

## Install

```bash
pnpm add @harf/native
```

## License

[MIT](./LICENSE)
