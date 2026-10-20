"""MAR Kinetic System - generative rule engine (v2).

Generates new motion graphics from scratch out of content + duration + seed.
Every value here is a rule from MAR_KINETIC_SYSTEM.md (section numbers in comments).

    python3 marsys.py --title "MAR CREATIVE ACADEMY" --words INNOVATION TECHNOLOGY DESIGN \
        --seconds 5 --seed 3 --format 9:16 --out mar_s3.mp4

The seed does not pick from a fixed timeline: it composes a new sequence of shots out of the
grammar in section 5 (recipe x anchor x scale x ending), so different seeds give different films.
Same seed + same content = identical frames and identical sound.
"""
import argparse, functools, math, os, random, subprocess, tempfile, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
# 2.1 Typeface: Arial Narrow. Fallback: Liberation Sans Narrow (identical metrics).
FONT_REG = next(p for p in [os.path.join(HERE, "fonts", "ArialNarrow.ttf"),
                            os.path.join(HERE, "fonts", "LiberationSansNarrow-Regular.ttf")] if os.path.exists(p))
FONT_BOLD = next(p for p in [os.path.join(HERE, "fonts", "ArialNarrow-Bold.ttf"),
                             os.path.join(HERE, "fonts", "LiberationSansNarrow-Bold.ttf")] if os.path.exists(p))

# 2.2 Color: one ink, one ground. Nothing else, ever.
INK, GROUND = (255, 255, 255), (0, 0, 0)

FORMATS = {"9:16": (1080, 1920), "4:5": (1080, 1350), "1:1": (1080, 1080), "16:9": (1920, 1080)}
FPS, SS = 30, 2


class Frame:
    """2.3 Grid: unit U = min(W,H)/135 (8 px at 1080). Margin 6U. 8 columns."""
    def __init__(self, fmt):
        self.W, self.H = FORMATS[fmt]
        self.w, self.h = self.W * SS, self.H * SS
        self.U = min(self.w, self.h) / 135
        self.M = 6 * self.U
        self.col = (self.w - 2 * self.M) / 8
        self.measure = self.w - 2 * self.M
        # 2.4 Scale: four fixed tiers in U + fit-to-measure display.
        self.MICRO, self.TEXT, self.TITLE = 3 * self.U, 6 * self.U, 12 * self.U
        self.HAIR = max(1, round(self.U / 4))  # hairline = 2 px at 1080
        self.top = self.M + 22 * self.U        # 2.3 main content starts here
        self.bottom = self.h - self.M - 10 * self.U


class Ctx:
    """Per-frame record of what was drawn. Section 6 (Sound) is computed from it."""
    def __init__(self): self.chars, self.sel, self.flips, self.cut = 0, 0, 0, False

CTX = Ctx()


@functools.lru_cache(None)
def F(px, bold=False): return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, max(1, int(round(px))))

def ink_box(s, size, bold=False): return F(size, bold).getbbox(s, anchor="ls")
def tw(s, size, bold=False): l, _, r, _ = ink_box(s, size, bold); return r - l
@functools.lru_cache(None)
def capH(size, bold=False): return -F(size, bold).getbbox("H", anchor="ls")[1]
def fit(s, width, bold=True): return 600 * width / tw(s, 600, bold)

MIN_FIT = 4  # 2.4 only words of 4+ characters go fit-to-measure; shorter ones would turn into blocks
def fittable(words): return [w for w in words if len(w.replace(" ", "")) >= MIN_FIT] or words

def text(d, s, size, x, y, bold=False):
    """Left edge of INK (not advance) sits on x, baseline on y. Always white (2.2)."""
    if not s or not s.strip(): return
    CTX.chars += sum(1 for c in s if c != " ")
    l = ink_box(s, size, bold)[0]
    d.text((x - l, y), s, font=F(size, bold), fill=INK, anchor="ls")

def keyline(d, fr, box, label=True):
    """3.4 Selection = hairline frame + measurement numbers. Never a fill."""
    CTX.sel += 1
    x0, y0, x1, y1 = box; t = fr.HAIR
    for r in [(x0, y0, x1, y0 + t), (x0, y1 - t, x1, y1), (x0, y0, x0 + t, y1), (x1 - t, y0, x1, y1)]:
        d.rectangle([int(v) for v in r], fill=INK)
    if label:
        n0 = f"{int((x1 - x0) / SS)}"; n1 = f"{int((y1 - y0) / SS)}"
        c = CTX.chars
        text(d, n0, fr.MICRO * 0.8, x0, y0 - fr.U, False)
        text(d, n1, fr.MICRO * 0.8, x1 + fr.U, y1, False)
        CTX.chars = c  # measurements are construction, not typing

def word_box(fr, s, size, x, y, bold, pad=None):
    pad = fr.U if pad is None else pad
    return (x - pad, y - capH(size, bold) - pad, x + tw(s, size, bold) + pad, y + pad)

def hline(d, fr, y):
    d.rectangle([int(fr.M), int(y), int(fr.w - fr.M), int(y + fr.HAIR)], fill=INK)


# ---------- 3. Motion grammar ----------
def type_schedule(strings, start, rng, base=1.25, within=None):
    """3.1 Typewriter: 1.25 f/char x U(0.5,1.6), +3..6 f at word ends, +6..10 f at line ends.
    3.1c Compression: if the text cannot finish inside `within` frames, the whole rhythm is
    scaled down proportionally (pauses keep their ratio to characters)."""
    t, out = float(start), []
    for s in strings:
        fr_ = []
        for ch in s:
            t += base * rng.uniform(0.5, 1.6); fr_.append(t)
            if ch == " ": t += rng.randint(3, 6)
        out.append(fr_); t += rng.randint(6, 10)
    if within and t - start > within:
        k = within / (t - start)
        out = [[start + (x - start) * k for x in fr_] for fr_ in out]; t = start + within
    return out, t

