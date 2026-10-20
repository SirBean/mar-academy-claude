"""MAR Kinetic System - rule engine.

Generates new motion graphics from scratch out of content + duration + seed.
Every value here is a rule from MAR_KINETIC_SYSTEM.md (section numbers in comments).

    python3 marsys.py --title "MAR CREATIVE ACADEMY" --words INNOVATION TECHNOLOGY DESIGN \
        --seconds 5 --seed 3 --format 9:16 --out mar_s3.mp4

Same seed + same content = identical frames. New seed = new valid composition.
"""
import argparse, functools, os, random, subprocess, sys
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


@functools.lru_cache(None)
def F(px, bold=False): return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, max(1, int(round(px))))

def ink_box(s, size, bold=False): return F(size, bold).getbbox(s, anchor="ls")
def tw(s, size, bold=False): l, _, r, _ = ink_box(s, size, bold); return r - l
def capH(size, bold=False): return -F(size, bold).getbbox("H", anchor="ls")[1]
def fit(s, width, bold=True): return 600 * width / tw(s, 600, bold)

def text(d, s, size, x, y, bold=False):
    """Left edge of INK (not advance) sits on x, baseline on y. Always white (2.2)."""
    if not s: return
    l = ink_box(s, size, bold)[0]
    d.text((x - l, y), s, font=F(size, bold), fill=INK, anchor="ls")

def keyline(d, fr, box, label=True):
    """4.4 Selection = hairline frame + measurement numbers. Never a fill."""
    x0, y0, x1, y1 = box; t = fr.HAIR
    for r in [(x0, y0, x1, y0 + t), (x0, y1 - t, x1, y1), (x0, y0, x0 + t, y1), (x1 - t, y0, x1, y1)]:
        d.rectangle([int(v) for v in r], fill=INK)
    if label:
        text(d, f"{int((x1 - x0) / SS)}", fr.MICRO * 0.8, x0, y0 - fr.U, False)
        n = f"{int((y1 - y0) / SS)}"; text(d, n, fr.MICRO * 0.8, x1 + fr.U, y1, False)

def word_box(fr, s, size, x, y, bold, pad=None):
    pad = fr.U if pad is None else pad
    return (x - pad, y - capH(size, bold) - pad, x + tw(s, size, bold) + pad, y + pad)


# ---------- 3. Motion grammar (from the reference's text behavior) ----------
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

def shown(s, sched, f): return s[:sum(1 for x in sched if x <= f)]

def fast(s, f, start, cpf=0.5):
    """3.1b Burst typing for large type: cpf chars per frame."""
    return s[:max(0, int((f - start) * cpf) + 1)] if f >= start else ""


class Scene:
    name = "scene"
    def __init__(self, fr, start, dur, rng, content): self.fr, self.a, self.dur, self.rng, self.c = fr, start, dur, rng, content
    def draw(self, d, f): pass


class TypeStair(Scene):
    """Act 1. Title typed, then indexed words in a staircase (3.6), one keyline jump (3.4)."""
    name = "type / stair"
    def __init__(self, *a):
        super().__init__(*a)
        fr = self.fr
        self.lines = [(self.c["title"], fr.TITLE, True, 0)] + \
            [(f"{i + 1:02d}  {wd}", fr.TEXT, False, i + 1) for i, wd in enumerate(self.c["words"])]
        self.sched, end = type_schedule([l[0] for l in self.lines], self.a + 2, self.rng, within=self.dur * 0.7)
        self.sel = self.rng.randrange(1, len(self.lines))
        self.sel_at = min(int(end) + 2, self.a + self.dur - 10)

    def draw(self, d, f):
        fr = self.fr; y = fr.M + 22 * fr.U
        for k, (s, size, bold, ind) in enumerate(self.lines):
            y += capH(size, bold) + (0 if k == 0 else 2.2 * fr.U)
            x = fr.M + ind * fr.col
            vis = shown(s, self.sched[k], f)
            text(d, vis, size, x, y, bold)
            if k == self.sel and self.sel_at <= f < self.sel_at + 9 and vis == s:
                keyline(d, fr, word_box(fr, s, size, x, y, bold))
            if k == 0: y += 4 * fr.U


