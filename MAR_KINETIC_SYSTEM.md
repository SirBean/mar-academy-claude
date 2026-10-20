# MAR Kinetic System

Production system for MAR Academy motion graphics.
It generates new pieces from scratch: content + duration + seed in, finished MP4 (picture + sound) out.
The seed does not pick between fixed timelines: it composes a new sequence of shots from the grammar below, so every seed is a different film that obeys the same rules.
Reference engine: `marsys.py` (same folder). Every number below is the number the engine uses.

---

## 0. Identity in one line

**White narrow type, black ground, text as structure. Motion is typing, never animating.**

What makes it MAR and nobody else:
1. **One face, one ink.** Arial Narrow, always white, on pure black. No color, no gradient, no opacity, no image.
2. **Fit-to-measure stacks.** Display lines are scaled so each one fills the measure exactly. Narrow caps stacked edge to edge become architecture.
3. **The hairline.** One white hairline weight does every structural job: header rule, divider, selection frame.
4. **Macro from micro.** Large forms are built out of small words, never drawn as shapes.
5. **Visible system.** Counters, timecode, scene names and measurements sit in the corners. The piece shows how it is built.

---

## 1. Sources and what was taken from each

| Source | Taken | Explicitly NOT taken |
|---|---|---|
| OpenAI DevDay 2025 intro (video, 53 s, 19 hard cuts) | **Text motion rules** (section 3) and the **general logic** behind its shots (section 4 recipes, section 5 grammar): typewriter rhythm, backspace, fixed layout, container-first brackets, slot substitution, selection jumps, collapse to one token, scan, staircase and scattered clusters, tabulated lines, character fields that resolve, progress counters, repeated-word bands, macro-from-micro, hard cuts, pivot field, accelerating rhythm. **Sound behavior** (section 6): what triggers a sound and its weight, measured from the audio | Colors, depth palette, syntax highlighting, code vocabulary (`import`, `const`), ASCII characters, mascots, proportional sans, selection fills, the music track, the actual audio samples (all sounds are synthesized) | Colors, depth palette, syntax highlighting, code vocabulary (`import`, `const`), ASCII characters, mascots, proportional sans, selection fills |
| cosmos.so/mattiagntt/mar-academy | **Pending.** The board is not readable without a browser session. Add rules in section 8 | |
| MAR brief (from Mattia) | Arial Narrow, always white | |

Rule for future references: each reference contributes **only the rules Mattia names as liked**, written as a numbered rule with a value. Aesthetics are never imported wholesale.

---

## 2. Visual identity

### 2.1 Typeface
- **Arial Narrow** Regular and Bold. Nothing else.
- Engine fallback: Liberation Sans Narrow (metrically identical to Arial Narrow). Drop `ArialNarrow.ttf` and `ArialNarrow-Bold.ttf` into `fonts/` and the engine uses them automatically.
- Display and titles: **Bold, uppercase**. Body, index, meta: **Regular, uppercase** (meta may be Bold for the brand mark only).
- No italics. No letter-spacing changes. No outlines. No faux condensing or stretching.

### 2.2 Color
| Token | Value | Use |
|---|---|---|
| `INK` | `#FFFFFF` | all type, all hairlines, the pivot field |
| `GROUND` | `#000000` | background, always |

- Type is **always white**. Never place type on white.
- Hierarchy comes only from **size, weight and position**.

### 2.3 Grid
- Unit **U = min(W, H) / 135** (8 px at 1080).
- Margin **6U** on all four sides.
- **8 columns** across the measure (`measure = W - 2 x 6U`).
- Main content starts at **6U + 22U** from the top. The band above it belongs to the meta layer.
- Staircase indent: **+1 column per level**.

### 2.4 Scale
| Tier | Size | Weight | Use |
|---|---|---|---|
| `MICRO` | 3U (24 px) | Regular / Bold | meta layer, macro cells, measurements (0.8 x MICRO) |
| `TEXT` | 6U (48 px) | Regular | index lines, staircase lists |
| `TITLE` | 12U (96 px) | Bold | headings, slot label, index numbers over monuments |
| `DISPLAY` | fit to measure | Bold | every big line: ink width = measure exactly |
| `CROP` | 1.4 x DISPLAY | Bold | monument variant, bleeds off the right edge |

- No in-between sizes.
- `DISPLAY` is computed per line: each line in a stack gets its own size. Unequal sizes are the point.
- Display leading: cap height + **1.6U**. Stack lines almost touch.
- Text leading: cap height + **2.2U to 2.4U**.

### 2.5 Hairline
- Weight **U/4** (2 px at 1080), white.
- Header rule: full measure, **2U** below the meta baseline.
- Divider under a lockup: full measure, **8U** below the last title line.

