/**
 * `@harf/next` — Next.js App Router adapter for Harf.
 *
 * Server-side `dir` on `<html>`, the RSC-safe `getDirection()` / `useDirection()`
 * boundary, and the Tailwind plugin land in M5. This entry currently re-exports
 * the direction primitives from `@harf/core`.
 *
 * @packageDocumentation
 */

export { DIRECTIONS, isDirection, oppositeDirection, type Direction } from '@harf/core';