class Macro(Scene):
    """Act 1 alt. 3.9 Macro-from-micro: one giant initial built from micro words, typed in row order."""
    name = "macro / micro"
    def __init__(self, *a):
        super().__init__(*a)
        fr = self.fr
        self.glyph = self.c["title"][0]
        self.unit = self.c["title"].split()[0]
        cell_w = tw(self.unit + " ", fr.MICRO, True) + fr.U; cell_h = capH(fr.MICRO) + 1.6 * fr.U
        cols, rows = int(fr.measure // cell_w), int((fr.h - 2 * fr.M - 30 * fr.U) // cell_h)
        mask = Image.new("L", (cols * 10, rows * 10), 0)
        md = ImageDraw.Draw(mask); S = fit(self.glyph, cols * 10, True)
        S = min(S, rows * 10 / 0.75); l = ink_box(self.glyph, S, True)[0]
        md.text((-l + (cols * 10 - tw(self.glyph, S, True)) / 2, rows * 10 * 0.9), self.glyph, font=F(S, True), fill=255, anchor="ls")
        self.cells = [(c, r) for r in range(rows) for c in range(cols)
                      if mask.getpixel((c * 10 + 5, r * 10 + 5)) > 127]
        self.cw, self.ch, self.y0 = cell_w, cell_h, fr.M + 18 * fr.U
        n = len(self.cells); self.rate = n / max(1, (self.dur - 14))   # cells per frame, accelerating
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a
        n = int(len(self.cells) * min(1, (lf / max(1, self.dur - 14)) ** 1.6))
        for c, r in self.cells[:n]:
            text(d, self.unit, fr.MICRO, fr.M + c * self.cw, self.y0 + (r + 1) * self.ch, True)
        if n >= len(self.cells):
            text(d, shown(self.c["title"], self.sched, f), fr.TEXT, fr.M, fr.h - fr.M - 10 * fr.U, True)
    def prepare(self):
        self.sched, _ = type_schedule([self.c["title"]], self.a + self.dur - 14, self.rng, base=0.6)
        self.sched = self.sched[0]


class Slot(Scene):
    """Act 2. 3.3 Slot substitution: fixed frame line + one slot retyped through values, back to the first."""
    name = "slot"
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a
        words = self.c["words"] + [self.c["words"][0]]
        step = max(6, (self.dur - 6) // len(words))
        i = min(len(words) - 1, lf // step); wd = words[i]
        S = fit(max(self.c["words"], key=len), fr.measure, True)
        y = fr.h / 2 + capH(S, True) / 2
        text(d, self.c["title"].split()[0] + " /", fr.TITLE, fr.M, y - capH(S, True) - 4 * fr.U, True)
        vis = fast(wd, f, self.a + i * step, cpf=1.5)
        text(d, vis, S, fr.M, y, True)
        if i == len(words) - 1 and lf % step >= 3:
            keyline(d, fr, word_box(fr, wd, S, fr.M, y, True))


class Monument(Scene):
    """Act 2. 4.2 One word at fit-to-measure (or cropped 1.4x off the right edge), typed in bursts."""
    name = "monument"
    def __init__(self, *a):
        super().__init__(*a)
        self.word = self.rng.choice(self.c["words"]); self.crop = self.rng.random() < 0.5
    def draw(self, d, f):
        fr = self.fr
        S = fit(self.word, fr.measure, True) * (1.4 if self.crop else 1.0)
        y = fr.h * (0.62 if self.crop else 0.5) + capH(S, True) / 2
        text(d, fast(self.word, f, self.a + 2, cpf=0.6), S, fr.M, y, True)
        idx = self.c["words"].index(self.word) + 1
        text(d, f"{idx:02d}", fr.TITLE, fr.M, y - capH(S, True) - 4 * fr.U, False)


class Scan(Scene):
    """Act 2. 3.5 Scan: words stacked at fit-to-measure, keyline steps row to row, rows leave from the top."""
    name = "scan"
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a; ws = self.c["words"]
        S = min(fit(w_, fr.measure, True) for w_ in ws)
        lead = capH(S, True) * 1.18
        step = max(6, (self.dur - 2 * len(ws) - 2) // len(ws))
        sel = lf // step
        gone = max(0, (lf - len(ws) * step) // 2 + 1) if lf >= len(ws) * step else 0          # rows cut out from the top, 1 per 2 f
        y = fr.M + 22 * fr.U
        for k, w_ in enumerate(ws):
            y += lead if k else capH(S, True)
            if k < gone: continue
            text(d, w_, S, fr.M, y, True)
            if k == sel: keyline(d, fr, word_box(fr, w_, S, fr.M, y, True))


class Burst(Scene):
    """Act 3. 3.10 Climax: hard cuts every 9-12 f, alternating giant index numbers and words."""
    name = "burst"
    def __init__(self, *a):
        super().__init__(*a)
        self.cuts, t = [], 0
        while t < self.dur: self.cuts.append(t); t += self.rng.randint(9, 12)
    def draw(self, d, f):
        fr = self.fr; lf = f - self.a; ws = self.c["words"]
        i = max(k for k, c in enumerate(self.cuts) if c <= lf)
        s = f"{i // 2 % len(ws) + 1:02d}" if i % 2 == 0 else ws[i // 2 % len(ws)]
        S = fit(s, fr.measure, True)
        text(d, s, S, fr.M, fr.h / 2 + capH(S, True) / 2, True)


class Lockup(Scene):
    """Final. 4.1 Title stacked, every line fit to measure, leading 1.08 cap; keywords typed as an index; keyline on line 1."""
    name = "lockup"
    def __init__(self, *a):
        super().__init__(*a)
        self.bottom = self.rng.random() < 0.5          # 4.1 variant: title anchored to top or bottom margin
        self.sched, _ = type_schedule([f"{i + 1:02d} {w_}" for i, w_ in enumerate(self.c["words"])], self.a + 3, self.rng, within=self.dur * 0.5)
    def draw(self, d, f):
        fr = self.fr; lines = self.c["title"].split()
        sizes = [fit(x, fr.measure, True) for x in lines]
        block = sum(capH(S, True) for S in sizes) + 1.6 * fr.U * (len(lines) - 1)
        y = (fr.h - fr.M - 14 * fr.U - block) if self.bottom else fr.M + 22 * fr.U
        first = None
        for k, s in enumerate(lines):
            S = fit(s, fr.measure, True); y += capH(S, True) + (0 if k == 0 else 1.6 * fr.U)
            text(d, s, S, fr.M, y, True)
            if k == 0: first = (s, S, y)
        y += 8 * fr.U
        if self.bottom: y = fr.M + 22 * fr.U + (len(self.c["words"]) + 1) * (capH(fr.TEXT) + 2.4 * fr.U)
        d.rectangle([int(fr.M), int(y), int(fr.w - fr.M), int(y + fr.HAIR)], fill=INK)
        n = len(self.c["words"]); pitch = capH(fr.TEXT) + 2.4 * fr.U
        for i, w_ in enumerate(self.c["words"]):
            yy = (fr.M + 22 * fr.U + (i + 1) * pitch) if self.bottom else fr.h - fr.M - 10 * fr.U - (n - 1 - i) * pitch
            text(d, shown(f"{i + 1:02d} {w_}", self.sched[i], f), fr.TEXT, fr.M + i * fr.col, yy, False)
        if f >= self.a + self.dur - 12:
            s, S, yl = first; keyline(d, fr, word_box(fr, s, S, fr.M, yl, True, pad=1.5 * fr.U))


# ---------- 5. Structure ----------
def compose(content, seconds, seed, fmt):
    """5.1 Acts by ratio: BUILD 0-30% | PIVOT 3 f | STATEMENT -> 72% | BURST -> 84% | LOCKUP -> 100%."""
    fr = Frame(fmt); rng = random.Random(seed); N = int(seconds * FPS)
    p1 = int(N * 0.30); p2 = p1 + 3; p4 = int(N * 0.84); p3 = int(N * 0.72)
    act1 = rng.choice([TypeStair, Macro])
    mids = rng.sample([Slot, Monument, Scan], 2)
    split = p2 + int((p3 - p2) * 0.56)                   # 5.2 durations shrink
    plan = [(act1, 0, p1), ("PIVOT", p1, 3), (mids[0], p2, split - p2), (mids[1], split, p3 - split),
            (Burst, p3, p4 - p3), (Lockup, p4, N - p4)]
    scenes = []
    for cls, a, dur in plan:
        if cls == "PIVOT": scenes.append(("PIVOT", a, dur)); continue
        s = cls(fr, a, dur, random.Random(rng.random()), content)
        if hasattr(s, "prepare"): s.prepare()
        scenes.append(s)
    return fr, scenes, N


def meta(d, fr, f, N, label, idx, total):
    """4.5 Meta layer: corners only, micro, white. Title / counter / scene name / timecode."""
    y = fr.M + capH(fr.MICRO)
    text(d, "MAR ACADEMY", fr.MICRO, fr.M, y, True)
    c = f"({idx:02d}/{total:02d})"; text(d, c, fr.MICRO, fr.w - fr.M - tw(c, fr.MICRO), y)
    d.rectangle([int(fr.M), int(y + 2 * fr.U), int(fr.w - fr.M), int(y + 2 * fr.U + fr.HAIR)], fill=INK)
    yb = fr.h - fr.M
    text(d, label.upper(), fr.MICRO, fr.M, yb)
    s, fi = divmod(f, FPS); tc = f"00:00:{s:02d}:{fi:02d}"
    text(d, tc, fr.MICRO, fr.w - fr.M - tw(tc, fr.MICRO), yb)


def render(fr, scenes, N, f):
    img = Image.new("RGB", (fr.w, fr.h), GROUND); d = ImageDraw.Draw(img)
    for k, s in enumerate(scenes):
        a, dur = (s[1], s[2]) if isinstance(s, tuple) else (s.a, s.dur)
        if a <= f < a + dur:
            if isinstance(s, tuple):  # 3.11 Pivot: full white field, no type
                d.rectangle([0, 0, fr.w, fr.h], fill=INK); break
            s.draw(d, f)
            real = [x for x in scenes if not isinstance(x, tuple)]
            meta(d, fr, f, N, "system / " + s.name, real.index(s) + 1, len(real))
            break
    return img.resize((fr.W, fr.H), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--title", default="MAR CREATIVE ACADEMY")
    ap.add_argument("--words", nargs="+", default=["INNOVATION", "TECHNOLOGY", "DESIGN"])
    ap.add_argument("--seconds", type=float, default=5)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--format", default="9:16", choices=FORMATS)
    ap.add_argument("--out", default="out.mp4")
    ap.add_argument("--stills", default="", help="comma frames to export as PNG instead of video")
    a = ap.parse_args()
    content = {"title": a.title.upper(), "words": [w.upper() for w in a.words]}
    fr, scenes, N = compose(content, a.seconds, a.seed, a.format)
    if a.stills:
        for f in map(int, a.stills.split(",")):
            render(fr, scenes, N, f).save(f"{os.path.splitext(a.out)[0]}_f{f:03d}.png")
        return
    p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                          "-s", f"{fr.W}x{fr.H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                          "-pix_fmt", "yuv420p", "-crf", "14", "-movflags", "+faststart", a.out], stdin=subprocess.PIPE)
    for f in range(N): p.stdin.write(render(fr, scenes, N, f).tobytes())
    p.stdin.close(); p.wait()
    print("seed", a.seed, "->", [s if isinstance(s, tuple) else s.name for s in scenes][:1] and
          [(s[0] if isinstance(s, tuple) else s.name) for s in scenes], a.out)


if __name__ == "__main__":
    main()