### 2.6 Composition
1. Flush left. Nothing is centered horizontally. Display lines start exactly on the left margin (ink edge, not advance width).
2. One focal element per scene.
3. At least **55% empty ground** in any shot except `macro / micro`, `pattern`, `matrix`, `stack` and `burst`.
4. Display is either at the **top content line**, the **vertical center**, or anchored to the **bottom margin**. No other positions.

---

## 3. Motion grammar (extracted from the OpenAI reference, motion only)

All timings at 30 fps. Easing: **none**. Things appear, get typed, or get cut.

### 3.1 Typewriter
- Reveal left to right, line by line. **No cursor.**
- Interval per character: **1.25 f x U(0.5, 1.6)**, seeded.
- After a space: **+3 to 6 f**. After a line: **+6 to 10 f**.
- **3.1b Burst typing** for DISPLAY sizes: **0.5 to 1.5 characters per frame**.
- **3.1c Compression:** if the text cannot finish inside its window, the whole rhythm (characters and pauses) is scaled down proportionally. Default window: 70% of the scene.

### 3.2 Fixed layout
- The final layout is computed first. A character never moves after it appears. No reflow, no re-centering while typing.

### 3.3 Slot substitution
- One fixed label + one slot.
- The slot is retyped through a list of values: **step = max(6 f, scene / (values + 1))**.
- It always **returns to the first value**, and the return gets a selection frame.

### 3.4 Selection jump
- Selection = **hairline frame** around the target, padded **1U**, with **measurement numbers in MICRO** (width top-left, height bottom-right).
- On and off by cut, in **1 frame**. Hold **9 f**.
- Selection moves between targets by **cut, never by sliding**.

### 3.5 Scan
- List of DISPLAY lines (all at the size of the longest). The selection steps one row every **step = (scene - 2 x rows - 2) / rows**, minimum 6 f.
- After the last row, rows are **cut out from the top, one every 2 f**.

### 3.6 Staircase entry
- Indexed lines (`01  WORD`) enter in typing order, each indented **+1 column**.

### 3.7 Construction reveal
- Measurements and frames are shown, never animated. They appear on selection only (see 3.4).

### 3.8 Index numbers
- Two digits, zero-padded: `01`, `02`, `03`. Used as list markers, monument labels, burst frames.

### 3.9 Macro from micro
- A giant initial (first letter of the title) is rasterized onto a grid of MICRO cells.
- Each covered cell receives the first word of the title in MICRO Bold.
- Cells fill in reading order with **accelerating rate: progress = t^1.6**.
- The full title types underneath at the end.

### 3.10 Burst (climax)
- Hard cuts every **9 to 12 f** (seeded).
- Even cuts: giant index number. Odd cuts: giant word. Both at DISPLAY, vertically centered.

### 3.11 Pivot
- **3 frames** of full white ground, **no type**. It closes the first third of the piece (5.1.8).

### 3.12 Cuts
- Every scene change is a hard cut. No fades, wipes, slides, scales, blurs, or motion blur.

### 3.13 Endings (shared by every token recipe)
After the text is typed, each shot ends one of four ways (seeded):
| Ending | Rule |
|---|---|
| `hold` | text stays; one selection jump on a token, 6 f after typing ends, held 9 f |
| `delete` | backspace: characters leave in reverse typing order, **0.5 f per char**, compressed to at most 30% of the shot |
| `collapse` | everything except one token is deleted (reverse order), then the survivor gets a selection frame for the last **9 f** |
| `walk` | the selection jumps token to token by cut, **step = max(9 f, rest / tokens)** |

### 3.14 Container first
- Brackets `[ ]` are printed **empty, at their final positions**, on the first frame of the shot. Content is typed inside. The container never moves (3.2), so the slot is sized to its longest value.

### 3.15 Field resolve
- A grid of MICRO/TEXT cells flips noise (`0 1 2 3 . : +`, re-drawn every **3 f**, 35% of cells lit) and **locks one letter at a time** into a word on one row. Lock times are spread over 25% to 75% of the shot (progress^0.7). In the last **12 f** the noise clears and the word is selected.

### 3.16 Progress
- Counter `00` to `99` then `OK`, and a row of hairline cells (5, 8 or 10) that fill white. Progress = t^1.6. No type sits on a filled cell.

---

## 4. Components and recipes

A **recipe** is a layout + a motion behavior. Each one draws its own choices from the seed (anchor, size tier, which words, ending), so the same recipe never comes out the same twice.