def burst_schedule(strings, start, cpf=1.0, gap=4):
    """3.1b Burst typing for large type: cpf chars per frame, gap frames between tokens."""
    t, out = float(start), []
    for s in strings:
        out.append([t + i / cpf for i in range(len(s))]); t += len(s) / cpf + gap
    return out, t

def shown(s, sched, f): return s[:sum(1 for x in sched if x <= f)]

def fast(s, f, start, cpf=0.5):
    return s[:max(0, int((f - start) * cpf) + 1)] if f >= start else ""


class Tok:
    def __init__(self, s, size, x, y, bold=True, keep=False):
        self.s, self.size, self.x, self.y, self.bold, self.keep = s, size, x, y, bold, keep
    def box(self, fr, pad=None): return word_box(fr, self.s, self.size, self.x, self.y, self.bold, pad)


def place(fr, toks, anchor):
    """2.6.4 Block positions: top content line, vertical center, or bottom margin.
    Token y are baselines relative to a block whose first cap top is 0."""
    top = min(t.y - capH(t.size, t.bold) for t in toks); bot = max(t.y for t in toks); hb = bot - top
    y0 = {"top": fr.top, "center": (fr.h - hb) / 2, "bottom": fr.bottom - hb}[anchor] - top
    for t in toks: t.y += y0
    return toks


def fit_height(fr, toks, room):
    """4.1 Height fit, generalized: a block taller than its room shrinks by one common factor."""
    top = min(t.y - capH(t.size, t.bold) for t in toks); hb = max(t.y for t in toks) - top
    if hb <= room: return toks
    k = room / hb
    for t in toks: t.size *= k; t.x = fr.M + (t.x - fr.M) * k; t.y = top + (t.y - top) * k
    return toks


class Scene:
    name, scale, min_dur = "scene", "small", 20
    def __init__(self, fr, start, dur, rng, content):
        self.fr, self.a, self.dur, self.rng, self.c = fr, start, dur, rng, content
    @property
    def end(self): return self.a + self.dur
    def draw(self, d, f): pass


