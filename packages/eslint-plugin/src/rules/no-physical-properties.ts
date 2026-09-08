/**
 * `harf/no-physical-properties`
 *
 * @module
 */

import type { Rule } from 'eslint';
import type { Node, Property, ObjectExpression, Identifier } from 'estree';

/**
 * Physical style property → its logical replacement.
 *
 * Only properties whose meaning genuinely flips are listed. `top`, `bottom`,
 * `width` and friends are not directional and are deliberately absent.
 */
const REPLACEMENTS: Readonly<Record<string, string>> = Object.freeze({
  marginLeft: 'marginStart',
  marginRight: 'marginEnd',
  paddingLeft: 'paddingStart',
  paddingRight: 'paddingEnd',
  borderLeftWidth: 'borderStartWidth',
  borderRightWidth: 'borderEndWidth',
  borderLeftColor: 'borderStartColor',
  borderRightColor: 'borderEndColor',
  borderTopLeftRadius: 'borderTopStartRadius',
  borderTopRightRadius: 'borderTopEndRadius',
  borderBottomLeftRadius: 'borderBottomStartRadius',
  borderBottomRightRadius: 'borderBottomEndRadius',
  left: 'start',
  right: 'end',
});

/** `textAlign` values that flip. */
const TEXT_ALIGN_REPLACEMENTS: Readonly<Record<string, string>> = Object.freeze({
  left: 'start',
  right: 'end',
});

/**
 * Property names whose value is *not* a style object, so `left`/`right` inside
 * them are not physical style properties at all.
 *
 * Without this, the rule fires on `{ position: { left: 0 } }` in a chart
 * config, on a `padding: { left }` prop of a third-party component, and on
 * every object with a `left` key anywhere in the file — which is exactly the
 * noise that gets a lint rule switched off.
 */
const NON_STYLE_PARENTS: ReadonlySet<string> = new Set([
  'margin',
  'padding',
  'inset',
  'offset',
  'bounds',
  'insets',
  'safeAreaInsets',
  'contentInset',
  'scrollIndicatorInsets',
  'hitSlop',
]);

function isStyleContext(context: Rule.RuleContext, node: ObjectExpression): boolean {
  const ancestors = context.sourceCode.getAncestors(node as unknown as Node);

  for (let i = ancestors.length - 1; i >= 0; i -= 1) {
    const ancestor = ancestors[i];
    if (ancestor === undefined) continue;

    // StyleSheet.create({ … }) — the strongest signal there is.
    if (
      ancestor.type === 'CallExpression' &&
      ancestor.callee.type === 'MemberExpression' &&
      ancestor.callee.property.type === 'Identifier' &&
      ancestor.callee.property.name === 'create' &&
      ancestor.callee.object.type === 'Identifier' &&
      ancestor.callee.object.name === 'StyleSheet'
    ) {
      return true;
    }

    // createStyles({ … })
    if (
      ancestor.type === 'CallExpression' &&
      ancestor.callee.type === 'Identifier' &&
      ancestor.callee.name === 'createStyles'
    ) {
      return true;
    }

    // A `style` or `contentContainerStyle` JSX attribute. JSX nodes are not
    // part of estree's Node union, so this reads through a widened view.
    const asJsx = ancestor as unknown as { type: string; name?: { name?: unknown } };
    if (asJsx.type === 'JSXAttribute' && typeof asJsx.name?.name === 'string') {
      if (/[Ss]tyle$/.test(asJsx.name.name)) return true;
    }

    // A property literally called `style`, or `styles` at the top of a sheet.
    if (
      ancestor.type === 'Property' &&
      ancestor.key.type === 'Identifier' &&
      /^(style|styles)$/.test(ancestor.key.name)
    ) {
      return true;
    }

    // A variable called something…Style / …Styles.
    if (
      ancestor.type === 'VariableDeclarator' &&
      ancestor.id.type === 'Identifier' &&
      /([Ss]tyle|[Ss]tyles)$/.test(ancestor.id.name)
    ) {
      return true;
    }
  }

  return false;
}

