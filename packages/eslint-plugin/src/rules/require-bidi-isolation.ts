/**
 * `harf/require-bidi-isolation`
 *
 * @module
 */

import type { Rule } from 'eslint';
import type { Node, TemplateElement, TemplateLiteral } from 'estree';

/**
 * Strongly right-to-left code point ranges.
 *
 * Built from escapes rather than literals: a literal Arabic character inside a
 * character class is invisible in a diff, which is a poor property for the
 * data a lint rule depends on.
 */
const RTL_PATTERN = new RegExp('[\\u0590-\\u08ff\\ufb1d-\\ufdff\\ufe70-\\ufefc]');

/** `true` when the string contains at least one strongly RTL character. */
function containsRtl(value: string): boolean {
  return RTL_PATTERN.test(value);
}

/**
 * Expressions that are already safe to interpolate.
 *
 * A call to `isolate`, `autoIsolate` or `isolateIfNeeded` — however it is
 * imported or namespaced — needs no warning, and neither does a `<Bidi>`
 * element or a `<Num literal>`.
 */
const DEFAULT_SAFE_CALLEES: readonly string[] = [
  'isolate',
  'isolateIfNeeded',
  'autoIsolate',
  'toWesternDigits',
];

function isAlreadyIsolated(expression: unknown, safe: ReadonlySet<string>): boolean {
  const node = expression as { type?: string } | null;
  if (node === null || node === undefined) return false;

  if (node.type === 'CallExpression') {
    const call = node as unknown as {
      callee: { type: string; name?: string; property?: { type: string; name?: string } };
    };
    if (call.callee.type === 'Identifier' && call.callee.name !== undefined) {
      return safe.has(call.callee.name);
    }
    if (
      call.callee.type === 'MemberExpression' &&
      call.callee.property?.type === 'Identifier' &&
      call.callee.property.name !== undefined
    ) {
      return safe.has(call.callee.property.name);
    }
    return false;
  }

  // A nested template that is itself isolated, or a conditional whose branches
  // both are.
  if (node.type === 'ConditionalExpression') {
    const conditional = node as unknown as { consequent: unknown; alternate: unknown };
    return (
      isAlreadyIsolated(conditional.consequent, safe) &&
      isAlreadyIsolated(conditional.alternate, safe)
    );
  }

  return false;
}

/**
 * Warns when a value is interpolated into a template literal that contains
 * Arabic (or other RTL) text.
 *
 * This is the single most common bug in Arabic apps, and it is invisible in
 * code review: the source looks correct, and the rendered result reorders at
 * the boundary between the interpolated value and the Arabic around it. A
 * brand name, a URL, a phone number, an email or a filename all trigger it.
 *
 * The rule is a **heuristic and a warning, not an error**. It cannot know
 * whether the interpolated value is Latin, and a value that is itself Arabic
 * needs no isolation. It fires where the risk is, and you silence it by
 * isolating — which costs nothing when the value turns out to be Arabic,
 * because a first-strong isolate around Arabic text is a no-op.
 *
 * @example Flagged
 * ```ts
 * const greeting = `مرحبا بك في ${brandName} اليوم`;
 * ```
 *
 * @example Not flagged
 * ```ts
 * import { isolate } from '@harf/core';
 *
 * const greeting = `مرحبا بك في ${isolate(brandName)} اليوم`;
 * ```
 *
 * @example Not flagged — no RTL text in the literal
 * ```ts
 * const greeting = `Welcome to ${brandName}`;
 * ```
 */
export const requireBidiIsolation: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when a value is interpolated into a template literal containing Arabic or other RTL text without bidi isolation.',
      recommended: true,
      url: 'https://github.com/Ali-mohamed843/harf/blob/main/packages/eslint-plugin/README.md#require-bidi-isolation',
    },
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          /**
           * The name to suggest wrapping with.
           * @default 'isolate'
           */
          isolateFunction: { type: 'string' },
          /** Additional callee names to treat as already-safe. */
          safeCallees: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unisolated:
        'This value is interpolated into a string containing RTL text. Without isolation, an LTR value here (a brand name, URL, phone number or email) will reorder incorrectly at its boundaries. Wrap it in {{fn}}().',
      suggestIsolate: 'Wrap in {{fn}}()',
    },
  },

  create(context) {
    const options = (context.options[0] ?? {}) as {
      isolateFunction?: string;
      safeCallees?: string[];
    };
    const fn = options.isolateFunction ?? 'isolate';
    // Built per rule instance, so one file's options never leak into another's.
    const safe: ReadonlySet<string> = new Set([
      ...DEFAULT_SAFE_CALLEES,
      ...(options.safeCallees ?? []),
    ]);

    return {
      TemplateLiteral(node: TemplateLiteral): void {
        if (node.expressions.length === 0) return;

        const literalText = node.quasis
          .map((quasi: TemplateElement) => quasi.value.raw)
          .join('');
        if (!containsRtl(literalText)) return;

        for (const expression of node.expressions) {
          if (isAlreadyIsolated(expression, safe)) continue;

          const target = expression as unknown as Node;
          context.report({
            node: target,
            messageId: 'unisolated',
            data: { fn },
            suggest: [
              {
                messageId: 'suggestIsolate',
                data: { fn },
                fix: (fixer) => {
                  const text = context.sourceCode.getText(target);
                  return fixer.replaceText(target, `${fn}(${text})`);
                },
              },
            ],
          });
        }
      },
    };
  },
};
