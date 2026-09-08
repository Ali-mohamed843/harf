/**
 * `@harf/react` — React (web) adapter for Harf.
 *
 * `DirectionProvider`, `useDirection`, `useLogicalStyles` and `<Bidi>` land in
 * M1. This entry currently re-exports the direction primitives from
 * `@harf/core` so consumers can import them from a single place.
 *
 * @packageDocumentation
 */

export { DIRECTIONS, isDirection, oppositeDirection, type Direction } from '@harf/core';
