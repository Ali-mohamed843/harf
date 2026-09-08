import { RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';
import tsParser from '@typescript-eslint/parser';
import { noPhysicalProperties } from './no-physical-properties';
import { noPhysicalTailwind, toLogicalClass } from './no-physical-tailwind';
import { requireBidiIsolation } from './require-bidi-isolation';

const tester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('no-physical-properties', () => {
  it('flags physical properties and fixes them', () => {
    tester.run('no-physical-properties', noPhysicalProperties, {
      valid: [
        // Already logical.
        `const styles = StyleSheet.create({ row: { marginStart: 8 } });`,
        `const styles = createStyles({ row: { paddingEnd: 4, borderTopStartRadius: 2 } });`,
        `<View style={{ marginStart: 8 }} />`,
        // Not directional, so not this rule's business.
        `const styles = StyleSheet.create({ row: { marginTop: 8, width: 10 } });`,
        `const styles = StyleSheet.create({ row: { textAlign: 'center' } });`,
        // Not a style object at all. A rule that fires on every object with a
        // `left` key is a rule people switch off.
        `const chart = { axis: { left: 0, right: 100 } };`,
        `const config = { padding: { left: 4, right: 4 } };`,
        `const insets = { left: 0, right: 0 };`,
        // Explicitly allowed.
        {
          code: `const styles = StyleSheet.create({ row: { marginLeft: 8 } });`,
          options: [{ allow: ['marginLeft'] }],
        },
        {
          code: `const styles = StyleSheet.create({ row: { left: 0 } });`,
          options: [{ checkPosition: false }],
        },
      ],
      invalid: [
        {
          code: `const styles = StyleSheet.create({ row: { marginLeft: 8 } });`,
          output: `const styles = StyleSheet.create({ row: { marginStart: 8 } });`,
          errors: [{ messageId: 'physical' }],
        },
        {
          code: `const styles = StyleSheet.create({ row: { paddingRight: 4 } });`,
          output: `const styles = StyleSheet.create({ row: { paddingEnd: 4 } });`,
          errors: [{ messageId: 'physical' }],
        },
        {
          code: `const styles = StyleSheet.create({ a: { borderTopLeftRadius: 2 } });`,
          output: `const styles = StyleSheet.create({ a: { borderTopStartRadius: 2 } });`,
          errors: [{ messageId: 'physical' }],
        },
        {
          code: `const styles = StyleSheet.create({ a: { borderBottomRightRadius: 2 } });`,
          output: `const styles = StyleSheet.create({ a: { borderBottomEndRadius: 2 } });`,
          errors: [{ messageId: 'physical' }],
        },
        {
          code: `const styles = StyleSheet.create({ a: { borderLeftWidth: 1, borderRightColor: 'red' } });`,
          output: `const styles = StyleSheet.create({ a: { borderStartWidth: 1, borderEndColor: 'red' } });`,
          errors: [{ messageId: 'physical' }, { messageId: 'physical' }],
        },
        {
          code: `const styles = StyleSheet.create({ a: { position: 'absolute', left: 0 } });`,
          output: `const styles = StyleSheet.create({ a: { position: 'absolute', start: 0 } });`,
          errors: [{ messageId: 'physical' }],
        },
        {
          code: `const styles = StyleSheet.create({ a: { textAlign: 'left' } });`,
          output: `const styles = StyleSheet.create({ a: { textAlign: 'start' } });`,
          errors: [{ messageId: 'physicalValue' }],
        },
        {
          code: `const styles = StyleSheet.create({ a: { textAlign: 'right' } });`,
          output: `const styles = StyleSheet.create({ a: { textAlign: 'end' } });`,
          errors: [{ messageId: 'physicalValue' }],
        },
        // A JSX style attribute.
        {
          code: `const el = <View style={{ marginLeft: 8 }} />;`,
          output: `const el = <View style={{ marginStart: 8 }} />;`,
          errors: [{ messageId: 'physical' }],
        },
        {
          code: `const el = <ScrollView contentContainerStyle={{ paddingLeft: 8 }} />;`,
          output: `const el = <ScrollView contentContainerStyle={{ paddingStart: 8 }} />;`,
          errors: [{ messageId: 'physical' }],
        },
        // A variable whose name ends in Style.
        {
          code: `const cardStyle = { marginRight: 4 };`,
          output: `const cardStyle = { marginEnd: 4 };`,
          errors: [{ messageId: 'physical' }],
        },
        // A quoted key.
        {
          code: `const styles = StyleSheet.create({ a: { 'marginLeft': 8 } });`,
          output: `const styles = StyleSheet.create({ a: { 'marginStart': 8 } });`,
          errors: [{ messageId: 'physical' }],
        },
      ],
    });
  });

  it('names the logical replacement in the message', () => {
    expect(noPhysicalProperties.meta?.messages?.physical).toContain('{{logical}}');
  });
});

describe('toLogicalClass', () => {
  it.each([
    ['ml-4', 'ms-4'],
    ['mr-2', 'me-2'],
    ['pl-8', 'ps-8'],
    ['pr-1', 'pe-1'],
    ['left-0', 'start-0'],
    ['right-4', 'end-4'],
    ['text-left', 'text-start'],
    ['text-right', 'text-end'],
    ['border-l', 'border-s'],
    ['border-r-2', 'border-e-2'],
    ['rounded-l-lg', 'rounded-s-lg'],
    ['rounded-tr-md', 'rounded-se-md'],
    ['float-left', 'float-start'],
    ['clear-right', 'clear-end'],
    ['scroll-ml-4', 'scroll-ms-4'],
  ])('converts %s to %s', (physical, logical) => {
    expect(toLogicalClass(physical)).toBe(logical);
  });

  it('keeps variant prefixes attached', () => {
    expect(toLogicalClass('md:ml-4')).toBe('md:ms-4');
    expect(toLogicalClass('hover:text-left')).toBe('hover:text-start');
    expect(toLogicalClass('dark:md:mr-2')).toBe('dark:md:me-2');
    expect(toLogicalClass('group-hover:pl-1')).toBe('group-hover:ps-1');
  });

  it('keeps the important modifier', () => {
    expect(toLogicalClass('!ml-4')).toBe('!ms-4');
    expect(toLogicalClass('md:!text-left')).toBe('md:!text-start');
  });

  it('returns null for anything not directional', () => {
    for (const value of [
      'mt-4',
      'pb-2',
      'text-center',
      'w-full',
      'flex',
      'items-center',
      'bg-red-500',
      '',
      'ml',
      'left',
    ]) {
      expect(toLogicalClass(value)).toBeNull();
    }
  });

  it('does not touch a class that is already logical', () => {
    for (const value of ['ms-4', 'pe-2', 'text-start', 'start-0', 'rounded-s-lg']) {
      expect(toLogicalClass(value)).toBeNull();
    }
  });
});

describe('no-physical-tailwind', () => {
  it('flags physical classes and fixes them', () => {
    tester.run('no-physical-tailwind', noPhysicalTailwind, {
      valid: [
        `const el = <div className="ms-4 pe-2 text-start" />;`,
        `const el = <div className="mt-4 pb-2 text-center w-full" />;`,
        `const el = <div className={someVariable} />;`,
        `const el = <div id="ml-4" />;`,
        {
          code: `const el = <div className="ml-4" />;`,
          options: [{ allow: ['ml-4'] }],
        },
      ],
      invalid: [
        {
          code: `const el = <div className="ml-4" />;`,
          output: `const el = <div className="ms-4" />;`,
          errors: [{ messageId: 'physical' }],
        },
        {
          code: `const el = <div className="ml-4 pr-2 text-left" />;`,
          output: `const el = <div className="ms-4 pe-2 text-start" />;`,
          errors: [{ messageId: 'physical' }],
        },
        // Variants survive the fix.
        {
          code: `const el = <div className="md:mr-8 hover:border-l-2" />;`,
          output: `const el = <div className="md:me-8 hover:border-s-2" />;`,
          errors: [{ messageId: 'physical' }],
        },
        // Whitespace is preserved byte-for-byte, so a multi-line className
        // keeps its formatting after the fix.
        {
          code: `const el = <div className="mt-2   ml-4\n  pr-1" />;`,
          output: `const el = <div className="mt-2   ms-4\n  pe-1" />;`,
          errors: [{ messageId: 'physical' }],
        },
        // Inside a template literal.
        {
          code: 'const el = <div className={`ml-4 ${extra}`} />;',
          output: 'const el = <div className={`ms-4 ${extra}`} />;',
          errors: [{ messageId: 'physical' }],
        },
        // Inside clsx / cn.
        {
          code: `const c = clsx('ml-4', isActive && 'pr-2');`,
          output: `const c = clsx('ms-4', isActive && 'pe-2');`,
          errors: [{ messageId: 'physical' }, { messageId: 'physical' }],
        },
        {
          code: `const c = cn({ 'ml-4': isActive });`,
          output: `const c = cn({ 'ms-4': isActive });`,
          errors: [{ messageId: 'physical' }],
        },
        // A conditional inside className.
        {
          code: `const el = <div className={ok ? 'ml-4' : 'mr-4'} />;`,
          output: `const el = <div className={ok ? 'ms-4' : 'me-4'} />;`,
          errors: [{ messageId: 'physical' }, { messageId: 'physical' }],
        },
        // A className property in a props object.
        {
          code: `const props = { className: 'text-right' };`,
          output: `const props = { className: 'text-end' };`,
          errors: [{ messageId: 'physical' }],
        },
        // Double quotes are preserved.
        {
          code: `const c = clsx("ml-4");`,
          output: `const c = clsx("ms-4");`,
          errors: [{ messageId: 'physical' }],
        },
      ],
    });
  });
});

describe('require-bidi-isolation', () => {
  it('warns on unisolated interpolation into RTL text', () => {
    tester.run('require-bidi-isolation', requireBidiIsolation, {
      valid: [
        // No RTL text in the literal, so nothing can reorder.
        'const s = `Welcome to ${brand}`;',
        'const s = `${a} and ${b}`;',
        // No interpolation at all.
        'const s = `مرحبا بك`;',
        // Already isolated.
        'const s = `مرحبا بك في ${isolate(brand)} اليوم`;',
        'const s = `مرحبا ${harf.isolate(brand)}`;',
        'const s = `مرحبا ${autoIsolate(text)}`;',
        'const s = `مرحبا ${isolateIfNeeded(brand, "rtl")}`;',
        // Both branches isolated.
        'const s = `مرحبا ${ok ? isolate(a) : isolate(b)}`;',
        {
          code: 'const s = `مرحبا ${wrap(brand)}`;',
          options: [{ safeCallees: ['wrap'] }],
        },
      ],
      invalid: [
        {
          code: 'const s = `مرحبا بك في ${brand} اليوم`;',
          errors: [
            {
              messageId: 'unisolated',
              suggestions: [
                {
                  messageId: 'suggestIsolate',
                  output: 'const s = `مرحبا بك في ${isolate(brand)} اليوم`;',
                },
              ],
            },
          ],
        },
        {
          code: 'const s = `اتصل على ${user.phone} الآن`;',
          errors: [
            {
              messageId: 'unisolated',
              suggestions: [
                {
                  messageId: 'suggestIsolate',
                  output: 'const s = `اتصل على ${isolate(user.phone)} الآن`;',
                },
              ],
            },
          ],
        },
        // One report per interpolation.
        {
          code: 'const s = `مرحبا ${a} و ${b}`;',
          errors: [
            {
              messageId: 'unisolated',
              suggestions: [
                {
                  messageId: 'suggestIsolate',
                  output: 'const s = `مرحبا ${isolate(a)} و ${b}`;',
                },
              ],
            },
            {
              messageId: 'unisolated',
              suggestions: [
                {
                  messageId: 'suggestIsolate',
                  output: 'const s = `مرحبا ${a} و ${isolate(b)}`;',
                },
              ],
            },
          ],
        },
        // Hebrew counts too.
        {
          code: 'const s = `שלום ${name}`;',
          errors: [
            {
              messageId: 'unisolated',
              suggestions: [
                {
                  messageId: 'suggestIsolate',
                  output: 'const s = `שלום ${isolate(name)}`;',
                },
              ],
            },
          ],
        },
        // Only one branch isolated is still a risk.
        {
          code: 'const s = `مرحبا ${ok ? isolate(a) : b}`;',
          errors: [
            {
              messageId: 'unisolated',
              suggestions: [
                {
                  messageId: 'suggestIsolate',
                  output: 'const s = `مرحبا ${isolate(ok ? isolate(a) : b)}`;',
                },
              ],
            },
          ],
        },
        // A custom isolate function name.
        {
          code: 'const s = `مرحبا ${brand}`;',
          options: [{ isolateFunction: 'bidi' }],
          errors: [
            {
              messageId: 'unisolated',
              suggestions: [
                {
                  messageId: 'suggestIsolate',
                  output: 'const s = `مرحبا ${bidi(brand)}`;',
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('is a suggestion rather than an autofix, because it is a heuristic', () => {
    // The rule cannot know whether the interpolated value is Latin. Silently
    // rewriting the user's code on a guess would be worse than a warning.
    expect(requireBidiIsolation.meta?.fixable).toBeUndefined();
    expect(requireBidiIsolation.meta?.hasSuggestions).toBe(true);
  });
});
