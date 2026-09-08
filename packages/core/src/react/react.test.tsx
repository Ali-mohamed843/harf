import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createElement, memo, useRef, type ReactNode } from 'react';
import { createStyles } from '../style/resolve';
import {
  DirectionProvider,
  useDirection,
  useDirectionSign,
  useDirectionalTranslate,
  useDirectionalValue,
  useHarf,
  useLogicalStyles,
  useResolvedStyle,
} from './index';

const styles = createStyles({
  row: { flexDirection: 'row', paddingStart: 16 },
  title: { textAlign: 'start' },
});

function DirectionLabel(): ReactNode {
  const { dir, isRTL, locale } = useDirection();
  return createElement(
    'div',
    null,
    createElement('span', { 'data-testid': 'dir' }, dir),
    createElement('span', { 'data-testid': 'isRTL' }, String(isRTL)),
    createElement('span', { 'data-testid': 'locale' }, locale ?? 'none'),
  );
}

describe('DirectionProvider', () => {
  it('defaults to ltr with no props', () => {
    render(createElement(DirectionProvider, null, createElement(DirectionLabel)));
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(screen.getByTestId('isRTL').textContent).toBe('false');
  });

  it('derives the direction from a locale', () => {
    render(
      createElement(
        DirectionProvider,
        { locale: 'ar-EG' },
        createElement(DirectionLabel),
      ),
    );
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
    expect(screen.getByTestId('locale').textContent).toBe('ar-EG');
  });

  it('accepts an explicit dir, which wins over the locale', () => {
    render(
      createElement(
        DirectionProvider,
        { locale: 'ar-EG', dir: 'ltr' },
        createElement(DirectionLabel),
      ),
    );
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
  });

  it('honours defaultDir when uncontrolled', () => {
    render(
      createElement(
        DirectionProvider,
        { defaultDir: 'rtl' },
        createElement(DirectionLabel),
      ),
    );
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
  });

  it('returns ltr outside a provider instead of throwing', () => {
    // A component must stay renderable in isolation: in a unit test, in
    // Storybook, in a design-system playground.
    render(createElement(DirectionLabel));
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
  });

  it('warns rather than crashing when setDirection is called outside a provider', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    function Orphan(): ReactNode {
      const { setDirection } = useDirection();
      return createElement('button', { onClick: () => setDirection('rtl') }, 'x');
    }
    render(createElement(Orphan));
    act(() => {
      screen.getByRole('button').click();
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('DirectionProvider'));
    warn.mockRestore();
  });
});

describe('switching direction is an ordinary re-render', () => {
  function Switcher(): ReactNode {
    const { dir, toggleDirection } = useDirection();
    const s = useLogicalStyles(styles);
    return createElement(
      'div',
      null,
      createElement('span', { 'data-testid': 'dir' }, dir),
      createElement('span', { 'data-testid': 'row' }, JSON.stringify(s.row)),
      createElement('button', { onClick: toggleDirection }, 'toggle'),
    );
  }

  it('re-resolves every logical style when the direction changes', () => {
    // This is the whole point of the library. There is no reload here, no
    // I18nManager.forceRTL, and no remount: the same mounted component tree
    // produces mirrored physical styles after a state update.
    render(createElement(DirectionProvider, null, createElement(Switcher)));

    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(JSON.parse(screen.getByTestId('row').textContent ?? '{}')).toEqual({
      flexDirection: 'row',
      paddingLeft: 16,
    });

    act(() => {
      screen.getByRole('button').click();
    });

    expect(screen.getByTestId('dir').textContent).toBe('rtl');
    expect(JSON.parse(screen.getByTestId('row').textContent ?? '{}')).toEqual({
      flexDirection: 'row-reverse',
      paddingRight: 16,
    });
  });

  it('keeps component state across the switch, proving nothing remounted', () => {
    // If the tree remounted — which is what a forceRTL reload does — this
    // counter would be back at 1.
    let mountCount = 0;

    function Counter(): ReactNode {
      const renders = useRef(0);
      renders.current += 1;
      const mounted = useRef(false);
      if (!mounted.current) {
        mounted.current = true;
        mountCount += 1;
      }
      const { toggleDirection, dir } = useDirection();
      return createElement(
        'div',
        null,
        createElement('span', { 'data-testid': 'mounts' }, String(mountCount)),
        createElement('span', { 'data-testid': 'dir' }, dir),
        createElement('button', { onClick: toggleDirection }, 'toggle'),
      );
    }

    render(createElement(DirectionProvider, null, createElement(Counter)));
    expect(screen.getByTestId('mounts').textContent).toBe('1');

    act(() => {
      screen.getByRole('button').click();
    });

    expect(screen.getByTestId('dir').textContent).toBe('rtl');
    expect(screen.getByTestId('mounts').textContent).toBe('1');
  });

  it('reports the change through onDirectionChange', () => {
    const onDirectionChange = vi.fn();
    function Toggle(): ReactNode {
      const { toggleDirection } = useDirection();
      return createElement('button', { onClick: toggleDirection }, 'toggle');
    }
    render(
      createElement(DirectionProvider, { onDirectionChange }, createElement(Toggle)),
    );
    act(() => {
      screen.getByRole('button').click();
    });
    expect(onDirectionChange).toHaveBeenCalledWith('rtl');
  });

  it('setDirection is idempotent', () => {
    function Setter(): ReactNode {
      const { setDirection, dir } = useDirection();
      return createElement(
        'div',
        null,
        createElement('span', { 'data-testid': 'dir' }, dir),
        createElement('button', { onClick: () => setDirection('rtl') }, 'rtl'),
      );
    }
    render(createElement(DirectionProvider, null, createElement(Setter)));
    act(() => screen.getByRole('button').click());
    act(() => screen.getByRole('button').click());
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
  });
});

