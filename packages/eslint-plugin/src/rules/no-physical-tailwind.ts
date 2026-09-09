/**
 * `harf/no-physical-tailwind`
 *
 * @module
 */

import type { Rule } from 'eslint';
import type { Literal, Node, TemplateLiteral } from 'estree';

/**
 * Physical Tailwind prefix → logical prefix.
 *
 * Tailwind has shipped logical spacing (`ms-`, `me-`, `ps-`, `pe-`, `start-`,
 * `end-`, `text-start`, `text-end`) for some time. This rule exists because
 * codebases predate it, not because the utilities are missing.
 *
 * Ordered longest-first so `border-l-2` is matched before `border-l`.
 */
const PREFIXES: readonly (readonly [string, string])[] = [
  ['scroll-ml-', 'scroll-ms-'],
  ['scroll-mr-', 'scroll-me-'],
  ['scroll-pl-', 'scroll-ps-'],
  ['scroll-pr-', 'scroll-pe-'],
  ['border-l-', 'border-s-'],
  ['border-r-', 'border-e-'],
  ['rounded-tl-', 'rounded-ss-'],
  ['rounded-tr-', 'rounded-se-'],
  ['rounded-bl-', 'rounded-es-'],
  ['rounded-br-', 'rounded-ee-'],
  ['rounded-l-', 'rounded-s-'],
  ['rounded-r-', 'rounded-e-'],
  ['ml-', 'ms-'],
  ['mr-', 'me-'],
  ['pl-', 'ps-'],
  ['pr-', 'pe-'],
  ['left-', 'start-'],
  ['right-', 'end-'],
  ['inset-l-', 'inset-s-'],
  ['inset-r-', 'inset-e-'],
  ['-ml-', '-ms-'],
  ['-mr-', '-me-'],
  ['-left-', '-start-'],
  ['-right-', '-end-'],
];

/** Whole class names with no numeric suffix. */
const EXACT: Readonly<Record<string, string>> = Object.freeze({
  'text-left': 'text-start',
  'text-right': 'text-end',
  'float-left': 'float-start',
  'float-right': 'float-end',
  'clear-left': 'clear-start',
  'clear-right': 'clear-end',
  'border-l': 'border-s',
  'border-r': 'border-e',
  'rounded-l': 'rounded-s',
  'rounded-r': 'rounded-e',
  'rounded-tl': 'rounded-ss',
  'rounded-tr': 'rounded-se',
  'rounded-bl': 'rounded-es',
  'rounded-br': 'rounded-ee',
  'origin-left': 'origin-start',
  'origin-right': 'origin-end',
});

/**
 * Converts one class name, keeping any variant prefixes (`md:`, `hover:`,
 * `dark:`, `group-hover:`) attached.
 *
 * @returns The logical class name, or `null` when there is nothing to change.
 */
export function toLogicalClass(className: string): string | null {
  const lastColon = className.lastIndexOf(':');
  const variants = lastColon === -1 ? '' : className.slice(0, lastColon + 1);
  const base = lastColon === -1 ? className : className.slice(lastColon + 1);

  // An important modifier (`!ml-4`) sits between the variants and the utility.
  const bang = base.startsWith('!') ? '!' : '';
  const utility = bang === '' ? base : base.slice(1);

  const exact = EXACT[utility];
  if (exact !== undefined) return `${variants}${bang}${exact}`;

  for (const [physical, logical] of PREFIXES) {
    if (utility.startsWith(physical) && utility.length > physical.length) {
      return `${variants}${bang}${logical}${utility.slice(physical.length)}`;
    }
  }

  return null;
}

/** Attribute names whose string value is a list of class names. */
const CLASS_ATTRIBUTES: ReadonlySet<string> = new Set([
  'className',
  'class',
  'classList',
  'tw',
]);

interface Replacement {
  readonly original: string;
  readonly logical: string;
}

/** Rewrites a whole class string, preserving the original whitespace exactly. */
function rewrite(value: string): { text: string; changes: Replacement[] } {
  const changes: Replacement[] = [];
  const text = value.replace(/\S+/g, (token) => {
    const logical = toLogicalClass(token);
    if (logical === null) return token;
    changes.push({ original: token, logical });
    return logical;
  });
  return { text, changes };
}

/**
 * Flags physical Tailwind classes in `className` strings and autofixes them to
 * their logical equivalents.
 *
 * Tailwind already ships the logical utilities; this rule is for the code
 * written before they existed. Variant prefixes (`md:`, `hover:`, `dark:`) and
 * the important modifier (`!`) are preserved, and the surrounding whitespace
 * in the string is left byte-for-byte alone so a multi-line `className` keeps
 * its formatting.
 *
 * @example Flagged
 * ```tsx
 * <div className="ml-4 pr-2 text-left md:mr-8 hover:border-l-2" />
 * ```
 *
 * @example Fixed
 * ```tsx
 * <div className="ms-4 pe-2 text-start md:me-8 hover:border-s-2" />
 * ```
 *
 * @example Not flagged — not directional
 * ```tsx
 * <div className="mt-4 pb-2 text-center w-full" />
 * ```
 */
