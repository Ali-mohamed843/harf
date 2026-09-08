# example-native

An Expo app demonstrating every Harf feature, runnable in Expo Go.

```bash
pnpm install
pnpm build          # the @harf/* packages must be built first
pnpm --filter example-native start
```

Scan the QR code with Expo Go, then tap **العربية / English** in the header.

## What to look for

The counter under the first card is the point. It survives the switch, because
there is no restart — the direction change is an ordinary React state update.
If the app were using `I18nManager.forceRTL`, the screen would flash white, the
app would reload, and the counter would be back at zero.

| Card                  | Demonstrates                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| Logical layout        | Margins, padding, the start-side accent bar, radius corners               |
| Bidi isolation        | The same sentence with and without `<Bidi auto>`                          |
| Numerals              | Three digit systems, and `<Num literal>` for values that must not convert |
| Currency              | Five currencies, including KWD's three decimal places                     |
| Dates                 | Gregorian and Hijri, plus what this engine's `Intl` actually supports     |
| Icon mirroring        | Chevrons flip; clocks, ticks and play buttons do not                      |
| Chat bubbles          | The clipped corner follows the speaker                                    |
| Horizontal paging     | A reversed pager starting at the correct end                              |
| Arabic typography     | The same text at `fontSize * 1.2` and at a safe line height               |
| `useScreenTransition` | Back button side and gesture edge                                         |
| The limits table      | Read from `@harf/native` at runtime, not retyped                          |

## Deliberately absent

There is **no `I18nManager.forceRTL`** anywhere in this project — not in
`app.json`, not in a config plugin, not in code. `assertHarfConfiguration()`
runs on mount and warns if the native flag has been set behind Harf's back,
because Yoga would then reverse rows as well and the two would cancel out.

`app.json` also sets `newArchEnabled: false`, matching the versions the limits
table was written against. If you flip it on, please tell us what changes.

## Not a test suite

This app has no unit tests; `pnpm test` is a no-op for it. It exists to be
looked at on a device. The behaviour it demonstrates is covered by tests in the
packages themselves — `@harf/native` alone has 32.