| Recipe | Layout | Behavior | Scale | Min length |
|---|---|---|---|---|
| `type / stair` | optional title in TITLE + lines in TEXT or TITLE, +1 column per line, index on/off | typewriter + ending (3.13) | small | 40 f |
| `stack` | 2 to 4 keywords, each fit to measure; anchored top, center or bottom | burst typing + ending | large | 24 f |
| `spread` | title words + 1 to 3 keywords on column lines with open gaps, wraps to new rows; TITLE or TEXT; row gap 2.4U, 8U or 16U | typewriter + ending | small | 36 f |
| `scatter` | 2 to 4 clusters of TEXT lines, each a half-column micro stair, at free cells of the grid, optional `01` label | typewriter + ending | small | 45 f |
| `bracket` | `HEAD [SLOT]` on one line, fit to measure or TITLE | container first (3.14), slot retypes through the keywords (3.3) with a selection on every change; hold or collapse | small | 50 f |
| `macro / micro` | a giant glyph (title initial, keyword initial or index digit) built from a micro word of max 5 chars | fill t^1.6 in reading or random order (3.9) | small | 50 f |
| `slot` | label (`MAR /`, `TITLE /` or the live index `03 /`) over a DISPLAY slot | slot substitution (3.3) | large | 24 f |
| `monument` | one keyword at DISPLAY or CROP, at 30, 50, 62 or 80% height, index above | burst 0.6 chars/f | large | 20 f |
| `scan` | all keywords at one DISPLAY size, from the top or from the bottom | scan (3.5) | large | 30 f |
| `matrix` | bracketed rows of cells, counters `000` above | field resolve (3.15) | small | 45 f |
| `loading` | keyword in TITLE, counter on column 6, row of cells | progress (3.16) | small | 30 f |
| `pattern` | full-frame bands of two alternating words repeated across the measure, MICRO or TEXT | rows cut in one every 2 f (in order or shuffled), one cell selected in the last 12 f | small | 24 f |
| `burst` | see 3.10, position per cut: center, top or bottom | hard cuts 9 to 12 f | large | 27 f |
| `lockup` | 4.1 | | large | 36 f |

**Fit-to-measure needs 4+ characters.** Words shorter than 4 characters (e.g. `AI`) are never fit to the measure in `stack` or `monument`: they would turn into solid blocks. They still appear everywhere else (lists, slots, brackets, burst).

### 4.1 Lockup (closing)
- Title split into one word per line, each line **fit to measure**, Bold.
- Variant A, B, C by seed (1/3 each). Variant C: `[TITLE]` fit to measure on the vertical center, typed inside its brackets (3.14), hairline divider 8U below, index as a stair under it.
- Variant A: title at the top content line, index at the bottom. Variant B: title anchored to the bottom margin, index at the top.
- Hairline divider under the title.
- Index list (`01 WORD`) in TEXT, stair-indented, typed in the first 50% of the scene.
- Last **12 f**: selection frame on line 1 (padded 1.5U).
- **Height fit:** if the fit-to-measure stack is taller than the room left by the index, the whole stack is scaled down by one common factor until it fits. Room: variant A, from the top content line to **14U** above the first index line (8U divider + 6U clear). Variant B, from **6U** below the divider to the bottom anchor. Lines keep their relative sizes and stay flush left; only here may a display line be narrower than the measure. Happens with short titles in short formats (e.g. `MAR OPEN CALL` at 4:5).

### 4.2 Monument
- One keyword at DISPLAY (centered vertically) or CROP (bleeding right, at 62% height). 50/50 by seed.
- Its index number sits above in TITLE Regular.
- Typed in bursts (0.6 chars per frame).

### 4.3 Slot
- `FIRSTWORD /` in TITLE Bold above a DISPLAY slot sized to the longest keyword.

### 4.4 Selection frame
- See 3.4. The only "highlight" in the system. Never a filled box, because type is never on white.

### 4.5 Meta layer
Always on (except during the pivot), MICRO, white:
| Corner | Content |
|---|---|
| top-left | `MAR ACADEMY` (Bold) |
| top-right | scene counter `(02/05)` |
| bottom-left | `SYSTEM / {SCENE NAME}` |
| bottom-right | timecode `00:00:SS:FF` |
- Header hairline under the top row.

---

## 5. Structure and generation

### 5.1 Grammar (replaces fixed acts)
A piece of N frames is a sequence of shots, built like this:
1. **Lockup** takes **16 to 22%** of N (min 36 f) at the end.
2. **Burst** before the lockup with probability **0.75** (only if N ≥ 120 f), length **30 to 48 f**.
3. The rest is the **body**: k = body / U(55, 80) shots, k between 2 and 12.
4. Body shot lengths shrink: each one is **r = U(0.72, 0.9)** times the previous (5.2).
5. Shot 1 is an **opener**: `type / stair`, `spread`, `scatter`, `bracket`, `macro / micro`, `matrix` or `loading` (small, typed).
6. Each next shot: any recipe whose min length fits, **not the same as the previous**, **used once per piece** (twice if k > 9), and **of the other scale** (small ↔ large) 75% of the time.
7. If no unused recipe fits a short shot, the previous shot holds longer instead.
8. **Pivot** (3 white frames, 3.11) after shot round(k x U(0.25, 0.5)).