describe('useLogicalStyles', () => {
  it('resolves the sheet for the current direction', () => {
    function Styled(): ReactNode {
      const s = useLogicalStyles(styles);
      return createElement('span', { 'data-testid': 'out' }, JSON.stringify(s.title));
    }
    render(createElement(DirectionProvider, { dir: 'rtl' }, createElement(Styled)));
    expect(JSON.parse(screen.getByTestId('out').textContent ?? '{}')).toEqual({
      textAlign: 'right',
    });
  });

  it('returns the identical object across renders, so React.memo still holds', () => {
    const seen: unknown[] = [];
    const Child = memo(function Child({ style }: { style: unknown }): ReactNode {
      seen.push(style);
      return null;
    });

    function Parent(): ReactNode {
      const s = useLogicalStyles(styles);
      const { toggleDirection } = useDirection();
      return createElement(
        'div',
        null,
        createElement(Child, { style: s.row }),
        createElement('button', { onClick: toggleDirection }, 'toggle'),
      );
    }

    const { rerender } = render(
      createElement(DirectionProvider, { dir: 'ltr' }, createElement(Parent)),
    );
    rerender(createElement(DirectionProvider, { dir: 'ltr' }, createElement(Parent)));
    rerender(createElement(DirectionProvider, { dir: 'ltr' }, createElement(Parent)));

    // Re-rendering at the same direction must not produce a new style object,
    // or every memoised child in the app re-renders on every parent render.
    expect(seen.length).toBe(1);
  });
});

describe('useResolvedStyle', () => {
  it('resolves an ad-hoc style object', () => {
    function Styled(): ReactNode {
      const style = useResolvedStyle({ marginStart: 4 });
      return createElement('span', { 'data-testid': 'out' }, JSON.stringify(style));
    }
    render(createElement(DirectionProvider, { dir: 'rtl' }, createElement(Styled)));
    expect(JSON.parse(screen.getByTestId('out').textContent ?? '{}')).toEqual({
      marginRight: 4,
    });
  });
});

describe('useDirectionalValue', () => {
  it('picks by direction', () => {
    function Picker(): ReactNode {
      const side = useDirectionalValue('left', 'right');
      return createElement('span', { 'data-testid': 'out' }, side);
    }
    render(createElement(DirectionProvider, { dir: 'ltr' }, createElement(Picker)));
    expect(screen.getByTestId('out').textContent).toBe('left');

    render(createElement(DirectionProvider, { dir: 'rtl' }, createElement(Picker)));
    expect(screen.getAllByTestId('out')[1]?.textContent).toBe('right');
  });
});

describe('useDirectionalTranslate and useDirectionSign', () => {
  function Translate(): ReactNode {
    const x = useDirectionalTranslate(40);
    const sign = useDirectionSign();
    return createElement(
      'div',
      null,
      createElement('span', { 'data-testid': 'x' }, String(x)),
      createElement('span', { 'data-testid': 'sign' }, String(sign)),
    );
  }

  it('flips the sign of a horizontal offset under RTL', () => {
    // The reason a slide-in panel enters from the wrong side under RTL while
    // everything else looks fine.
    render(createElement(DirectionProvider, { dir: 'ltr' }, createElement(Translate)));
    expect(screen.getByTestId('x').textContent).toBe('40');
    expect(screen.getByTestId('sign').textContent).toBe('1');

    render(createElement(DirectionProvider, { dir: 'rtl' }, createElement(Translate)));
    expect(screen.getAllByTestId('x')[1]?.textContent).toBe('-40');
    expect(screen.getAllByTestId('sign')[1]?.textContent).toBe('-1');
  });

  it('leaves zero alone in both directions', () => {
    function Zero(): ReactNode {
      return createElement(
        'span',
        { 'data-testid': 'z' },
        String(useDirectionalTranslate(0)),
      );
    }
    render(createElement(DirectionProvider, { dir: 'rtl' }, createElement(Zero)));
    expect(Math.abs(Number(screen.getByTestId('z').textContent))).toBe(0);
  });
});

describe('useHarf', () => {
  it('is the same value as useDirection', () => {
    function Both(): ReactNode {
      const a = useHarf();
      const b = useDirection();
      return createElement('span', { 'data-testid': 'same' }, String(a === b));
    }
    render(createElement(DirectionProvider, { dir: 'rtl' }, createElement(Both)));
    expect(screen.getByTestId('same').textContent).toBe('true');
  });
});

describe('nested providers', () => {
  it('lets an inner provider override an outer one', () => {
    // Useful for a single LTR island — a code block, a chart axis — inside an
    // otherwise RTL screen.
    render(
      createElement(
        DirectionProvider,
        { dir: 'rtl' },
        createElement(DirectionProvider, { dir: 'ltr' }, createElement(DirectionLabel)),
      ),
    );
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
  });
});
