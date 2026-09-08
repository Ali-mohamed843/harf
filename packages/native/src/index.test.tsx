import { I18nManager, Text, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { FSI, PDI, createStyles, stripBidi } from '@harf/core';
import {
  Bidi,
  DirectionProvider,
  LIMITS,
  Mirror,
  Num,
  assertHarfConfiguration,
  handledSubjects,
  limitsAsMarkdown,
  restartRequiredSubjects,
  useDirection,
  useDirectionalData,
  useDirectionalIndex,
  useDirectionalScrollOffset,
  useDrawerSide,
  useLogicalStyles,
  useScreenTransition,
} from './index';
import { renderBoth, renderWithDirection } from './testing';

const styles = createStyles({
  row: { flexDirection: 'row', paddingStart: 16, borderTopStartRadius: 12 },
  label: { textAlign: 'start' },
});

function Card(): React.ReactElement {
  const s = useLogicalStyles(styles);
  return (
    <View style={s.row} testID="row">
      <Text style={s.label} testID="label">
        مرحبا
      </Text>
    </View>
  );
}

function styleOf(element: { props: { style?: unknown } }): Record<string, unknown> {
  const style = element.props.style;
  const flatten = (value: unknown): Record<string, unknown> => {
    if (Array.isArray(value)) return Object.assign({}, ...value.map(flatten));
    if (value === null || typeof value !== 'object') return {};
    return value as Record<string, unknown>;
  };
  return flatten(style);
}

describe('logical styles under a DirectionProvider', () => {
  it('resolves to physical properties for each direction', () => {
    const { ltr, rtl } = renderBoth(<Card />);

    expect(styleOf(ltr.getByTestId('row'))).toMatchObject({
      flexDirection: 'row',
      paddingLeft: 16,
      borderTopLeftRadius: 12,
    });
    expect(styleOf(rtl.getByTestId('row'))).toMatchObject({
      flexDirection: 'row-reverse',
      paddingRight: 16,
      borderTopRightRadius: 12,
    });
  });

  it('resolves textAlign in both directions', () => {
    const { ltr, rtl } = renderBoth(<Card />);
    expect(styleOf(ltr.getByTestId('label')).textAlign).toBe('left');
    expect(styleOf(rtl.getByTestId('label')).textAlign).toBe('right');
  });

  it('leaves no logical property in the rendered tree', () => {
    for (const view of renderBoth(<Card />).entries.map(([, v]) => v)) {
      const style = styleOf(view.getByTestId('row'));
      expect(style.paddingStart).toBeUndefined();
      expect(style.borderTopStartRadius).toBeUndefined();
      expect(styleOf(view.getByTestId('label')).textAlign).not.toBe('start');
    }
  });
});

describe('switching direction without a restart', () => {
  function Screen(): React.ReactElement {
    const { dir, toggleDirection } = useDirection();
    const s = useLogicalStyles(styles);
    return (
      <View>
        <View style={s.row} testID="row" />
        <Text testID="dir">{dir}</Text>
        <Text testID="toggle" onPress={toggleDirection}>
          toggle
        </Text>
      </View>
    );
  }

  it('re-resolves every style on an ordinary state update', () => {
    // The whole point. There is no reload, no I18nManager.forceRTL, and no
    // remount — the same mounted tree produces mirrored physical styles.
    render(
      <DirectionProvider>
        <Screen />
      </DirectionProvider>,
    );

    expect(screen.getByTestId('dir').props.children).toBe('ltr');
    expect(styleOf(screen.getByTestId('row'))).toMatchObject({
      flexDirection: 'row',
      paddingLeft: 16,
    });

    act(() => {
      fireEvent.press(screen.getByTestId('toggle'));
    });

    expect(screen.getByTestId('dir').props.children).toBe('rtl');
    expect(styleOf(screen.getByTestId('row'))).toMatchObject({
      flexDirection: 'row-reverse',
      paddingRight: 16,
    });
  });

  it('does not touch I18nManager', () => {
    // If Harf ever called forceRTL, this would be the regression that catches
    // it — and the user would be looking at a white flash and a restart.
    const forceRTL = jest.fn();
    const allowRTL = jest.fn();
    const originalForce = I18nManager.forceRTL;
    const originalAllow = I18nManager.allowRTL;
    I18nManager.forceRTL = forceRTL;
    I18nManager.allowRTL = allowRTL;

    try {
      render(
        <DirectionProvider>
          <Screen />
        </DirectionProvider>,
      );
      act(() => {
        fireEvent.press(screen.getByTestId('toggle'));
      });
      expect(forceRTL).not.toHaveBeenCalled();
      expect(allowRTL).not.toHaveBeenCalled();
    } finally {
      I18nManager.forceRTL = originalForce;
      I18nManager.allowRTL = originalAllow;
    }
  });

  it('derives direction from a locale prop', () => {
    render(
      <DirectionProvider locale="ar-EG">
        <Screen />
      </DirectionProvider>,
    );
    expect(screen.getByTestId('dir').props.children).toBe('rtl');
  });
});

describe('assertHarfConfiguration', () => {
  it('warns when I18nManager.isRTL is true, because the two reversals cancel', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const original = I18nManager.isRTL;
    I18nManager.isRTL = true;
    try {
      assertHarfConfiguration();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('cancel'));
    } finally {
      I18nManager.isRTL = original;
      warn.mockRestore();
    }
  });

  it('says nothing when the app is configured correctly', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    assertHarfConfiguration();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('<Bidi>', () => {
  it('applies the Unicode control characters, since RN has no unicode-bidi', () => {
    const view = renderWithDirection(<Bidi testID="b">Karnak Holidays 2026</Bidi>, 'rtl');
    const text = view.getByTestId('b').props.children as string;
    expect(text.startsWith(FSI)).toBe(true);
    expect(text.endsWith(PDI)).toBe(true);
    expect(stripBidi(text)).toBe('Karnak Holidays 2026');
  });

  it('auto-isolates every embedded run and stays reversible', () => {
    const source = 'مرحبا بك في Karnak Holidays 2026 اليوم';
    const view = renderWithDirection(
      <Bidi auto testID="b">
        {source}
      </Bidi>,
      'rtl',
    );
    const text = view.getByTestId('b').props.children as string;
    expect(text).toContain(FSI);
    expect(stripBidi(text)).toBe(source);
  });

  it('keeps a phone number contiguous', () => {
    const source = 'اتصل على +20 114 919 9190 الآن';
    const view = renderWithDirection(
      <Bidi auto testID="b">
        {source}
      </Bidi>,
      'rtl',
    );
    expect(view.getByTestId('b').props.children).toContain('+20 114 919 9190');
  });

  it('leaves non-string children alone', () => {
    const view = renderWithDirection(
      <Bidi testID="b">
        <Text testID="inner">مرحبا</Text>
      </Bidi>,
      'rtl',
    );
    expect(view.getByTestId('inner')).toBeTruthy();
  });
});

describe('<Num>', () => {
  it('leaves digits Western by default', () => {
    const view = renderWithDirection(<Num testID="n">{1234}</Num>, 'rtl');
    expect(view.getByTestId('n').props.children).toBe('1,234');
  });

  it('converts when asked', () => {
    const view = renderWithDirection(
      <Num testID="n" numerals="arabic">
        {1234}
      </Num>,
      'rtl',
    );
    expect(view.getByTestId('n').props.children).toBe('١٬٢٣٤');
  });

  it('formats a three-decimal currency correctly', () => {
    const view = renderWithDirection(
      <Num testID="n" currency="KWD">
        {19.5}
      </Num>,
      'rtl',
    );
    expect(view.getByTestId('n').props.children).toBe('19.500 د.ك');
  });

  it('never converts a literal value', () => {
    const view = renderWithDirection(
      <Num testID="n" literal numerals="arabic">
        +20 114 919 9190
      </Num>,
      'rtl',
    );
    const text = view.getByTestId('n').props.children as string;
    expect(stripBidi(text)).toBe('+20 114 919 9190');
    expect(text).not.toMatch(/[٠-٩]/);
  });

  it('warns before converting something that looks machine-readable', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    renderWithDirection(
      <Num testID="n" numerals="arabic">
        +20 111 000 0009
      </Num>,
      'rtl',
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('machine-readable'));
    warn.mockRestore();
  });
});

describe('<Mirror>', () => {
  it('mirrors a registry icon under RTL only', () => {
    const { ltr, rtl } = renderBoth(
      <Mirror name="chevron-forward" testID="m">
        <Text>x</Text>
      </Mirror>,
    );
    expect(styleOf(ltr.getByTestId('m')).transform).toBeUndefined();
    expect(styleOf(rtl.getByTestId('m')).transform).toEqual([{ scaleX: -1 }]);
  });

  it('never mirrors an excluded icon', () => {
    const { rtl } = renderBoth(
      <Mirror name="clock" testID="m">
        <Text>x</Text>
      </Mirror>,
    );
    expect(styleOf(rtl.getByTestId('m')).transform).toBeUndefined();
  });

  it('leaves an unknown icon alone', () => {
    const { rtl } = renderBoth(
      <Mirror name="brand-glyph" testID="m">
        <Text>x</Text>
      </Mirror>,
    );
    expect(styleOf(rtl.getByTestId('m')).transform).toBeUndefined();
  });

  it('mirrors when forced', () => {
    const { rtl } = renderBoth(
      <Mirror force testID="m">
        <Text>x</Text>
      </Mirror>,
    );
    expect(styleOf(rtl.getByTestId('m')).transform).toEqual([{ scaleX: -1 }]);
  });
});

describe('scrolling, paging and navigation helpers', () => {
  function Probe(): React.ReactElement {
    const offset = useDirectionalScrollOffset(1000, 400);
    const toPhysical = useDirectionalIndex(5);
    const side = useDrawerSide();
    const transition = useScreenTransition();
    return (
      <View>
        <Text testID="offset">{String(offset.x)}</Text>
        <Text testID="index">{String(toPhysical(1))}</Text>
        <Text testID="side">{side}</Text>
        <Text testID="enterFrom">{String(transition.enterFrom)}</Text>
        <Text testID="back">{transition.backButtonSide}</Text>
        <Text testID="gesture">{transition.backGestureEdge}</Text>
      </View>
    );
  }

  it('starts a reversed pager at the far end, not at zero', () => {
    // A row-reverse ScrollView still begins at content offset 0, which under
    // RTL is the last page. The native scroll view knows nothing about the
    // context direction, so this has to come from JavaScript.
    const { ltr, rtl } = renderBoth(<Probe />);
    expect(ltr.getByTestId('offset').props.children).toBe('0');
    expect(rtl.getByTestId('offset').props.children).toBe('600');
  });

  it('maps a logical page index to the physical one', () => {
    const { ltr, rtl } = renderBoth(<Probe />);
    expect(ltr.getByTestId('index').props.children).toBe('1');
    expect(rtl.getByTestId('index').props.children).toBe('3');
  });

  it('puts the drawer on the correct side', () => {
    const { ltr, rtl } = renderBoth(<Probe />);
    expect(ltr.getByTestId('side').props.children).toBe('left');
    expect(rtl.getByTestId('side').props.children).toBe('right');
  });

  it('flips the screen transition, back button and back gesture', () => {
    const { ltr, rtl } = renderBoth(<Probe />);
    expect(ltr.getByTestId('enterFrom').props.children).toBe('1');
    expect(rtl.getByTestId('enterFrom').props.children).toBe('-1');
    expect(ltr.getByTestId('back').props.children).toBe('left');
    expect(rtl.getByTestId('back').props.children).toBe('right');
    expect(ltr.getByTestId('gesture').props.children).toBe('left');
    expect(rtl.getByTestId('gesture').props.children).toBe('right');
  });
});

describe('useDirectionalData', () => {
  function List(): React.ReactElement {
    const data = useDirectionalData(['a', 'b', 'c']);
    return <Text testID="data">{data.join('')}</Text>;
  }

  it('reverses the data under RTL and returns it unchanged under LTR', () => {
    const { ltr, rtl } = renderBoth(<List />);
    expect(ltr.getByTestId('data').props.children).toBe('abc');
    expect(rtl.getByTestId('data').props.children).toBe('cba');
  });
});

describe('the limits table', () => {
  it('has a subject, a status, a detail and an evidence level for every row', () => {
    expect(LIMITS.length).toBeGreaterThan(10);
    for (const limit of LIMITS) {
      expect(limit.subject.length).toBeGreaterThan(3);
      expect(['handled', 'partial', 'needs-restart', 'not-applicable']).toContain(
        limit.status,
      );
      expect(limit.detail.length).toBeGreaterThan(30);
      expect(['measured', 'reasoned', 'unverified']).toContain(limit.evidence);
    }
  });

  it('gives a workaround for every row that needs a restart', () => {
    // If Harf cannot fix something, the least it can do is say what to do
    // instead — or say plainly that there is nothing to do.
    for (const limit of LIMITS.filter((l) => l.status === 'needs-restart')) {
      const hasAdvice = limit.workaround !== undefined || limit.detail.includes('the OS');
      if (!hasAdvice) throw new Error(`no advice for: ${limit.subject}`);
      expect(hasAdvice).toBe(true);
    }
  });

  it('names the things Harf genuinely handles', () => {
    const handled = handledSubjects();
    expect(handled.some((s) => s.includes('View / Text layout'))).toBe(true);
    expect(handled.some((s) => s.includes('flexDirection'))).toBe(true);
    expect(handled.some((s) => s.includes('mirroring'))).toBe(true);
  });

  it('names the things it does not, without hedging', () => {
    const restart = restartRequiredSubjects();
    expect(restart.some((s) => s.includes('TextInput caret'))).toBe(true);
    expect(restart.some((s) => s.includes('Switch'))).toBe(true);
    expect(restart.length).toBeGreaterThan(0);
  });

  it('renders as a Markdown table with the evidence column intact', () => {
    const markdown = limitsAsMarkdown();
    expect(markdown).toContain('| Subject | Status | Evidence | Detail |');
    expect(markdown).toContain('unverified');
    expect(markdown.split('\n').length).toBe(LIMITS.length + 2);
  });

  it('does not claim more than it has evidence for', () => {
    // Any row marked 'handled' must be backed by a real measurement or by
    // reasoning from React Native's own layout model. A 'handled' row marked
    // 'unverified' would be exactly the kind of claim that costs a README its
    // credibility.
    for (const limit of LIMITS.filter((l) => l.status === 'handled')) {
      if (limit.evidence === 'unverified') {
        throw new Error(`row is marked 'handled' but unverified: ${limit.subject}`);
      }
      expect(limit.evidence).not.toBe('unverified');
    }
  });
});