### 5.2 Rhythm
- Durations always shrink toward the end, then the lockup holds long.
- Hold lengths go: long (opener) → shorter (body) → 9-12 f (burst) → long (lockup).

### 5.3 Determinism
- Seeded PRNG only. Same content + seed + duration + format gives identical frames and identical sound.
- Every shot gets its own child PRNG, so a new seed changes the sequence, the recipes and every choice inside them. It never breaks a rule.

### 5.4 Formats
`9:16` 1080x1920 (default), `4:5` 1080x1350, `1:1` 1080x1080, `16:9` 1920x1080. U adapts, all rules hold. Any block taller than its room shrinks by one common factor (height fit, 4.1).

### 5.5 Usage
```
python3 marsys.py --title "MAR CREATIVE ACADEMY" \
  --words INNOVATION TECHNOLOGY DESIGN \
  --seconds 15 --seed 5 --format 9:16 --out mar.mp4      # add --mute for picture only

# stills only (for posters / checking)
python3 marsys.py --seed 5 --stills 20,60,148 --out check.png
```
Render: Pillow at 2x supersampling, piped to ffmpeg (H.264, yuv420p, CRF 14). Sound: 48 kHz, AAC 192k.

---

## 6. Sound (behavior measured from the OpenAI reference, sounds synthesized)

Measured in the reference: ticks while text is typed (median gap **4 f**, ~70% of the energy at **120-500 Hz**, muted, not bright), the first ~12 s quiet, then **+15 to 20 dB** louder; hits land on hard cuts **within 2 f**. The music track is not taken.

Sound is **derived from the frames, never authored**: the engine records each frame's drawn characters, selections and cuts, and the soundtrack follows.
| # | Event | Sound | Level |
|---|---|---|---|
| 6.1 | a frame adds characters (typing, filled progress cells, field flips) | key tick: 25 ms, sine body + 2 ms noise transient, **max one every 2 f**, pitch jitter ±8% | -20 dBFS |
| 6.2 | tick pitch by scale | **330 Hz** for small-scale shots, **190 Hz** for large-scale shots | |
| 6.3 | a frame removes characters (delete, collapse) | same tick at **0.75x** pitch | -22 dBFS |
| 6.4 | a selection frame appears | 40 ms sine at **1.2 kHz** | -24 dBFS |
| 6.5 | hard cut (new shot, burst cut) | thump: sine sweeping 110 → 45 Hz, 160 ms + 3 ms click | -9 dBFS |
| 6.6 | pivot | long thump (350 ms) + low noise burst | -4 dBFS |
| 6.7 | dynamics | everything before the first pivot sits **8 dB lower** | |
| 6.8 | timing | each sound starts at its frame + seeded offset of 0 to 1/2 frame | |
| 6.9 | master | peak limited to -1 dBFS | |

---

## 7. QA checklist

- [ ] Only Arial Narrow (or the metric fallback). Only Regular and Bold.
- [ ] Every pixel of type is `#FFFFFF`. Ground is `#000000`. No other values.
- [ ] No type ever sits on white.
- [ ] Every display line's ink width equals the measure (or 1.4x for CROP), except a Lockup stack shrunk by the height fit (4.1).
- [ ] Lockup title never overlaps the index or the divider.
- [ ] Everything starts on the left margin or on a column line.
- [ ] No easing, fades, slides or scaling. Only typing, cuts, and on/off.
- [ ] Typed characters never move.
- [ ] Selection is a hairline frame with measurements, never a fill.
- [ ] Pivot is exactly 3 white frames with no type.
- [ ] Burst cuts are 9-12 f.
- [ ] Meta layer present in every non-pivot frame.
- [ ] No recipe repeats inside one piece (except k > 9). Consecutive shots differ.
- [ ] No word under 4 characters is fit to measure.
- [ ] Brackets are on screen before their content and never move.
- [ ] Every sound is caused by a visible event (6). No music.
- [ ] Different seeds give different shot sequences (check with `--stills`).

---

## 8. Rules from cosmos.so/mattiagntt/mar-academy (to add)

Not extracted yet: the board needs a browser session or exported images.
For each image Mattia likes, add one row and the engine change it implies:

| # | Reference | Rule liked | Value | Affects |
|---|---|---|---|---|
| C1 | | | | |
| C2 | | | | |

A rule only enters the system when it is written with a value. A rule that conflicts with section 0 or 2.2 needs Mattia's explicit decision before it overrides it.
