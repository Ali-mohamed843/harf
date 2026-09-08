# @harf/native

React Native adapter for Harf. **Switch language without restarting the app.**

```bash
pnpm add @harf/core @harf/native
```

## The problem

`I18nManager.forceRTL()` requires a full reload to take effect. The user picks
Arabic, the screen flashes white, the app restarts, unsaved state is gone.

Harf does not use `I18nManager` for layout at all.

```tsx
import { createStyles } from '@harf/core';
import { DirectionProvider, useDirection, useLogicalStyles } from '@harf/native';

const styles = createStyles({
  row: { flexDirection: 'row', paddingStart: 16, borderTopStartRadius: 12 },
  title: { textAlign: 'start', fontSize: 18 },
});

function Header() {
  const s = useLogicalStyles(styles);
  const { toggleDirection, isRTL } = useDirection();
  return (
    <View style={s.row}>
      <Text style={s.title}>مرحبا</Text>
      <Button title={isRTL ? 'English' : 'العربية'} onPress={toggleDirection} />
    </View>
  );
}

export default function App() {
  return (
    <DirectionProvider locale="ar-EG">
      <Header />
    </DirectionProvider>
  );
}
```

## Setup

Add this once, at startup:

```ts
import { assertHarfConfiguration } from '@harf/native';
assertHarfConfiguration();
```

**Do not call `I18nManager.forceRTL(true)`.** Harf reverses rows itself; if Yoga
also reverses them the two cancel out and it looks like Harf does not work.
`assertHarfConfiguration()` warns in development if you have.

## Limits

Some components are laid out by native code that reads `I18nManager.isRTL` and
cannot be corrected from JavaScript. The
[limits table in the root README](../../README.md#the-honest-limits-table) says
which, and how confident each row is. It is generated from
[`src/limits.ts`](./src/limits.ts), which you can also read at runtime:

```ts
import { LIMITS, restartRequiredSubjects } from '@harf/native';
```

## Components

```tsx
<Bidi>Karnak Holidays 2026</Bidi>       {/* isolate an LTR run */}
<Bidi auto>{product.description}</Bidi> {/* find the runs automatically */}

<Num decimals={2}>{1234.5}</Num>        {/* 1,234.50 */}
<Num currency="KWD">{19.5}</Num>        {/* 19.500 د.ك */}
<Num literal>{user.phone}</Num>         {/* never converted, always isolated */}

<Mirror name="chevron-forward"><Icon /></Mirror>
```

## Hooks

| Hook                                      | For                                                  |
| ----------------------------------------- | ---------------------------------------------------- |
| `useDirection()`                          | `dir`, `isRTL`, `setDirection`, `toggleDirection`    |
| `useLogicalStyles(sheet)`                 | Resolve a `createStyles` sheet                       |
| `useDirectionalTranslate(x)`              | Flip a `translateX` sign                             |
| `useDirectionalScrollOffset(w, v)`        | Start a reversed pager at the right end              |
| `useDirectionalIndex(count)`              | Logical → physical page index                        |
| `useDirectionalData(items)`               | Reverse a horizontal list's data                     |
| `useScreenTransition()`                   | Back button side, transition direction, gesture edge |
| `useDrawerSide()`                         | `'left'` or `'right'`                                |
| `useArabicSafeText({ family, fontSize })` | A line height that does not clip                     |

Navigation and animation helpers return plain numbers and sides, so this package
takes **no dependency** on Reanimated or React Navigation.

## Testing

```tsx
import { renderBoth } from '@harf/native/testing';

const { ltr, rtl } = renderBoth(<Card />);
expect(ltr.toJSON()).toMatchSnapshot('ltr');
expect(rtl.toJSON()).toMatchSnapshot('rtl');
```

## License

[MIT](./LICENSE)
