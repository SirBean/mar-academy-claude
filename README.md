# MAR Creative Academy 2026: motion production system

This repo generates on-brand motion graphics and stills for the MAR Creative
Academy (MAR, Museo d'Arte della città di Ravenna). Everything is code, built
with [Remotion](https://remotion.dev) (React → MP4). The visual rules are in
**[STYLE.md](STYLE.md)**, and every template and every seed obeys them.

```
content/edition-2026.json   ← edit the words here (names, dates, workshops)
content/kit-2026.json       ← the list of deliverables to batch render
src/system/tokens.ts        ← colours, type, grid, timing: the only place values live
src/modules/                ← generative building blocks (one per reference)
src/templates/              ← finished compositions, × 4 formats each
scripts/render.ts           ← CLI for single renders, seed sweeps, kits
```

## Setup

```bash
npm install
npm run studio          # live preview + props editor at localhost:3000
```

## Render

```bash
# one video
npm run render -- --template Boot --format story

# every format of a template
npm run render -- --template OpenCall --format all

# seed sweep: 12 new generative variants, as stills to pick from
npm run render -- --template Generative --format story --seeds 1-12 --still

# then render the ones you like as video
npm run render -- --template Generative --format story --seeds 4,9

# one card per workshop (index into content/edition-2026.json)
npm run render -- --template Workshop --format story --workshop 2

# full launch kit
npm run kit
```

Options are `--template` (name, comma list or `all`), `--format`
(`story` 9:16, `post` 4:5, `square`, `wide` 16:9, or `all`), and `--seed` or
`--seeds 1-12`. You can also pass `--still` with an optional `--frame N`,
`--accent blue|green|orange`, `--ground night|paper` and `--out dir`.
Files go to `out/` with reproducible names (`Boot-story-s1.mp4`).

## Templates

| Template | Ref | Length | What it does |
|----------|-----|--------|--------------|
| `Identity` | all | 12 s | **Hero film.** Hand × machine: the mark is hatched by hand, sampled into tesserae by a moving seam, compiled to 0/1, argued in stretch type, then locks up split at x=0.50 |
| `Boot` | A | 8 s | Identity written as code, `academy.boot()`, staircase intro, bracket title end card |
| `OpenCall` | B | 8 s | Statement words stretched to fill the frame, re-dealt on every beat, info card |
| `Signal` | C | 5 s | Letterform made of 0/1 glyphs with RGB split, camera push |
| `Mosaic` | D | 6 s | Triptych: glyph scatter, wave lines and tessera field |
| `Terrain` | E | 7 s | 1-bit dithered landscape that rises, dives and disintegrates (paper ground) |
| `Workshop` | A | 5 s | `import community ▦ #54CA31 (1/4)`, one card per workshop |
| `Generative` | all | 5 s | **Infinite variants.** The seed deals field × layout × text × accent |

## Making new graphics

1. **New words:** edit `content/edition-2026.json` and re-render. Layouts adapt.
2. **New variants:** sweep seeds on `Generative` (or any template) and keep the numbers you like.
3. **New template:** compose existing modules in `src/templates/`, register it in `src/Root.tsx` and add it to `TEMPLATES` in `scripts/render.ts`. Read STYLE.md first.
4. **New module:** it must be a pure function of (props, frame), drawn on the cell grid, with randomness from `src/system/rng.ts`.

## Headless rendering

Remotion downloads its own Chrome headless shell on first render. On locked
down machines, point `REMOTION_BROWSER` at any Chromium binary:
`REMOTION_BROWSER=/path/to/chromium npm run kit`.

## Licence note

Remotion is free for individuals and companies of up to 3 people. If the
client (MAR / Comune di Ravenna) owns or operates this project, or an agency
of 4+ people works on it, a Remotion Company License is needed. See
[remotion.dev/docs/license/faq](https://www.remotion.dev/docs/license/faq).
Fonts (Geist, Archivo) are SIL Open Font License.
