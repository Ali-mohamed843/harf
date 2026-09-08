# @harf/next

Next.js App Router adapter for Harf.

Sets `dir` on `<html>` **server-side** from the locale segment, so there is no flash of wrong direction on first paint. Provides `getDirection()` for server components and `useDirection()` for client ones, with a documented boundary — React context does not cross into RSC. Ships a Tailwind plugin for the mirroring and bidi utilities Tailwind lacks (it deliberately does not reimplement logical spacing, which Tailwind already has).

> **Status: pre-alpha.** Not yet published to npm. See the [root README](../../README.md) for what is and is not built.

## Install

```bash
pnpm add @harf/next
```

## License

[MIT](./LICENSE)