export const noPhysicalTailwind: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow physical Tailwind classes (ml-, mr-, pl-, pr-, left-, right-, text-left, text-right) in favour of logical ones.',
      recommended: true,
      url: 'https://github.com/Ali-mohamed843/harf/blob/main/packages/eslint-plugin/README.md#no-physical-tailwind',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          /** Extra attribute names to treat as class lists. */
          attributes: { type: 'array', items: { type: 'string' } },
          /** Class names to leave alone. */
          allow: { type: 'array', items: { type: 'string' } },
          /**
           * Also check calls such as `clsx(...)` and `cn(...)`.
           * @default ['clsx', 'classnames', 'cn', 'cva', 'twMerge', 'tw']
           */
          callees: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      physical:
        "'{{original}}' is a physical Tailwind class and will not flip under RTL. Use '{{logical}}'.",
    },
  },

  create(context) {
    const options = (context.options[0] ?? {}) as {
      attributes?: string[];
      allow?: string[];
      callees?: string[];
    };
    const attributes = new Set([...CLASS_ATTRIBUTES, ...(options.attributes ?? [])]);
    const allow = new Set(options.allow ?? []);
    const callees = new Set(
      options.callees ?? [
        'clsx',
        'classnames',
        'classNames',
        'cn',
        'cva',
        'twMerge',
        'tw',
      ],
    );

    function checkStringNode(node: Literal): void {
      if (typeof node.value !== 'string') return;
      const { text, changes } = rewrite(node.value);
      const reportable = changes.filter((change) => !allow.has(change.original));
      if (reportable.length === 0) return;

      const raw = context.sourceCode.getText(node);
      const quote = raw.startsWith('"') ? '"' : "'";
      const first = reportable[0] as Replacement;

      context.report({
        node: node as unknown as Node,
        messageId: 'physical',
        data: { original: first.original, logical: first.logical },
        fix: (fixer) =>
          fixer.replaceText(node as unknown as Node, `${quote}${text}${quote}`),
      });
    }

    function checkTemplate(node: TemplateLiteral): void {
      for (const quasi of node.quasis) {
        const value = quasi.value.raw;
        const { text, changes } = rewrite(value);
        const reportable = changes.filter((change) => !allow.has(change.original));
        if (reportable.length === 0) continue;

        // A TemplateElement's range includes its delimiters: it opens with a
        // backtick or `}` and closes with a backtick or `${`. Replacing the
        // whole range would delete them and produce unparseable output, so
        // narrow to the text between.
        const [start, end] = quasi.range as [number, number];
        const innerStart = start + 1;
        const innerEnd = end - (quasi.tail ? 1 : 2);

        const first = reportable[0] as Replacement;
        context.report({
          node: quasi as unknown as Node,
          messageId: 'physical',
          data: { original: first.original, logical: first.logical },
          fix: (fixer) => fixer.replaceTextRange([innerStart, innerEnd], text),
        });
      }
    }

    function checkValue(value: unknown): void {
      const node = value as { type?: string } | null;
      if (node === null || node === undefined) return;
      if (node.type === 'Literal') checkStringNode(node as unknown as Literal);
      else if (node.type === 'TemplateLiteral') {
        checkTemplate(node as unknown as TemplateLiteral);
      } else if (node.type === 'JSXExpressionContainer') {
        checkValue((node as unknown as { expression: unknown }).expression);
      } else if (node.type === 'ConditionalExpression') {
        const conditional = node as unknown as {
          consequent: unknown;
          alternate: unknown;
        };
        checkValue(conditional.consequent);
        checkValue(conditional.alternate);
      } else if (node.type === 'LogicalExpression') {
        const logical = node as unknown as { left: unknown; right: unknown };
        checkValue(logical.left);
        checkValue(logical.right);
      } else if (node.type === 'ArrayExpression') {
        for (const element of (node as unknown as { elements: unknown[] }).elements) {
          checkValue(element);
        }
      } else if (node.type === 'ObjectExpression') {
        // clsx({ 'ml-4': isActive }) — the *key* is the class name.
        for (const property of (node as unknown as { properties: unknown[] })
          .properties) {
          const prop = property as { type?: string; key?: unknown };
          if (prop.type === 'Property') checkValue(prop.key);
        }
      }
    }

    return {
      JSXAttribute(node: unknown): void {
        const attribute = node as { name?: { name?: unknown }; value?: unknown };
        const name = attribute.name?.name;
        if (typeof name !== 'string' || !attributes.has(name)) return;
        checkValue(attribute.value);
      },

      CallExpression(node: unknown): void {
        const call = node as {
          callee: { type: string; name?: string };
          arguments: unknown[];
        };
        if (call.callee.type !== 'Identifier') return;
        if (call.callee.name === undefined || !callees.has(call.callee.name)) return;
        for (const argument of call.arguments) checkValue(argument);
      },

      Property(node: unknown): void {
        // { className: 'ml-4' } in a style-variant map or a props object.
        const property = node as {
          key: { type: string; name?: string; value?: unknown };
          value: unknown;
          computed: boolean;
        };
        if (property.computed) return;
        const key =
          property.key.type === 'Identifier'
            ? property.key.name
            : typeof property.key.value === 'string'
              ? property.key.value
              : undefined;
        if (key === undefined || !attributes.has(key)) return;
        checkValue(property.value);
      },
    };
  },
};
