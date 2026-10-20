# Research & technical decisions

## Why Remotion

- **Frame-based React:** every frame is `f(props, frame)`. That is exactly what a rule-based, seed-driven system needs: the same input always gives the same output.
- **Renders headlessly from a CLI or Node API** (`@remotion/renderer`), so a JSON "kit" can produce the whole campaign in one command.
- **The Studio gives a live preview and a props editor** driven by the zod schema in `src/system/schema.ts`, so non-coders can change text and seeds.
- **Version used:** 4.0.537. All `remotion` / `@remotion/*` packages must share exactly the same version, so they are pinned.

## Determinism rules (from Remotion docs)

- **`Math.random()` breaks renders**, because frames are rendered in parallel tabs and each tab would get different values. Use seeded randomness instead. Source: [remotion.dev/docs/using-randomness](https://www.remotion.dev/docs/using-randomness).
- **This repo uses its own seeded PRNG plus simplex noise** (`src/system/rng.ts`) for speed in hot loops (up to about 100k points per frame), following the same rule.
- **Canvas layers redraw from scratch every frame**, with no state carried over. Caches (glyph atlas, masks, metrics) only memoise pure results.
- **Fonts are bundled via @fontsource and awaited with `delayRender`** before canvas text is drawn, so no frame renders with a fallback font.

## Performance notes

- **Glyph rasters use a sprite atlas** (each glyph is rasterised once and then blitted) and a low-res upscale for bloom instead of `ctx.filter: blur`. The naïve version timed out at more than 30 s per frame. The atlas version takes under 1 s.
- **The terrain is about 100k points with 1-bit stochastic dithering:** a dot is drawn if `hash(i, j, t) > luminance`, so no greys are ever drawn.
- **Typical speed:** about 20 s to render 8 s of 1080×1920 on a laptop-class CPU.

## Licence

- **Remotion is free for individuals and companies of up to 3 people.** If the client owns or operates the project, or 4+ people work on it, a Company License is required. Source: [remotion.dev/docs/license/faq](https://www.remotion.dev/docs/license/faq).
- **Geist Sans/Mono and Archivo are SIL OFL**, so commercial use is fine.

## Reference provenance

The five references (A–E) are third-party works used for style analysis only.
They are not committed to this repo. STYLE.md §1 describes what was taken from each.
