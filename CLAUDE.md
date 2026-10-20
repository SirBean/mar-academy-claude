# Working in this repo

This is the MAR Creative Academy 2026 motion production system (Remotion).

- **Read `STYLE.md` before generating or changing any graphic.** It is the spec, and code must follow it.
- **Values live only in `src/system/tokens.ts`.** Never hardcode colours, sizes or timings in templates.
- **Never use `Math.random()`.** Use `rand`, `ihash` and `noise3` from `src/system/rng.ts`. Every frame must be a pure function of (props, frame).
- **Content (names, dates, workshops) lives in `content/edition-2026.json`.** `TBD` values must be confirmed before publishing.
- **Verify by rendering stills:** `npm run render -- --template X --format story --still --frame N`. Look at the PNG and compare it with STYLE.md before rendering video.
- **Inside `<Sequence>`, `useCurrentFrame()` is relative to the sequence start.**
- **Typecheck** with `npm run typecheck`.
