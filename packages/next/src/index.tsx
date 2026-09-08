/**
 * `@harf/next` — Next.js App Router adapter for Harf.
 *
 * Three things Next.js apps get wrong, and what this package does about them:
 *
 * 1. **A flash of the wrong direction on first paint.** Setting `dir` from a
 *    client effect means the first painted frame is left-to-right.
 *    `@harf/next/server` resolves it before any HTML is streamed.
 * 2. **The RSC boundary.** React context does not cross into a server
 *    component, so `useDirection()` is unavailable there. `getDirection()` is
 *    the server-side counterpart, and the boundary is documented rather than
 *    papered over.
 * 3. **Tailwind's gaps.** Tailwind already ships logical spacing, so this
 *    package does not reimplement it. It adds only what is missing: mirroring
 *    and bidi utilities.
 *
 * @packageDocumentation
 */

'use client';

export {
  DirectionProvider,
  useDirection,
  useDirectionSign,
  useDirectionalTranslate,
  useDirectionalValue,
  useHarf,
  useLogicalStyles,
  useResolvedStyle,
  type DirectionProviderProps,
  type HarfContextValue,
} from '@harf/core/react';

export {
  Bidi,
  Mirror,
  Num,
  useArabicSafeText,
  useDirAttribute,
  type BidiProps,
  type MirrorProps,
  type NumProps,
} from '@harf/react';

export {
  autoIsolate,
  createStyles,
  directionForLocale,
  formatCurrency,
  formatNumber,
  isolate,
  isRtlLocale,
  mirrorTransform,
  resolveStyle,
  shouldMirror,
  stripBidi,
  toArabicDigits,
  toWesternDigits,
  type Direction,
} from '@harf/core';
