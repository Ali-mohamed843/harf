/**
 * `@harf/core/testing` — framework-agnostic testing utilities.
 *
 * Zero runtime dependencies, like the rest of `@harf/core`. The pieces that
 * need to *render* something live in the adapters: `renderBoth` is exported
 * from `@harf/react/testing` and `@harf/native/testing`, each built on the
 * {@link createRenderBoth} factory here so they behave identically.
 *
 * @packageDocumentation
 */

import { DIRECTIONS, type Direction } from '../direction';
import { LOGICAL_PROPERTY_NAMES, PHYSICAL_PROPERTIES } from '../style/properties';

/** A physical style property found somewhere in a tree. */
export interface PhysicalPropertyHit {
  /** The offending property name, e.g. `marginLeft`. */
  readonly property: string;
  /** The value it was set to. */
  readonly value: unknown;
  /** A dotted path to where it was found, e.g. `style[0].marginLeft`. */
  readonly path: string;
}

/**
 * Walks any value and collects every physical style property in it.
 *
 * Use it on a rendered style tree, a component's props, or a `StyleSheet`
 * object. It looks only at plain objects and arrays, so it will not recurse
 * into a React element tree or a DOM node.
 *
 * @example
 * ```ts
 * import { findPhysicalProperties } from '@harf/core/testing';
 *
 * findPhysicalProperties({ card: { marginLeft: 8, paddingStart: 4 } });
 * // [{ property: 'marginLeft', value: 8, path: 'card.marginLeft' }]
 * ```
 */
export function findPhysicalProperties(
  value: unknown,
  path = '',
): readonly PhysicalPropertyHit[] {
  const hits: PhysicalPropertyHit[] = [];
  walk(value, path, hits, new Set());
  return hits;
}

function walk(
  value: unknown,
  path: string,
  hits: PhysicalPropertyHit[],
  seen: Set<object>,
): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, `${path}[${index}]`, hits, seen));
    return;
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path === '' ? key : `${path}.${key}`;
    if (PHYSICAL_PROPERTIES.has(key)) {
      hits.push({ property: key, value: entry, path: childPath });
    }
    walk(entry, childPath, hits, seen);
  }
}

/**
 * Walks any value and collects every *logical* property left unresolved.
 *
 * A logical property that survives into a rendered tree means the resolver was
 * never applied — the component is reading `styles.row` instead of
 * `useLogicalStyles(styles).row`. React Native will silently resolve it
 * against `I18nManager.isRTL`, which is the global Harf exists to stop you
 * depending on, so the failure is invisible until someone switches language.
 *
 * @example
 * ```ts
 * import { findUnresolvedLogicalProperties } from '@harf/core/testing';
 *
 * findUnresolvedLogicalProperties({ row: { paddingStart: 8 } });
 * // [{ property: 'paddingStart', value: 8, path: 'row.paddingStart' }]
 * ```
 */
export function findUnresolvedLogicalProperties(
  value: unknown,
  path = '',
): readonly PhysicalPropertyHit[] {
  const hits: PhysicalPropertyHit[] = [];
  walkLogical(value, path, hits, new Set());
  return hits;
}

function walkLogical(
  value: unknown,
  path: string,
  hits: PhysicalPropertyHit[],
  seen: Set<object>,
): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkLogical(entry, `${path}[${index}]`, hits, seen));
    return;
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const childPath = path === '' ? key : `${path}.${key}`;
    if (LOGICAL_PROPERTY_NAMES.has(key)) {
      // flexDirection and textAlign are in the logical set but their physical
      // values are perfectly legitimate. Only the logical *values* are a miss.
      const isValueProperty = key === 'flexDirection' || key === 'textAlign';
      if (!isValueProperty || entry === 'start' || entry === 'end') {
        hits.push({ property: key, value: entry, path: childPath });
      }
    }
    walkLogical(entry, childPath, hits, seen);
  }
}

/** The result of rendering the same subject in both directions. */
export interface BothDirections<T> {
  /** The result under `'ltr'`. */
  readonly ltr: T;
  /** The result under `'rtl'`. */
  readonly rtl: T;
  /** `[['ltr', ltrResult], ['rtl', rtlResult]]`, for `it.each`. */
  readonly entries: readonly (readonly [Direction, T])[];
}

