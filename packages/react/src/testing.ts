/**
 * `@harf/react/testing` — render a component in both directions at once.
 *
 * @packageDocumentation
 */

import { createElement, type ReactElement } from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { DirectionProvider } from '@harf/core/react';
import { createRenderBoth, type BothDirections } from '@harf/core/testing';
import type { Direction } from '@harf/core';

export {
  findPhysicalProperties,
  findUnresolvedLogicalProperties,
  forEachDirection,
  toHaveNoPhysicalProperties,
  toHaveNoUnresolvedLogicalProperties,
  type PhysicalPropertyHit,
} from '@harf/core/testing';

export type { BothDirections };

/**
 * Renders the same element under `'ltr'` and under `'rtl'`, and hands back
 * both trees.
 *
 * The point is snapshot diffing: an RTL bug is almost always something that
 * *should* have changed between the two and did not, or something that should
 * not have and did.
 *
 * @example
 * ```tsx
 * import { renderBoth } from '@harf/react/testing';
 *
 * it('mirrors the card', () => {
 *   const { ltr, rtl } = renderBoth(<Card title="مرحبا" />);
 *   expect(ltr.container.innerHTML).toMatchSnapshot('ltr');
 *   expect(rtl.container.innerHTML).toMatchSnapshot('rtl');
 * });
 * ```
 *
 * @example Asserting on both, which is the rule
 * ```tsx
 * const { entries } = renderBoth(<Row />);
 * for (const [dir, view] of entries) {
 *   expect(view.getByRole('button')).toBeTruthy();
 * }
 * ```
 */
export const renderBoth: (ui: ReactElement) => BothDirections<RenderResult> =
  createRenderBoth((ui: ReactElement, dir: Direction) =>
    render(createElement(DirectionProvider, { dir }, ui)),
  );

/**
 * Renders an element in one direction, wrapped in a `<DirectionProvider>`.
 *
 * @example
 * ```tsx
 * import { renderWithDirection } from '@harf/react/testing';
 *
 * const view = renderWithDirection(<Card />, 'rtl');
 * ```
 */
export function renderWithDirection(ui: ReactElement, dir: Direction): RenderResult {
  return render(createElement(DirectionProvider, { dir }, ui));
}
