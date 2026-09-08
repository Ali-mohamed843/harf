---
'@harf/native': minor
'@harf/core': patch
---

Add `@harf/native/limits`, and widen `StyleValue`.

The limits table is now its own entry point with no `react-native` import, so a
docs site, a build script or anything else that is not a React Native app can
read it. React Native ships untranspiled Flow that plain Node and a Next.js
server cannot parse, which previously made the table unreadable outside an app.

`StyleValue` is now `unknown` rather than a union of the types React Native
happens to accept. Harf only ever _moves_ a value from one property name to
another, and guards the two it inspects with a `typeof` check, so the narrower
type bought no safety while rejecting the `Record<string, unknown>` callers
naturally have.
