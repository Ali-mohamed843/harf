/**
 * `@harf/native/testing` — render a component in both directions at once.
 *
 * @packageDocumentation
 */

import { createElement, type ReactElement } from 'react';
import { render, type RenderAPI } from '@testing-library/react-native';
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
 * Renders the same element under `'ltr'` and under `'rtl'`.
 *
 * @example
 * ```tsx
 * import { renderBoth } from '@harf/native/testing';
 *
 * it('mirrors the card', () => {
 *   const { ltr, rtl } = renderBoth(<Card />);
 *   expect(ltr.toJSON()).toMatchSnapshot('ltr');
 *   expect(rtl.toJSON()).toMatchSnapshot('rtl');
 * });
 * ```
 */
export const renderBoth: (ui: ReactElement) => BothDirections<RenderAPI> =
  createRenderBoth((ui: ReactElement, dir: Direction) =>
    render(createElement(DirectionProvider, { dir }, ui)),
  );

/**
 * Renders an element in one direction, wrapped in a `<DirectionProvider>`.
 *
 * @example
 * ```tsx
 * const view = renderWithDirection(<Card />, 'rtl');
 * ```
 */
export function renderWithDirection(ui: ReactElement, dir: Direction): RenderAPI {
  return render(createElement(DirectionProvider, { dir }, ui));
}