/**
 * Builds a `renderBoth` bound to a particular render function.
 *
 * The adapters use this so `@harf/react/testing` and `@harf/native/testing`
 * expose the same shape without `@harf/core` taking a dependency on React.
 *
 * @param render - Renders the subject in a given direction.
 *
 * @example
 * ```ts
 * import { createRenderBoth } from '@harf/core/testing';
 *
 * const renderBoth = createRenderBoth((subject: MyStyles, dir) => subject(dir));
 *
 * const { ltr, rtl } = renderBoth(styles);
 * expect(ltr.row.paddingLeft).toBe(16);
 * expect(rtl.row.paddingRight).toBe(16);
 * ```
 */
export function createRenderBoth<Subject, Result>(
  render: (subject: Subject, dir: Direction) => Result,
): (subject: Subject) => BothDirections<Result> {
  return (subject) => {
    const ltr = render(subject, 'ltr');
    const rtl = render(subject, 'rtl');
    return {
      ltr,
      rtl,
      entries: Object.freeze([
        Object.freeze(['ltr', ltr] as const),
        Object.freeze(['rtl', rtl] as const),
      ]) as readonly (readonly [Direction, Result])[],
    };
  };
}

/** The shape a Vitest or Jest custom matcher must return. */
export interface MatcherResult {
  readonly pass: boolean;
  message(): string;
}

function describeHits(hits: readonly PhysicalPropertyHit[]): string {
  return hits.map((hit) => `  ${hit.path} = ${JSON.stringify(hit.value)}`).join('\n');
}

/**
 * A matcher that fails when a rendered style tree contains physical
 * properties.
 *
 * Register it with your test runner, then assert on any rendered output. It is
 * the cheapest way to stop physical properties creeping back into a codebase
 * that has already been converted.
 *
 * @example Registering it with Vitest
 * ```ts
 * // vitest.setup.ts
 * import { expect } from 'vitest';
 * import { toHaveNoPhysicalProperties } from '@harf/core/testing';
 *
 * expect.extend({ toHaveNoPhysicalProperties });
 * ```
 *
 * @example Using it
 * ```ts
 * expect(styles.source).toHaveNoPhysicalProperties();
 * ```
 */
export function toHaveNoPhysicalProperties(received: unknown): MatcherResult {
  const hits = findPhysicalProperties(received);
  return {
    pass: hits.length === 0,
    message: () =>
      hits.length === 0
        ? 'Expected the tree to contain physical style properties, but it contained none.'
        : `Expected no physical style properties, but found ${hits.length}:\n${describeHits(hits)}\n\n` +
          'Replace each with its logical equivalent (marginLeft to marginStart, and so on), ' +
          'or add it to an explicit escape hatch if the physical value is deliberate.',
  };
}

/**
 * A matcher that fails when a rendered tree still contains *unresolved*
 * logical properties.
 *
 * The mirror image of {@link toHaveNoPhysicalProperties}: use that one on
 * source style sheets, and this one on rendered output.
 *
 * @example
 * ```ts
 * import { expect } from 'vitest';
 * import { toHaveNoUnresolvedLogicalProperties } from '@harf/core/testing';
 *
 * expect.extend({ toHaveNoUnresolvedLogicalProperties });
 * expect(renderedStyle).toHaveNoUnresolvedLogicalProperties();
 * ```
 */
export function toHaveNoUnresolvedLogicalProperties(received: unknown): MatcherResult {
  const hits = findUnresolvedLogicalProperties(received);
  return {
    pass: hits.length === 0,
    message: () =>
      hits.length === 0
        ? 'Expected the tree to contain unresolved logical properties, but it contained none.'
        : `Expected every logical property to be resolved, but ${hits.length} survived:\n${describeHits(hits)}\n\n` +
          'This style was not passed through useLogicalStyles / resolveStyle, so React Native ' +
          'will resolve it against the I18nManager.isRTL global instead of your DirectionProvider.',
  };
}

/**
 * Runs a callback once per direction.
 *
 * A convenience for the rule that RTL tests must assert on *both* directions,
 * not only the one being fixed.
 *
 * @example
 * ```ts
 * import { forEachDirection } from '@harf/core/testing';
 *
 * forEachDirection((dir) => {
 *   it(`lays out correctly in ${dir}`, () => {
 *     expect(resolveStyle(style, dir)).toMatchSnapshot(dir);
 *   });
 * });
 * ```
 */
export function forEachDirection(run: (dir: Direction) => void): void {
  for (const dir of DIRECTIONS) run(dir);
}

export type { Direction };
