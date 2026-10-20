# MAR Academy 2026 — Style Rules

The rules below were extracted from 5 references (§1) and are enforced in code.
Each rule names where it is implemented, and **tokens live only in
`src/system/tokens.ts`**. If a new graphic breaks a rule, the problem is the
graphic, not the rule.

> **Core idea: _tessera = pixel = glyph_.** Ravenna has made images out of
> discrete units for 1,500 years. Every visual in this system is built on a
> cell grid: mosaic tiles, pixels, characters and dots are the same thing.

---

## 1. References → what we took

| # | Reference | What we extracted | Module |
|---|-----------|-------------------|--------|
| A | Code-as-identity event film (black, syntax colours, typed titles) | typewriter, bracket-built title, syntax colour roles, selection highlight, staircase lists, dot loader, measure frames | `modules/Code.tsx` |
| B | "OPEN CALL STARTS NOW" kinetic type | letters fill per-cell, non-uniform stretch, re-dealt on every beat | `modules/StretchType.tsx` |
| C | ASCII "A" in 0/1 with RGB split | letterform rasterised to a 0/1 glyph grid, chroma split, bloom, camera push | `modules/GlyphField.tsx` (raster) |
| D | Triptych: glyph scatter · wave lines · pixel blobs | three generative textures, hairline strokes, noise-thresholded tiles | `GlyphField` (scatter), `WaveLines`, `TesseraField` |
| E | 1-bit dithered terrain on grey | stochastic 1-bit dithering of a 3D point surface, rise + dolly + disintegration | `modules/DitherTerrain.tsx` |

---

## 2. Colour

- **Two grounds only.** `night` #000000 (A–D) and `paper` #CDCDCD (E). There are no gradients and no tints.
- **Ink:** #F2F1F2 on night, #000000 on paper. Secondary text uses #949494, and hairlines and frames use #363436.
- **Generative textures are monochrome.** Tiles are #9C9C9C or #D3D3D3, and lines and glyphs use the ink colour.
- **Accents** come from ref A's syntax colours: blue #328FF2, green #54CA31 and orange #FF7B00. Colour carries **meaning**, never decoration:
  - blue = keywords and the product name (`from`, `import`, `const`, `Academy`)
  - green = keys and labels (`city:`, `title:`, `import`)
  - orange = values and strings (`"Ravenna"`, `"Design"`)
- Use **max one accent per word**. A sentence can cycle accents line by line (staircase), but never inside a word.
- Use **chroma (RGB split) only in glyph rasters** (ref C). The core is #DDF7E6, the left ghost is blue and the right ghost is red.

## 3. Type

| Role | Face | Use |
|------|------|-----|
| Voice / code | Geist Sans 400 | everything typed: code, titles, names, cascades |
| Data / glyphs | Geist Mono 400/700 | 0/1 rasters, `// comments`, measure numbers |
| Display | Archivo 900 | stretch type and small uppercase labels only |

- **Sizes are fractions of the frame's short side** (`typeScale`): micro .011 · label .018 · body .030 · title .056 · hero .11. Never set px by hand.
- **Code voice is lowercase-sensitive and literal.** Write `academy.boot();`, not "Academy Boot".
- **Display type is always uppercase, 900 weight, and stretched to fill its cell.** It never sits at natural proportions.
- **Titles are built in brackets:** `MAR Academy[2026(Creative)]`. Brackets appear as a pair, then fill. At the end, every segment gets a hairline box.
- Use **no em-dashes in copy**.

## 4. Grid

- **One base cell = 0.75% of the short side** (≈8 px at 1080). Tiles, glyphs and dots snap to it.
- **The tile gap is 22% of the cell**, which reads as a mosaic joint.
- **The margin is 4% of the short side.**
- **Text over a generative field sits in a solid "slot":** a ground-coloured block whose padding snaps to the cell grid. Never put text directly on texture and never use drop shadows.

## 5. Motion

- **The frame rate is 30 fps.** One **beat = 15 frames** (0.5 s), measured from ref B's cut rhythm, and one bar = 4 beats.
- **Generative layers update "on twos"** (`stepped()`, every 2 frames). They never move smoothly, so they feel like a terminal or signal.
- **Text is typed, not faded.** It runs at 2–4 chars per frame, with a block cursor in accent blue that blinks hard every 8 frames.
- **Transitions are hard cuts.** There are no cross-dissolves, fades or blurs between scenes.
- **One easing only for travel:** expo-out `bezier(0.16, 1, 0.3, 1)` over 4–6 frames (`snap()`). Camera moves (C, E) use cubic in-out.
- **Stretch type re-deals on every beat.** Row heights and letter widths get new random weights and snap in about 6 frames. Outgoing rows collapse at the top, and incoming rows grow from the bottom.
- **Selection highlight** (ref A) is used once per scene, on the key word only.
- **Minimum hold for any readable card is 45 frames.**

## 6. Determinism

- **Never use `Math.random()`.** Every value comes from `rng.ts` (`rand`, `ihash`, `noise3`) and is a pure function of seed, frame and index.
- **Same seed gives the same video.** Seeds are the system's version numbers. When a variant is good, write its seed down.
- **Generative recipes** (`templates/Generative.tsx`) deal field × composition × text × accent from the seed. Every recipe is built from the rules above, so any seed is on-brand.

## 7. Don'ts

- No photos, gradients, glass, 3D render looks, rounded cards or icons.
- No overlapping generative fields. Multiple fields only side by side, in hard-edged panels (split, triptych).
- No accent colour on generative textures. The only exception is the workshop tile icon, which takes the workshop's accent.
- No text smaller than `label` in 9:16 except `// comments`.