class TokenScene(Scene):
    """Tokens are laid out first (3.2), then typed. Endings (3.7) are shared by every token recipe:
    hold | delete (backspace, last typed first) | collapse (all but one token deleted, survivor selected)
    | walk (selection jumps token to token by cut)."""
    endings = ("hold", "delete", "collapse", "walk")
    burst = False
    def setup(self):
        rng = self.rng
        self.toks = self.layout()
        strings = [t.s for t in self.toks]
        if self.burst: self.sched, done = burst_schedule(strings, self.a + 2, cpf=rng.choice([0.6, 1.0, 1.5]))
        else: self.sched, done = type_schedule(strings, self.a + 2, rng, within=self.dur * 0.6)
        self.typed_end = min(done, self.a + self.dur * 0.75)
        self.ending = rng.choice(self.endings)
        n = sum(len(s) for s in strings)
        # 3.7 Delete runs at 0.5 f/char, compressed to fit 30% of the scene.
        self.del_len = min(n * 0.5, self.dur * 0.3)
        self.del_at = self.end - self.del_len - (10 if self.ending == "collapse" else 2)
        self.survivor = rng.randrange(len(self.toks))
        order = [(k, i) for k in range(len(self.toks)) for i in range(len(strings[k]))]
        if self.ending == "collapse": order = [o for o in order if o[0] != self.survivor]
        self.del_order = order[::-1]

    def visible(self, k, f):
        t = self.toks[k]; n = sum(1 for x in self.sched[k] if x <= f)
        if self.ending in ("delete", "collapse") and f >= self.del_at:
            gone = int((f - self.del_at) / max(1e-6, self.del_len) * len(self.del_order)) + 1
            n -= sum(1 for kk, _ in self.del_order[:gone] if kk == k)
        return t.s[:max(0, n)]

    def draw(self, d, f):
        fr = self.fr
        for k, t in enumerate(self.toks):
            text(d, self.visible(k, f), t.size, t.x, t.y, t.bold)
        self.marks(d, f)
        if self.ending == "walk" and f >= self.typed_end + 4:
            step = max(9, int((self.end - self.typed_end - 4) / max(1, len(self.toks))))
            k = int((f - self.typed_end - 4) // step) % len(self.toks)
            keyline(d, fr, self.toks[k].box(fr))
        if self.ending == "collapse" and f >= self.end - 9:
            keyline(d, fr, self.toks[self.survivor].box(fr))
        if self.ending == "hold" and self.typed_end + 6 <= f < self.typed_end + 15:
            keyline(d, fr, self.toks[self.survivor].box(fr))
    def marks(self, d, f): pass


# ---------- 4. Recipes ----------
class TypeStair(TokenScene):
    """3.6 Staircase: optional title line, indexed lines indented +1 column each."""
    name, min_dur = "type / stair", 40
    def layout(self):
        fr, rng = self.fr, self.rng
        size = rng.choice([fr.TEXT, fr.TEXT, fr.TITLE])
        lead = capH(size) + 2.4 * fr.U
        toks, y = [], 0
        if rng.random() < 0.6:
            y = capH(fr.TITLE, True); toks.append(Tok(self.c["title"], fr.TITLE, fr.M, y, True)); y += 4 * fr.U
        idx = rng.random() < 0.7
        for i, w in enumerate(self.c["words"]):
            y += lead
            toks.append(Tok(f"{i + 1:02d}  {w}" if idx else w, size, fr.M + min(i, 7) * fr.col, y, False))
        toks = fit_height(fr, toks, fr.bottom - fr.top)
        for t in toks:  # a stair that runs past the measure stays on the grid but restarts at column 0
            if t.x + tw(t.s, t.size, t.bold) > fr.w - fr.M: t.x = fr.M
        return place(fr, toks, rng.choice(["top", "top", "bottom"]))


class Stack(TokenScene):
    """2.4 DISPLAY stack: each line fit to measure, burst typed."""
    name, scale, min_dur, burst = "stack", "large", 24, True
    def layout(self):
        fr, rng = self.fr, self.rng
        pool = fittable(self.c["words"])[:]
        rng.shuffle(pool); lines = pool[:rng.randint(2, min(4, len(pool)))]
        toks, y = [], 0
        for k, w in enumerate(lines):
            S = fit(w, fr.measure); y += capH(S, True) + (1.6 * fr.U if k else 0)
            toks.append(Tok(w, S, fr.M, y))
        return place(fr, fit_height(fr, toks, fr.bottom - fr.top), rng.choice(["top", "center", "bottom"]))


class Spread(TokenScene):
    """Tabulated line: tokens start on column lines with open gaps between them (TITLE or TEXT).
    Wraps onto a new row when the measure runs out."""
    name, min_dur = "spread", 36
    def layout(self):
        fr, rng = self.fr, self.rng
        words = self.c["title"].split() + rng.sample(self.c["words"], min(len(self.c["words"]), rng.randint(1, 3)))
        size = rng.choice([fr.TITLE, fr.TITLE, fr.TEXT])
        lead = capH(size, True) + rng.choice([2.4, 8, 16]) * fr.U
        toks, col, y = [], 0, capH(size, True)
        for w in words:
            need = math.ceil((tw(w, size, True) + 2 * fr.U) / fr.col)
            if col + need > 8 and col > 0: col, y = rng.randint(0, 2), y + lead
            if need > 8: size_w = fit(w, fr.measure); toks.append(Tok(w, min(size_w, size), fr.M, y)); col = 8; continue
            toks.append(Tok(w, size, fr.M + col * fr.col, y)); col += need + rng.randint(0, 2)
        return place(fr, fit_height(fr, toks, fr.bottom - fr.top), rng.choice(["top", "center", "bottom"]))


class Scatter(TokenScene):
    """Clusters of 2-3 TEXT lines, each a micro staircase, set at free cells of the 8-column grid."""
    name, min_dur = "scatter", 45
    def layout(self):
        fr, rng = self.fr, self.rng
        items = self.c["title"].split() + self.c["words"]
        rng.shuffle(items)
        n = rng.randint(2, 4); clusters = [items[i::n] for i in range(n)]
        lead = capH(fr.TEXT) + 1.2 * fr.U
        toks, used = [], []
        rows = int((fr.bottom - fr.top) // (lead * 4))
        for k, cl in enumerate(clusters):
            for _ in range(40):
                c0, r0 = rng.randint(0, 4), rng.randint(0, max(0, rows - 1))
                x0, y0 = fr.M + c0 * fr.col, fr.top + r0 * lead * 4
                box = (x0, y0, x0 + 4 * fr.col, y0 + lead * (len(cl) + 1))
                if all(box[2] <= b[0] or box[0] >= b[2] or box[3] <= b[1] or box[1] >= b[3] for b in used): break
            else: continue
            used.append(box)
            lines = [f"{k + 1:02d}"] + cl if rng.random() < 0.5 else cl
            for i, s in enumerate(lines):
                x = x0 + (i * fr.col / 2 if rng.random() < 0.8 else 0)
                x = fr.M + round((x - fr.M) / (fr.col / 2)) * (fr.col / 2)
                toks.append(Tok(s, fr.TEXT, x, y0 + capH(fr.TEXT) + i * lead, i == 0))
        return toks


class Bracket(TokenScene):
    """Container first: brackets are printed empty at their final positions, content is typed inside.
    The inner slot then retypes through the keywords (3.3) and returns to the first."""
    name, min_dur, endings = "bracket", 50, ("hold", "collapse")
    def layout(self):
        fr, rng = self.fr, self.rng
        self.head = rng.choice([self.c["title"], self.c["title"].split()[0]])
        longest = max(self.c["words"], key=len)
        line = f"{self.head} [{longest}]"
        S = min(fit(line, fr.measure), fr.TITLE * 1.0 if rng.random() < 0.5 else fit(line, fr.measure))
        x = fr.M; y = 0
        hd = Tok(self.head, S, x, y); x += tw(self.head + " ", S, True)
        ob = Tok("[", S, x, y); x += tw("[", S, True) + 0.25 * fr.U * S / fr.TITLE
        self.slot = Tok(self.c["words"][0], S, x, y); x += tw(longest, S, True) + 0.25 * fr.U * S / fr.TITLE
        cb = Tok("]", S, x, y)
        toks = place(fr, [hd, ob, self.slot, cb], rng.choice(["top", "center", "bottom"]))
        self.slot_k = 2
        return toks
    def setup(self):
        super().setup()
        # brackets are on screen from frame 0 of the scene (3.2: the container never moves)
        self.sched[1] = [self.a]; self.sched[3] = [self.a]
        self.cycle_at = self.typed_end + 4
        vals = self.c["words"] + [self.c["words"][0]]
        span = (self.del_at if self.ending == "collapse" else self.end) - self.cycle_at
        self.step = max(6, int(span / (len(vals) + 1))); self.vals = vals
        if self.ending == "collapse": self.survivor = 2
    def visible(self, k, f):
        if k == self.slot_k and f >= self.cycle_at and not (self.ending == "collapse" and f >= self.del_at):
            i = min(len(self.vals) - 1, int((f - self.cycle_at) // self.step))
            v = fast(self.vals[i], f, self.cycle_at + i * self.step, cpf=1.5)
            self.toks[k].s = self.vals[i]
            return v
        return super().visible(k, f)
    def marks(self, d, f):
        if f >= self.cycle_at and not (self.ending == "collapse" and f >= self.del_at):
            i = int((f - self.cycle_at) // self.step); lf = (f - self.cycle_at) % self.step
            if lf >= self.step - 9 and i < len(self.vals): keyline(d, self.fr, self.toks[self.slot_k].box(self.fr))


class Macro(Scene):
    """3.9 Macro-from-micro: one giant glyph built from micro words, filled with progress = t^1.6."""
    name, min_dur = "macro / micro", 50
    def __init__(self, *a):
        super().__init__(*a)
        fr, rng = self.fr, self.rng
        words = self.c["words"]
        self.glyph = rng.choice([self.c["title"][0], rng.choice(words)[0], str(rng.randint(1, len(words)))])
        self.unit = rng.choice([w for w in self.c["title"].split() + words if len(w) <= 5] or [self.c["title"][:3]])  # micro unit: 5 chars max
        size = fr.MICRO
        cell_w = tw(self.unit + " ", size, True) + fr.U; cell_h = capH(size) + 1.6 * fr.U
        cols, rows = int(fr.measure // cell_w), int((fr.bottom - fr.top - 8 * fr.U) // cell_h)
        mask = Image.new("L", (cols * 10, rows * 10), 0)
        md = ImageDraw.Draw(mask); S = fit(self.glyph, cols * 10, True)
        S = min(S, rows * 10 / 0.75); l = ink_box(self.glyph, S, True)[0]
        md.text((-l, rows * 10 * 0.95), self.glyph, font=F(S, True), fill=255, anchor="ls")
        self.cells = [(c, r) for r in range(rows) for c in range(cols) if mask.getpixel((c * 10 + 5, r * 10 + 5)) > 127]
        self.order = rng.choice(["reading", "random"])
        if self.order == "random": rng.shuffle(self.cells)
        self.cw, self.ch, self.y0 = cell_w, cell_h, fr.top
        self.size = size
        self.sched = type_schedule([self.c["title"]], self.end - 16, rng, base=0.6)[0][0]
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a
        n = int(len(self.cells) * min(1, (lf / max(1, self.dur - 16)) ** 1.6))
        for c, r in self.cells[:n]:
            text(d, self.unit, self.size, fr.M + c * self.cw, self.y0 + (r + 1) * self.ch, True)
        text(d, shown(self.c["title"], self.sched, f), fr.TEXT, fr.M, fr.bottom, True)


class Slot(Scene):
    """3.3 Slot substitution: fixed label + one slot retyped through values, back to the first."""
    name, scale, min_dur = "slot", "large", 24
    def __init__(self, *a):
        super().__init__(*a)
        rng = self.rng
        self.label = rng.choice([self.c["title"].split()[0] + " /", self.c["title"] + " /", "01 /"])
        self.anchor = rng.choice(["top", "center", "bottom"])
        self.vals = self.c["words"][:]; rng.shuffle(self.vals); self.vals.append(self.vals[0])
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a; words = self.vals
        step = max(6, (self.dur - 6) // len(words))
        i = min(len(words) - 1, lf // step); wd = words[i]
        S = fit(max(self.c["words"], key=len), fr.measure, True)  # slot sized to the longest value
        blk = capH(S, True) + 4 * fr.U + capH(fr.TITLE, True)
        y = {"top": fr.top + blk, "center": (fr.h + blk) / 2, "bottom": fr.bottom}[self.anchor]
        lab = self.label if not self.label.startswith("01") else f"{self.c['words'].index(wd) + 1:02d} /"
        text(d, lab, fr.TITLE, fr.M, y - capH(S, True) - 4 * fr.U, True)
        text(d, fast(wd, f, self.a + i * step, cpf=1.5), S, fr.M, y, True)
        if i == len(words) - 1 and lf % step >= 3:
            keyline(d, fr, word_box(fr, wd, S, fr.M, y, True))


class Monument(Scene):
    """4.2 One word at fit-to-measure (or cropped 1.4x off the right edge), burst typed."""
    name, scale, min_dur = "monument", "large", 20
    def __init__(self, *a):
        super().__init__(*a)
        rng = self.rng
        self.word = rng.choice(fittable(self.c["words"] + self.c["title"].split()[:1]))
        self.crop = rng.random() < 0.5; self.anchor = rng.choice([0.3, 0.5, 0.62, 0.8])
    def draw(self, d, f):
        fr = self.fr
        S = fit(self.word, fr.measure, True) * (1.4 if self.crop else 1.0)
        S = min(S, (fr.bottom - fr.top) / 0.75)
        y = min(fr.bottom, max(fr.top + capH(S, True) + 16 * fr.U, fr.h * self.anchor + capH(S, True) / 2))
        text(d, fast(self.word, f, self.a + 2, cpf=0.6), S, fr.M, y, True)
        idx = (self.c["words"].index(self.word) + 1) if self.word in self.c["words"] else 0
        text(d, f"{idx:02d}", fr.TITLE, fr.M, y - capH(S, True) - 4 * fr.U, False)


class Scan(Scene):
    """3.5 Scan: words stacked at one size, keyline steps row to row, rows leave from the top."""
    name, scale, min_dur = "scan", "large", 30
    def __init__(self, *a):
        super().__init__(*a)
        self.anchor = self.rng.choice(["top", "bottom"])
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a; ws = self.c["words"]
        S = min(fit(w_, fr.measure, True) for w_ in ws)  # all rows at the size of the longest
        lead = capH(S, True) * 1.18
        S = min(S, S * (fr.bottom - fr.top) / (lead * len(ws))); lead = capH(S, True) * 1.18
        step = max(6, (self.dur - 2 * len(ws) - 2) // len(ws))
        sel = lf // step
        gone = max(0, (lf - len(ws) * step) // 2 + 1) if lf >= len(ws) * step else 0
        y = fr.top if self.anchor == "top" else fr.bottom - lead * (len(ws) - 1) - capH(S, True)
        for k, w_ in enumerate(ws):
            y += lead if k else capH(S, True)
            if k < gone: continue
            text(d, w_, S, fr.M, y, True)
            if k == sel: keyline(d, fr, word_box(fr, w_, S, fr.M, y, True))


class Matrix(Scene):
    """Character field: a grid of micro cells in bracket rows flips noise and resolves into a word.
    Counters (resolved / total) sit above the field."""
    name, min_dur = "matrix", 45
    def __init__(self, *a):
        super().__init__(*a)
        fr, rng = self.fr, self.rng
        self.word = rng.choice(self.c["words"]).replace(" ", "")
        self.size = rng.choice([fr.TEXT, fr.MICRO * 1.0 if len(self.word) > 9 else fr.TEXT])
        self.cols = max(len(self.word) + 2, rng.randint(8, 12))
        self.pitch = min(tw("W", self.size, True) * 1.6, (fr.measure - 2 * fr.col) / self.cols)
        self.rows = rng.randint(5, 9); self.lead = capH(self.size) + 2.4 * fr.U
        self.row = rng.randrange(1, self.rows - 1); self.c0 = rng.randint(0, self.cols - len(self.word))
        self.lock = {(self.row, self.c0 + i): ch for i, ch in enumerate(self.word)}
        keys = list(self.lock); rng.shuffle(keys)
        self.lock_at = {k: self.a + self.dur * (0.25 + 0.5 * (i / len(keys)) ** 0.7) for i, k in enumerate(keys)}
        self.noise = "0123.:+".strip()
        self.anchor = rng.choice(["top", "center"])
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a
        hb = self.rows * self.lead
        y0 = fr.top + 6 * fr.U if self.anchor == "top" else (fr.h - hb) / 2
        x0 = fr.M + fr.col
        locked = sum(1 for k in self.lock if f >= self.lock_at[k])
        text(d, f"{locked:03d}", fr.MICRO, fr.M, y0 - 2 * fr.U, False)
        text(d, f"{len(self.lock):03d}", fr.MICRO, fr.w - fr.M - fr.col, y0 - 2 * fr.U, False)
        rows_on = min(self.rows, int(lf / 2) + 1)  # rows are cut in one every 2 f
        r_ = random.Random(hash((self.a, f // 3)) & 0xffffffff)
        clear = f >= self.end - 12
        for r in range(rows_on):
            y = y0 + (r + 1) * self.lead
            text(d, "[", self.size, fr.M, y, False); text(d, "]", self.size, fr.w - fr.M - tw("]", self.size), y, False)
            for c in range(self.cols):
                k = (r, c)
                if k in self.lock and f >= self.lock_at[k]: ch = self.lock[k]; b = True
                elif clear: continue
                else:
                    ch = r_.choice(self.noise) if r_.random() < 0.35 else "."; b = False
                    if ch != ".": CTX.flips += 1
                text(d, ch, self.size, x0 + c * self.pitch, y, b)
        if clear:
            y = y0 + (self.row + 1) * self.lead; x = x0 + self.c0 * self.pitch
            keyline(d, fr, (x - fr.U, y - capH(self.size, True) - fr.U, x + (len(self.word) - 1) * self.pitch + tw("W", self.size, True) + fr.U, y + fr.U))


class Loading(Scene):
    """Progress: a label, a two-digit counter and a row of hairline cells that fill white
    (progress = t^1.6). No type ever sits on a filled cell."""
    name, min_dur = "loading", 30
    def __init__(self, *a):
        super().__init__(*a)
        self.label = self.rng.choice(self.c["words"])
        self.n = self.rng.choice([5, 8, 10]); self.anchor = self.rng.choice(["top", "center", "bottom"])
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a
        p = min(1, max(0, (lf - 6) / max(1, self.dur - 18)) ** 1.6)
        S = fr.TITLE
        y = {"top": fr.top + capH(S, True), "center": fr.h / 2, "bottom": fr.bottom - 10 * fr.U}[self.anchor]
        text(d, fast(self.label, f, self.a, cpf=1.0), S, fr.M, y, True)
        text(d, f"{min(99, int(p * 100)):02d}" if p < 1 else "OK", S, fr.M + 6 * fr.col, y, False)
        cw = fr.measure / self.n; cy = y + 4 * fr.U; ch = 3 * fr.U
        on = int(p * self.n + 1e-6); CTX.chars += on  # each filled cell ticks like a typed character (6.1)
        for i in range(self.n):
            x0 = fr.M + i * cw; box = (x0, cy, x0 + cw - fr.U, cy + ch)
            if i < on: d.rectangle([int(v) for v in box], fill=INK)
            else: keyline_plain(d, fr, box)


def keyline_plain(d, fr, box):
    x0, y0, x1, y1 = box; t = fr.HAIR
    for r in [(x0, y0, x1, y0 + t), (x0, y1 - t, x1, y1), (x0, y0, x0 + t, y1), (x1 - t, y0, x1, y1)]:
        d.rectangle([int(v) for v in r], fill=INK)


class Pattern(Scene):
    """Bands: rows of one repeated word fill the frame, cut in one row every 2 f, then one cell is selected."""
    name, min_dur = "pattern", 24
    def __init__(self, *a):
        super().__init__(*a)
        fr, rng = self.fr, self.rng
        self.words = rng.sample(self.c["words"] + self.c["title"].split()[:1], 2)
        self.size = rng.choice([fr.MICRO, fr.TEXT]); self.bold = rng.random() < 0.5
        self.lead = capH(self.size, self.bold) + rng.choice([1.6, 2.4, 6]) * fr.U
        self.rows = int((fr.bottom - fr.top) // self.lead)
        self.order = list(range(self.rows))
        if rng.random() < 0.5: rng.shuffle(self.order)
        self.sel = (rng.randrange(self.rows), rng.randrange(3))
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a
        on = set(self.order[:int(lf / 2) + 1])
        for r in range(self.rows):
            if r not in on: continue
            w = self.words[r % 2]; y = fr.top + (r + 1) * self.lead
            step = tw(w, self.size, self.bold) + 2 * fr.U
            x, c = fr.M, 0
            while x + tw(w, self.size, self.bold) <= fr.w - fr.M:
                text(d, w, self.size, x, y, self.bold)
                if (r, c) == self.sel and f >= self.end - 12: keyline(d, fr, word_box(fr, w, self.size, x, y, self.bold))
                x += step; c += 1


class Burst(Scene):
    """3.10 Climax: hard cuts every 9-12 f. Even cuts: giant index number. Odd cuts: giant word.
    Position per cut: top content line, center or bottom margin (seeded)."""
    name, scale, min_dur = "burst", "large", 27
    def __init__(self, *a):
        super().__init__(*a)
        self.cuts, t = [], 0
        while t < self.dur - 6:
            self.cuts.append((t, self.rng.choice(["center", "center", "top", "bottom"]))); t += self.rng.randint(9, 12)
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a; ws = self.c["words"]
        i = max(k for k, (c, _) in enumerate(self.cuts) if c <= lf)
        if lf == self.cuts[i][0] and i: CTX.cut = True
        s = f"{i // 2 % len(ws) + 1:02d}" if i % 2 == 0 else ws[i // 2 % len(ws)]
        S = fit(s, fr.measure, True); S = min(S, (fr.bottom - fr.top) / 0.75)
        a = self.cuts[i][1]
        y = {"center": fr.h / 2 + capH(S, True) / 2, "top": fr.top + capH(S, True), "bottom": fr.bottom}[a]
        text(d, s, S, fr.M, y, True)


class Lockup(Scene):
    """4.1 Close. Variant A: title top, index bottom. B: title bottom, index top. C: bracket lockup."""
    name, scale, min_dur = "lockup", "large", 36
    def __init__(self, *a):
        super().__init__(*a)
        self.variant = self.rng.choice("ABC")
        self.bottom = self.variant == "B"
        self.sched, _ = type_schedule([f"{i + 1:02d} {w_}" for i, w_ in enumerate(self.c["words"])], self.a + 3, self.rng, within=self.dur * 0.5)
    def draw(self, d, f):
        fr = self.fr
        if self.variant == "C": return self.draw_c(d, f)
        lines = self.c["title"].split()
        sizes = [fit(x, fr.measure, True) for x in lines]
        block = sum(capH(S, True) for S in sizes) + 1.6 * fr.U * (len(lines) - 1)
        n = len(self.c["words"]); pitch = capH(fr.TEXT) + 2.4 * fr.U
        top = fr.top
        if self.bottom: room = (fr.h - fr.M - 14 * fr.U) - (top + (n + 1) * pitch + 6 * fr.U)
        else: room = (fr.h - fr.M - 10 * fr.U - (n - 1) * pitch - capH(fr.TEXT)) - 14 * fr.U - top
        if block > room:
            k = room / block; sizes = [S * k for S in sizes]
            block = sum(capH(S, True) for S in sizes) + 1.6 * fr.U * (len(lines) - 1)
        y = (fr.h - fr.M - 14 * fr.U - block) if self.bottom else top
        first = None
        for k, s in enumerate(lines):
            S = sizes[k]; y += capH(S, True) + (0 if k == 0 else 1.6 * fr.U)
            text(d, s, S, fr.M, y, True)
            if k == 0: first = (s, S, y)
        y += 8 * fr.U
        if self.bottom: y = fr.M + 22 * fr.U + (n + 1) * pitch
        hline(d, fr, y)
        for i, w_ in enumerate(self.c["words"]):
            yy = (fr.M + 22 * fr.U + (i + 1) * pitch) if self.bottom else fr.h - fr.M - 10 * fr.U - (n - 1 - i) * pitch
            text(d, shown(f"{i + 1:02d} {w_}", self.sched[i], f), fr.TEXT, fr.M + min(i, 7) * fr.col, yy, False)
        if f >= self.end - 12:
            s, S, yl = first; keyline(d, fr, word_box(fr, s, S, fr.M, yl, True, pad=1.5 * fr.U))
    def draw_c(self, d, f):
        """Variant C: [TITLE] fit to measure on the vertical center, index spread on one row below."""
        fr = self.fr; t = f"[{self.c['title']}]"
        S = fit(t, fr.measure); y = fr.h / 2 + capH(S, True) / 2
        text(d, t[0] + fast(t[1:-1], f, self.a, cpf=1.0) + (t[-1] if True else ""), S, fr.M, y, True)
        hline(d, fr, y + 8 * fr.U)
        pitch = capH(fr.TEXT) + 2.4 * fr.U
        for i, w_ in enumerate(self.c["words"]):
            text(d, shown(f"{i + 1:02d} {w_}", self.sched[i], f), fr.TEXT,
                 fr.M + min(i, 7) * fr.col, y + 8 * fr.U + (i + 1) * pitch, False)
        if f >= self.end - 12:
            keyline(d, fr, word_box(fr, t, S, fr.M, y, True, pad=1.5 * fr.U))


# ---------- 5. Structure ----------
RECIPES = [TypeStair, Stack, Spread, Scatter, Bracket, Macro, Slot, Monument, Scan, Matrix, Loading, Pattern]
OPENERS = [TypeStair, Spread, Scatter, Bracket, Macro, Matrix, Loading]


def compose(content, seconds, seed, fmt):
    """5.1 Generative structure: a sequence of shots drawn from the grammar, not a fixed timeline.
    opener (small, typed) -> shots alternating scale -> optional burst -> lockup.
    Pivot (3 f white field) after the first third. Durations shrink toward the end (5.2)."""
    fr = Frame(fmt); rng = random.Random(seed); N = int(seconds * FPS)
    lock = max(Lockup.min_dur, int(N * rng.uniform(0.16, 0.22)))
    use_burst = N >= 120 and rng.random() < 0.75
    burst = rng.randint(30, 48) if use_burst else 0
    body = N - lock - burst - 3
    k = max(2, min(12, round(body / rng.uniform(55, 80))))
    r = rng.uniform(0.72, 0.9)                                   # 5.2 each shot r x the previous one
    w = [r ** i for i in range(k)]; durs = [int(body * x / sum(w)) for x in w]
    durs[0] += body - sum(durs)
    plan, last, uses = [], None, {}
    for i, dur in enumerate(durs):
        pool = OPENERS if i == 0 else RECIPES
        ok = [c for c in pool if c.min_dur <= dur and c is not last and uses.get(c, 0) < (1 if k <= 9 else 2)
              and (last is None or c.scale != last.scale or rng.random() < 0.25)]
        if not ok and plan: plan[-1][1] += dur; continue          # no fresh recipe fits: the previous shot holds longer
        if not ok: ok = [c for c in pool if c.min_dur <= dur] or [Monument]
        c = rng.choice(ok); uses[c] = uses.get(c, 0) + 1; last = c; plan.append([c, dur])
    k = len(plan)
    pivot_after = max(0, min(k - 1, round(k * rng.uniform(0.25, 0.5)) - 1))
    seq, t = [], 0
    for i, (c, dur) in enumerate(plan):
        seq.append((c, t, dur)); t += dur
        if i == pivot_after: seq.append(("PIVOT", t, 3)); t += 3
    if burst: seq.append((Burst, t, burst)); t += burst
    seq.append((Lockup, t, N - t))
    scenes = []
    for cls, a, dur in seq:
        if cls == "PIVOT": scenes.append(("PIVOT", a, dur)); continue
        s = cls(fr, a, dur, random.Random(rng.random()), content)
        if isinstance(s, TokenScene): s.setup()
        scenes.append(s)
    return fr, scenes, N


def meta(d, fr, f, N, label, idx, total):
    """4.5 Meta layer: corners only, micro, white. Brand / counter / scene name / timecode."""
    c0 = CTX.chars
    y = fr.M + capH(fr.MICRO)
    text(d, "MAR ACADEMY", fr.MICRO, fr.M, y, True)
    c = f"({idx:02d}/{total:02d})"; text(d, c, fr.MICRO, fr.w - fr.M - tw(c, fr.MICRO), y)
    hline(d, fr, y + 2 * fr.U)
    yb = fr.h - fr.M
    text(d, label.upper(), fr.MICRO, fr.M, yb)
    s, fi = divmod(f, FPS); tc = f"00:00:{s:02d}:{fi:02d}"
    text(d, tc, fr.MICRO, fr.w - fr.M - tw(tc, fr.MICRO), yb)
    CTX.chars = c0


def render(fr, scenes, N, f):
    """Returns (image, event) where event feeds section 6 (Sound)."""
    global CTX
    CTX = Ctx()
    img = Image.new("RGB", (fr.w, fr.h), GROUND); d = ImageDraw.Draw(img)
    ev = {"scene": -1, "pivot": False, "scale": "small"}
    real = [x for x in scenes if not isinstance(x, tuple)]
    for k, s in enumerate(scenes):
        a, dur = (s[1], s[2]) if isinstance(s, tuple) else (s.a, s.dur)
        if a <= f < a + dur:
            ev["scene"] = k
            if isinstance(s, tuple):  # 3.11 Pivot: full white field, no type
                d.rectangle([0, 0, fr.w, fr.h], fill=INK); ev["pivot"] = True; break
            s.draw(d, f); ev["scale"] = s.scale
            meta(d, fr, f, N, "system / " + s.name, real.index(s) + 1, len(real))
            break
    ev.update(chars=CTX.chars, sel=CTX.sel, flips=CTX.flips, cut=CTX.cut)
    return img.resize((fr.W, fr.H), Image.LANCZOS), ev


# ---------- 6. Sound ----------
SR = 48000

def _env(n, tau): return np.exp(-np.arange(n) / (tau * SR))

def snd_tick(rng, pitch):
    """6.1 Key tick: 25 ms, muted body (sine at pitch) + 2 ms noise transient. Energy 120-500 Hz."""
    n = int(0.025 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * pitch * t) * _env(n, 0.006)
    noise = rng.standard_normal(n); noise = np.convolve(noise, np.ones(12) / 12, "same") * _env(n, 0.0015)
    return 0.8 * body + 0.6 * noise

def snd_blip(rng):
    """6.3 Selection: 40 ms sine at 1.2 kHz."""
    n = int(0.04 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 1200 * t) * _env(n, 0.012)

def snd_thump(rng, big=False):
    """6.4 Cut: pitch-dropping sine 110 -> 45 Hz, 160 ms, plus a 3 ms click."""
    n = int((0.35 if big else 0.16) * SR); t = np.arange(n) / SR
    fq = 45 + 65 * np.exp(-t / 0.03); ph = 2 * np.pi * np.cumsum(fq) / SR
    out = np.sin(ph) * _env(n, 0.09 if big else 0.05)
    click = rng.standard_normal(n) * _env(n, 0.0008)
    if big:
        nz = np.convolve(rng.standard_normal(n), np.ones(40) / 40, "same") * _env(n, 0.07) * 3
        out = out + nz
    return out + 0.4 * click

def db(x): return 10 ** (x / 20)

def soundtrack(events, seed):
    """6. Sound is derived from the frames, never authored: a frame that adds characters ticks,
    one that removes them ticks lower, a selection that appears blips, a cut or pivot thumps."""
    rng = np.random.default_rng(seed)
    N = len(events); out = np.zeros(int((N / FPS + 0.6) * SR))
    def add(sig, f, gain):
        i = int(f / FPS * SR + rng.integers(0, int(SR / FPS / 2))); out[i:i + len(sig)] += sig[:len(out) - i] * gain
    last_tick, pivoted, prev = -99, False, None
    for f, e in enumerate(events):
        loud = 0 if pivoted else -8                               # 6.5 Act 1 sits 8 dB under the rest
        if e["pivot"] and not (prev and prev["pivot"]):
            add(snd_thump(rng, True), f, db(-4)); pivoted = True
        elif prev is not None and (e["scene"] != prev["scene"] or e["cut"]) and not e["pivot"]:
            add(snd_thump(rng), f, db(-9 + loud))
        if prev is not None and not e["pivot"] and e["scene"] == prev["scene"]:
            dc = e["chars"] - prev["chars"]
            pitch = (190 if e["scale"] == "large" else 330) * rng.uniform(0.92, 1.08)  # 6.2 bigger type, lower tick
            if (dc > 0 or e["flips"]) and f - last_tick >= 2:
                add(snd_tick(rng, pitch), f, db(-20 + loud)); last_tick = f
            elif dc < 0 and f - last_tick >= 2:
                add(snd_tick(rng, pitch * 0.75), f, db(-22 + loud)); last_tick = f
            if e["sel"] > prev["sel"]: add(snd_blip(rng), f, db(-24 + loud))
        prev = e
    pk = np.abs(out).max()
    if pk > db(-1): out *= db(-1) / pk
    return out


def write_wav(path, x):
    s = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(np.repeat(s[:, None], 2, axis=1).tobytes())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", default="MAR CREATIVE ACADEMY")
    ap.add_argument("--words", nargs="+", default=["INNOVATION", "TECHNOLOGY", "DESIGN"])
    ap.add_argument("--seconds", type=float, default=5)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--format", default="9:16", choices=FORMATS)
    ap.add_argument("--out", default="out.mp4")
    ap.add_argument("--stills", default="", help="comma frames to export as PNG instead of video")
    ap.add_argument("--mute", action="store_true", help="video only, no sound (section 6)")
    a = ap.parse_args()
    content = {"title": a.title.upper(), "words": [w.upper() for w in a.words]}
    fr, scenes, N = compose(content, a.seconds, a.seed, a.format)
    names = [(s[0] if isinstance(s, tuple) else s.name) for s in scenes]
    if a.stills:
        for f in map(int, a.stills.split(",")):
            render(fr, scenes, N, f)[0].save(f"{os.path.splitext(a.out)[0]}_f{f:03d}.png")
        print("seed", a.seed, "->", names)
        return
    tmp = tempfile.mkdtemp()
    vid = a.out if a.mute else os.path.join(tmp, "v.mp4")
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{fr.W}x{fr.H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                          "-pix_fmt", "yuv420p", "-crf", "14", "-movflags", "+faststart", vid], stdin=subprocess.PIPE)
    events = []
    for f in range(N):
        img, ev = render(fr, scenes, N, f); events.append(ev); p.stdin.write(img.tobytes())
    p.stdin.close(); p.wait()
    if not a.mute:
        wav = os.path.join(tmp, "a.wav"); write_wav(wav, soundtrack(events, a.seed))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", vid, "-i", wav, "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", a.out], check=True)
    print("seed", a.seed, "->", names, a.out)


if __name__ == "__main__":
    main()
