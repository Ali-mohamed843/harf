import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { stripBidi, FSI, PDI } from '@harf/core';
import { Bidi, Mirror, Num } from './index';
import { renderBoth, renderWithDirection } from './testing';

const BRAND = 'Karnak Holidays 2026';
const SENTENCE = 'مرحبا بك في Karnak Holidays 2026 اليوم';
const PHONE = '+20 114 919 9190';

describe('<Bidi>', () => {
  it('isolates with CSS, not by injecting control characters', () => {
    // The CSS approach leaves the text node untouched, so the user copies the
    // value they can see and textContent is the value you passed in.
    const view = renderWithDirection(<Bidi>{BRAND}</Bidi>, 'rtl');
    const element = view.container.firstElementChild as HTMLElement;

    expect(element.textContent).toBe(BRAND);
    expect(element.textContent).not.toContain(FSI);
    expect(element.style.unicodeBidi).toBe('isolate');
  });

  it('sets dir from the content’s own first strong character', () => {
    const latin = renderWithDirection(<Bidi>{BRAND}</Bidi>, 'rtl');
    expect((latin.container.firstElementChild as HTMLElement).dir).toBe('ltr');

    const arabic = renderWithDirection(<Bidi>مرحبا</Bidi>, 'ltr');
    expect((arabic.container.firstElementChild as HTMLElement).dir).toBe('rtl');
  });

  it('accepts an explicit dir', () => {
    const view = renderWithDirection(<Bidi dir="rtl">{BRAND}</Bidi>, 'ltr');
    expect((view.container.firstElementChild as HTMLElement).dir).toBe('rtl');
  });

  it('renders the element you ask for', () => {
    const view = renderWithDirection(<Bidi as="bdi">{BRAND}</Bidi>, 'rtl');
    expect(view.container.firstElementChild?.tagName).toBe('BDI');
  });

  it('keeps caller styles and className', () => {
    const view = renderWithDirection(
      <Bidi className="brand" style={{ color: 'red' }}>
        {BRAND}
      </Bidi>,
      'rtl',
    );
    const element = view.container.firstElementChild as HTMLElement;
    expect(element.className).toBe('brand');
    expect(element.style.color).toBe('red');
    expect(element.style.unicodeBidi).toBe('isolate');
  });

  it('auto-isolates embedded runs when asked, and stays reversible', () => {
    const view = renderWithDirection(<Bidi auto>{SENTENCE}</Bidi>, 'rtl');
    const text = view.container.textContent ?? '';
    expect(text).toContain(FSI);
    expect(text).toContain(PDI);
    expect(stripBidi(text)).toBe(SENTENCE);
  });

  it('renders non-string children untouched', () => {
    const view = renderWithDirection(
      <Bidi auto>
        <strong>مرحبا</strong>
      </Bidi>,
      'rtl',
    );
    expect(view.container.querySelector('strong')?.textContent).toBe('مرحبا');
  });

  it('renders identically in both directions, because isolation is the point', () => {
    const { ltr, rtl } = renderBoth(<Bidi>{BRAND}</Bidi>);
    expect(ltr.container.textContent).toBe(rtl.container.textContent);
  });
});

describe('<Num>', () => {
  it('leaves digits Western by default', () => {
    const view = renderWithDirection(<Num>{1234}</Num>, 'rtl');
    expect(view.container.textContent).toBe('1,234');
  });

  it('converts when a numeral system is asked for', () => {
    const arabic = renderWithDirection(<Num numerals="arabic">{1234}</Num>, 'rtl');
    expect(arabic.container.textContent).toBe('١٬٢٣٤');

    const persian = renderWithDirection(<Num numerals="persian">{1234}</Num>, 'rtl');
    expect(persian.container.textContent).toBe('۱٬۲۳۴');
  });

  it('derives the numeral system from a locale', () => {
    // ar-EG stays Western. This is deliberate and documented.
    const eg = renderWithDirection(<Num locale="ar-EG">{1234}</Num>, 'rtl');
    expect(eg.container.textContent).toBe('1,234');

    const fa = renderWithDirection(<Num locale="fa-IR">{1234}</Num>, 'rtl');
    expect(fa.container.textContent).toBe('۱٬۲۳۴');
  });

  it('inherits the locale from the provider', () => {
    const view = renderWithDirection(<Num>{1234}</Num>, 'rtl');
    expect(view.container.textContent).toBe('1,234');
  });

  it('formats decimals', () => {
    const view = renderWithDirection(<Num decimals={2}>{1234.5}</Num>, 'rtl');
    expect(view.container.textContent).toBe('1,234.50');
  });

  it('formats a currency, with the right decimal count', () => {
    const egp = renderWithDirection(<Num currency="EGP">{1250.5}</Num>, 'rtl');
    expect(egp.container.textContent).toBe('1,250.50 ج.م.');

    const kwd = renderWithDirection(<Num currency="KWD">{19.5}</Num>, 'rtl');
    expect(kwd.container.textContent).toBe('19.500 د.ك');
  });

  it('renders the same number identically in both directions', () => {
    const { ltr, rtl } = renderBoth(<Num decimals={2}>{1234.5}</Num>);
    expect(ltr.container.textContent).toBe(rtl.container.textContent);
  });
});

