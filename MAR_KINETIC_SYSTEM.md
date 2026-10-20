# MAR Kinetic System

Production system for MAR Academy motion graphics.
It generates new pieces from scratch: content + duration + seed in, finished MP4 out.
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
| OpenAI DevDay 2025 intro (video) | **Text motion rules only** (section 3): typewriter rhythm, fixed layout, slot substitution, selection jumps, scan, staircase entry, construction reveal, hard cuts, pivot frame, accelerating rhythm, macro-from-micro | Colors, depth palette, syntax highlighting, code vocabulary (`import`, `const`), ASCII characters, mascots, proportional sans, selection fills |
| cosmos.so/mattiagntt/mar-academy | **Pending.** The board is not readable without a browser session. Add rules in section 7 | |
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
3. At least **55% empty ground** in any scene except Macro and Burst.
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
- **3 frames** of full white ground, **no type**. It marks the end of Act 1.

### 3.12 Cuts
- Every scene change is a hard cut. No fades, wipes, slides, scales, blurs, or motion blur.

---

## 4. Components

### 4.1 Lockup (closing)
- Title split into one word per line, each line **fit to measure**, Bold.
- Variant A: title at the top content line, index at the bottom. Variant B: title anchored to the bottom margin, index at the top.
- Hairline divider under the title.
- Index list (`01 WORD`) in TEXT, stair-indented, typed in the first 50% of the scene.
- Last **12 f**: selection frame on line 1 (padded 1.5U).

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

### 5.1 Acts (ratio of total duration N frames)
| Act | Window | Scene pool (seed picks) |
|---|---|---|
| 1 BUILD | 0 to 30% | `TypeStair` or `Macro` |
| PIVOT | 3 f | white field |
| 2 STATEMENT | to 72% | 2 of `Slot`, `Monument`, `Scan`, random order |
| 3 BURST | to 84% | `Burst` |
| CLOSE | to 100% | `Lockup` |

### 5.2 Rhythm
- Statement scene 1 takes **56%** of Act 2, scene 2 takes 44%. Durations always shrink toward the end.
- Hold lengths go: long (Act 1) → medium (Act 2) → 9-12 f (Burst) → long (Lockup).

### 5.3 Determinism
- Seeded PRNG only. Same content + seed + duration + format gives identical frames.
- A new seed gives a new valid composition. It never breaks a rule.

### 5.4 Formats
`9:16` 1080x1920 (default), `4:5` 1080x1350, `1:1` 1080x1080, `16:9` 1920x1080. U adapts, all rules hold.

### 5.5 Usage
```
python3 marsys.py --title "MAR CREATIVE ACADEMY" \
  --words INNOVATION TECHNOLOGY DESIGN \
  --seconds 5 --seed 5 --format 9:16 --out mar.mp4

# stills only (for posters / checking)
python3 marsys.py --seed 5 --stills 20,60,148 --out check.png
```
Render: Pillow at 2x supersampling, piped to ffmpeg (H.264, yuv420p, CRF 14).

---

## 6. QA checklist

- [ ] Only Arial Narrow (or the metric fallback). Only Regular and Bold.
- [ ] Every pixel of type is `#FFFFFF`. Ground is `#000000`. No other values.
- [ ] No type ever sits on white.
- [ ] Every display line's ink width equals the measure (or 1.4x for CROP).
- [ ] Everything starts on the left margin or on a column line.
- [ ] No easing, fades, slides or scaling. Only typing, cuts, and on/off.
- [ ] Typed characters never move.
- [ ] Selection is a hairline frame with measurements, never a fill.
- [ ] Pivot is exactly 3 white frames with no type.
- [ ] Burst cuts are 9-12 f.
- [ ] Meta layer present in every non-pivot frame.

---

## 7. Rules from cosmos.so/mattiagntt/mar-academy (to add)

Not extracted yet: the board needs a browser session or exported images.
For each image Mattia likes, add one row and the engine change it implies:

| # | Reference | Rule liked | Value | Affects |
|---|---|---|---|---|
| C1 | | | | |
| C2 | | | | |

A rule only enters the system when it is written with a value. A rule that conflicts with section 0 or 2.2 needs Mattia's explicit decision before it overrides it.