function immediateParentKey(
  context: Rule.RuleContext,
  node: ObjectExpression,
): string | null {
  const ancestors = context.sourceCode.getAncestors(node as unknown as Node);
  const parent = ancestors[ancestors.length - 1];
  if (parent?.type === 'Property' && parent.key.type === 'Identifier') {
    return parent.key.name;
  }
  return null;
}

/**
 * Flags physical style properties and rewrites them to logical ones.
 *
 * The scope is deliberately narrow: the rule only fires inside something it
 * can recognise as a style — `StyleSheet.create`, `createStyles`, a `style`
 * JSX attribute, a `style`/`styles` property, or a variable whose name ends in
 * `Style`/`Styles`. A rule that fires on every object with a `left` key is a
 * rule people turn off.
 *
 * @example Flagged
 * ```ts
 * const styles = StyleSheet.create({
 *   row: { marginLeft: 8, textAlign: 'left' },
 * });
 * ```
 *
 * @example Fixed
 * ```ts
 * const styles = StyleSheet.create({
 *   row: { marginStart: 8, textAlign: 'start' },
 * });
 * ```
 *
 * @example Not flagged — not a style
 * ```ts
 * const chart = { axis: { left: 0, right: 100 } };
 * ```
 */
export const noPhysicalProperties: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow physical style properties (marginLeft, paddingRight, left, right, textAlign: left/right, borderLeft*) in favour of logical ones.',
      recommended: true,
      url: 'https://github.com/harf-rtl/harf/blob/main/packages/eslint-plugin/README.md#no-physical-properties',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          /** Property names to leave alone, e.g. a deliberate escape hatch. */
          allow: { type: 'array', items: { type: 'string' } },
          /**
           * Also flag `left` and `right`, which are the most likely to appear
           * in a non-style object.
           * @default true
           */
          checkPosition: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      physical:
        "'{{physical}}' is a physical property and will not flip under RTL. Use '{{logical}}'.",
      physicalValue:
        "textAlign: '{{physical}}' will not flip under RTL. Use '{{logical}}'.",
    },
  },

  create(context) {
    const options = (context.options[0] ?? {}) as {
      allow?: string[];
      checkPosition?: boolean;
    };
    const allow = new Set(options.allow ?? []);
    const checkPosition = options.checkPosition ?? true;

    return {
      Property(node: Property): void {
        if (node.computed) return;

        const keyName =
          node.key.type === 'Identifier'
            ? node.key.name
            : node.key.type === 'Literal' && typeof node.key.value === 'string'
              ? node.key.value
              : null;
        if (keyName === null || allow.has(keyName)) return;

        const ancestors = context.sourceCode.getAncestors(node as unknown as Node);
        const objectNode = ancestors[ancestors.length - 1];
        if (objectNode?.type !== 'ObjectExpression') return;
        if (!isStyleContext(context, objectNode)) return;

        // textAlign: 'left' | 'right'
        if (
          keyName === 'textAlign' &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'string'
        ) {
          const logical = TEXT_ALIGN_REPLACEMENTS[node.value.value];
          if (logical === undefined) return;
          const valueNode = node.value;
          context.report({
            node: valueNode,
            messageId: 'physicalValue',
            data: { physical: node.value.value, logical },
            fix: (fixer) => fixer.replaceText(valueNode, `'${logical}'`),
          });
          return;
        }

        const logical = REPLACEMENTS[keyName];
        if (logical === undefined) return;

        if (!checkPosition && (keyName === 'left' || keyName === 'right')) return;

        // `left`/`right` are common outside styles. Skip the object shapes
        // that clearly are not one.
        if (keyName === 'left' || keyName === 'right') {
          const parentKey = immediateParentKey(context, objectNode);
          if (parentKey !== null && NON_STYLE_PARENTS.has(parentKey)) return;
        }

        const keyNode = node.key;
        context.report({
          node: keyNode,
          messageId: 'physical',
          data: { physical: keyName, logical },
          fix: (fixer) =>
            fixer.replaceText(
              keyNode,
              keyNode.type === 'Literal' ? `'${logical}'` : logical,
            ),
        });
      },
    };
  },
};

export { REPLACEMENTS as PHYSICAL_TO_LOGICAL };
export type { Identifier };