describe('<Num literal> — the copy-safety rule', () => {
  it('never converts the digits of a literal value', () => {
    const view = renderWithDirection(
      <Num literal numerals="arabic">
        {PHONE}
      </Num>,
      'rtl',
    );
    const text = view.container.textContent ?? '';
    expect(stripBidi(text)).toBe(PHONE);
    expect(text).not.toMatch(/[٠-٩]/);
  });

  it('isolates a literal value, so its digit groups keep their order', () => {
    const view = renderWithDirection(<Num literal>{PHONE}</Num>, 'rtl');
    const text = view.container.textContent ?? '';
    expect(text.startsWith(FSI)).toBe(true);
    expect(text.endsWith(PDI)).toBe(true);
    expect(stripBidi(text)).toBe(PHONE);
  });

  it.each([
    ['a phone number', '+20 114 919 9190'],
    ['an order reference', 'KRN-2026-0042'],
    ['an OTP code', '483920'],
    ['an IBAN', 'EG380019000500000000263180002'],
    ['a national ID', '29001011234567'],
  ])('keeps %s parseable and copyable', (_label, value) => {
    const view = renderWithDirection(
      <Num literal numerals="arabic">
        {value}
      </Num>,
      'rtl',
    );
    expect(stripBidi(view.container.textContent ?? '')).toBe(value);
  });

  it('warns in development before converting a copy-sensitive value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderWithDirection(<Num numerals="arabic">{'+20 100 000 0001'}</Num>, 'rtl');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('machine-readable'));
    warn.mockRestore();
  });

  it('does not warn for an ordinary quantity', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderWithDirection(<Num numerals="arabic">{'1,250.00'}</Num>, 'rtl');
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not warn when the value is marked literal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderWithDirection(
      <Num literal numerals="arabic">
        {'+20 100 000 0002'}
      </Num>,
      'rtl',
    );
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('<Mirror>', () => {
  it('mirrors an icon the registry says should mirror, under RTL only', () => {
    const { ltr, rtl } = renderBoth(
      <Mirror name="chevron-right">
        <i />
      </Mirror>,
    );
    expect((ltr.container.firstElementChild as HTMLElement).style.transform).toBe('');
    expect((rtl.container.firstElementChild as HTMLElement).style.transform).toBe(
      'scaleX(-1)',
    );
  });

  it('never mirrors an icon on the exclusion list', () => {
    const { ltr, rtl } = renderBoth(
      <Mirror name="clock">
        <i />
      </Mirror>,
    );
    for (const view of [ltr, rtl]) {
      expect((view.container.firstElementChild as HTMLElement).style.transform).toBe('');
    }
  });

  it('leaves an unknown icon alone, which is the safe default', () => {
    const { rtl } = renderBoth(
      <Mirror name="some-custom-brand-glyph">
        <i />
      </Mirror>,
    );
    expect((rtl.container.firstElementChild as HTMLElement).style.transform).toBe('');
  });

  it('mirrors unconditionally when forced', () => {
    const { ltr, rtl } = renderBoth(
      <Mirror force>
        <i />
      </Mirror>,
    );
    expect((ltr.container.firstElementChild as HTMLElement).style.transform).toBe('');
    expect((rtl.container.firstElementChild as HTMLElement).style.transform).toBe(
      'scaleX(-1)',
    );
  });

  it('renders its children', () => {
    const view = renderWithDirection(
      <Mirror name="chevron-right">
        <span>icon</span>
      </Mirror>,
      'rtl',
    );
    expect(view.getByText('icon')).toBeTruthy();
  });
});

describe('renderBoth', () => {
  it('gives both trees and an entries pair for it.each', () => {
    const both = renderBoth(<Num decimals={0}>{5}</Num>);
    expect(both.ltr.container.textContent).toBe('5');
    expect(both.rtl.container.textContent).toBe('5');
    expect(both.entries.map(([dir]) => dir)).toEqual(['ltr', 'rtl']);
  });

  it('surfaces a component that fails to mirror', () => {
    // A physical style does not change between directions, which is exactly
    // the failure renderBoth is for.
    function Broken(): React.ReactElement {
      return <div style={{ marginLeft: 8 }}>x</div>;
    }
    const { ltr, rtl } = renderBoth(<Broken />);
    expect(ltr.container.innerHTML).toBe(rtl.container.innerHTML);
  });
});

describe('the accessibility of the rendered output', () => {
  it('does not put invisible control characters into the accessible name', () => {
    // A screen reader reads textContent. Isolate characters in it are at best
    // noise and at worst pronounced.
    renderWithDirection(
      <Bidi>
        <span aria-label="Karnak">{BRAND}</span>
      </Bidi>,
      'rtl',
    );
    expect(screen.getByLabelText('Karnak').textContent).toBe(BRAND);
  });
});
