# @harf/react

React adapter for Harf, for the web.

```bash
pnpm add @harf/core @harf/react
```

On the web, CSS logical properties already handle most layout, and this package
does not reimplement them. It exists for what CSS does not give you.

## Direction React can react to

```tsx
import { DirectionProvider, useDirection } from '@harf/react';

<DirectionProvider locale="ar-EG">
  <App />
</DirectionProvider>;

const { dir, isRTL, toggleDirection } = useDirection();
```

The context lives in `@harf/core/react`, shared with `@harf/native`, so a
react-native-web app or a monorepo sharing components between web and native has
**one** direction context rather than two.

## Bidi isolation that survives copy-paste

```tsx
import { Bidi } from '@harf/react';

<p dir="rtl">
  مرحبا بك في <Bidi>Karnak Holidays 2026</Bidi> اليوم
</p>;

<Bidi auto>{product.description}</Bidi>;
```

On the web this sets CSS `unicode-bidi: isolate` rather than injecting control
characters, so the text node is untouched: the user copies what they see, and
`textContent` in a test or a scraper is the value you passed in.

## Numbers, with the copy-safety rule

```tsx
<Num decimals={2}>{1234.5}</Num>      {/* 1,234.50 */}
<Num currency="EGP">{1250.5}</Num>    {/* 1,250.50 ج.م. */}
<Num numerals="arabic">{1234}</Num>   {/* ١٬٢٣٤ */}

<Num literal>{order.reference}</Num>  {/* never converted */}
```

`<Num>` warns in development before converting anything that looks like a phone
number, ID, IBAN or OTP — values that stop working when their digits change.

## Mirroring

```tsx
<Mirror name="chevron-right"><ChevronIcon /></Mirror>  {/* flips under RTL */}
<Mirror name="clock"><ClockIcon /></Mirror>            {/* never flips */}
<Mirror force><CustomArrow /></Mirror>                 {/* your call */}
```

## Typography

```tsx
const style = useArabicSafeText({ family: 'Cairo', fontSize: 16 });
// { fontSize: 16, lineHeight: 28, fontFamily: 'Cairo, Inter, "Helvetica Neue", …' }
```

## Testing

```tsx
import { renderBoth } from '@harf/react/testing';

const { ltr, rtl } = renderBoth(<Card title="مرحبا" />);
expect(ltr.container.innerHTML).toMatchSnapshot('ltr');
expect(rtl.container.innerHTML).toMatchSnapshot('rtl');
```

## License

[MIT](./LICENSE)
