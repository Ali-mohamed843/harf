---
'@harf/core': minor
'@harf/react': minor
'@harf/native': minor
---

Add the React and React Native adapters.

`@harf/core/react` holds the direction context, provider and hooks that both
adapters share, so there is exactly one context in a process — a
react-native-web app, or a monorepo sharing component code between web and
native, would otherwise get two and a `useDirection()` that silently returns
the default. `react` is an optional peer dependency of `@harf/core`; it stays
out of `dependencies`, so the zero-runtime-dependency rule still holds.

`@harf/native` switches direction **without an app restart**. `DirectionProvider`
holds the direction in React state and logical styles resolve at render time,
so changing language is an ordinary re-render: no reload, no white flash, no
`I18nManager.forceRTL`. A test asserts component state survives the switch,
proving nothing remounted, and another asserts Harf never calls `forceRTL` or
`allowRTL` at all.

Also in `@harf/native`: `assertHarfConfiguration()`, which warns if you have
left `I18nManager.isRTL` true (Yoga would reverse rows and Harf would reverse
them again, cancelling out); `useDirectionalScrollOffset` and
`useDirectionalIndex` for horizontal pagers, which still start at content
offset zero — the wrong end — when reversed by style; `useScreenTransition` for
React Navigation's back button side, transition direction and back-gesture
edge, expressed as plain numbers so there is no dependency on Reanimated or
React Navigation.

`LIMITS` is the honest limits table as data, with an `evidence` column marking
each row `measured`, `reasoned` or `unverified`. The README table is generated
from it. A test forbids any row claiming `handled` while marked `unverified`.

`@harf/react` ships `<Bidi>` using CSS `unicode-bidi: isolate` rather than
injecting control characters, so copied text and `textContent` are the value
you passed in. `@harf/native` applies the control characters, because React
Native has no such CSS property.

`<Num literal>` on both platforms renders a value untouched and isolated, and
in development `<Num>` warns before converting the digits of anything that
looks like a phone number, ID, order reference or OTP.

The mirroring registry gained the names real icon sets actually ship —
Ionicons' `chevron-forward`/`chevron-back`, Material's `keyboard-arrow-*`,
Feather's `chevrons-*` and `corner-*`, Lucide's `circle-chevron-*` — after a
test caught `chevron-forward` missing.
