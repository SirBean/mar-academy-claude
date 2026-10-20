import React from "react";
import { color, font, grid } from "../system/tokens";
import { ihash, noise3, rand } from "../system/rng";
import { stepped } from "../system/timing";
import { Canvas } from "./Canvas";

/**
 * SEAM MARK — the identity mark. Hand × machine.
 * The letters are drawn twice and split by one vertical seam:
 *   right of the seam  → HAND: a single hatched gesture, hairline, variable
 *                        pressure, "boiling" on fours like drawn animation.
 *   left of the seam   → MACHINE: the same letters sampled onto the cell grid
 *                        as tesserae, which can compile further into 0/1 glyphs.
 * Moving the seam is the whole story: expression gets computed, and the mark
 * is never fully one or the other.
 */
export type SeamProps = {
  seed: number;
  text: string;
  /** cell size in px for tesserae and glyphs */
  cell: number;
  /** 0..1 position of the seam across the mark (0 = all hand, 1 = all machine) */
  seam: number;
  /** 0..1 how much of the hand gesture is drawn */
  draw?: number;
  /** 0..1 share of tesserae compiled into 0/1 glyphs */
  glyph?: number;
  /** px of RGB split on compiled glyphs (0 = off) */
  chroma?: number;
  /** hairline width for the gesture */
  stroke?: number;
  ink?: string;
  /** colour of the seam hairline (undefined = no line) */
  seamLine?: string;
  width?: number;
  height?: number;
};

// ── letter mask: display face, every letter stretched to fill its own cell ──
const masks = new Map<string, { data: Uint8ClampedArray; canvas: HTMLCanvasElement }>();
const getMask = (text: string, w: number, h: number, seed: number, gap: number) => {
  const key = `${text}|${w}|${h}|${seed}|${gap}`;
  const hit = masks.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const FS = 200;
  ctx.font = `900 ${FS}px "${font.display}"`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  const chars = [...text];
  const wt = chars.map((_, i) => 0.75 + rand(seed, "seam-w", i) * 0.7);
  const total = wt.reduce((s, x) => s + x, 0);
  const inner = w - gap * (chars.length - 1);
  let x = 0;
  chars.forEach((ch, i) => {
    const cw = (wt[i] / total) * inner;
    const m = ctx.measureText(ch);
    const gw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const gh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const sx = cw / gw;
    const sy = h / gh;
    ctx.setTransform(sx, 0, 0, sy, x + m.actualBoundingBoxLeft * sx, m.actualBoundingBoxAscent * sy);
    ctx.fillText(ch, 0, 0);
    x += cw + gap;
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const out = { data: ctx.getImageData(0, 0, w, h).data, canvas: c };
  masks.set(key, out);
  return out;
};

let handC: HTMLCanvasElement | null = null;
const handCanvas = (w: number, h: number) => {
  if (!handC) handC = document.createElement("canvas");
  if (handC.width !== w || handC.height !== h) {
    handC.width = w;
    handC.height = h;
  }
  return handC;
};

const atlas = new Map<string, HTMLCanvasElement>();
const sprite = (ch: string, fill: string, size: number) => {
  const key = `${ch}|${fill}|${size}`;
  let c = atlas.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = Math.ceil(size + 2);
    c.height = Math.ceil(size * 1.3 + 2);
    const a = c.getContext("2d")!;
    a.font = `700 ${size * 1.15}px "${font.mono}"`;
    a.textBaseline = "top";
    a.textAlign = "center";
    a.fillStyle = fill;
    a.fillText(ch, c.width / 2, 1);
    if (atlas.size > 200) atlas.clear();
    atlas.set(key, c);
  }
  return c;
};

export const SeamMark: React.FC<SeamProps> = ({
  seed,
  text,
  cell,
  seam,
  draw = 1,
  glyph = 0,
  chroma = 0,
  stroke = 1.5,
  ink = color.white,
  seamLine,
  width,
  height,
}) => {
  const n = noise3(`seam-${seed}`);
  return (
    <Canvas
      width={width}
      height={height}
      draw={(ctx, w, h, frame) => {
        const f = stepped(frame);
        const mask = getMask(text, w, h, seed, cell * 3);
        const cols = Math.floor(w / cell);
        const rows = Math.floor(h / cell);
        // the seam always sits on a cell boundary
        const seamX = Math.round((seam * w) / cell) * cell;
        const at = (x: number, y: number) => mask.data[((y | 0) * w + (x | 0)) * 4 + 3];

        // ── HAND ────────────────────────────────────────────────────────────
        if (seamX < w && draw > 0) {
          const hc = handCanvas(w, h);
          const hx = hc.getContext("2d")!;
          hx.setTransform(1, 0, 0, 1, 0, 0);
          hx.globalCompositeOperation = "source-over";
          hx.clearRect(0, 0, w, h);
          hx.strokeStyle = ink;
          hx.lineCap = "round";
          hx.lineJoin = "round";
          const boil = Math.floor(frame / 4); // drawn animation "boils" on fours
          const pitch = Math.max(3, cell * 0.62);
          const D = Math.hypot(w, h);
          const passes = [-0.42 + rand(seed, "ang") * 0.2, 0.9 + rand(seed, "ang2") * 0.2];
          passes.forEach((theta, p) => {
            // second pass (cross-hatch) starts once the first is half drawn
            const prog = p === 0 ? Math.min(1, draw * 1.5) : Math.max(0, draw * 2 - 1);
            if (prog <= 0) return;
            const ct = Math.cos(theta);
            const st = Math.sin(theta);
            const nRows = Math.ceil(D / pitch);
            const segs = 48;
            const limit = prog * nRows * segs;
            let drawn = 0;
            for (let r = 0; r < nRows && drawn < limit; r++) {
              // second pass is sparser, like a lighter hand
              if (p === 1 && ihash(seed, r, 77) < 0.45) {
                drawn += segs;
                continue;
              }
              const v = -D / 2 + r * pitch;
              const dir = r % 2 === 0 ? 1 : -1;
              hx.lineWidth = stroke * (0.55 + 0.9 * ((n(r * 0.31, p * 9, boil * 0.7) + 1) / 2));
              hx.beginPath();
              for (let i = 0; i <= segs && drawn < limit; i++, drawn++) {
                const u = (dir * (i / segs - 0.5)) * D;
                const j = n(u / (D * 0.12), v / (D * 0.05) + p * 13, boil * 0.35) * pitch * 0.7;
                const x = w / 2 + u * ct - (v + j) * st;
                const y = h / 2 + u * st + (v + j) * ct;
                i === 0 ? hx.moveTo(x, y) : hx.lineTo(x, y);
              }
              hx.stroke();
            }
          });
          // keep the gesture inside the letters, and only right of the seam
          hx.globalCompositeOperation = "destination-in";
          hx.drawImage(mask.canvas, 0, 0);
          hx.globalCompositeOperation = "destination-out";
          hx.fillRect(0, 0, seamX, h);
          ctx.drawImage(hc, 0, 0);
        }

        // ── MACHINE ─────────────────────────────────────────────────────────
        if (seamX > 0) {
          const gap = Math.max(1, Math.round(cell * grid.gap));
          const scanCols = Math.floor(seamX / cell);
          const glyphs: { x: number; y: number; ch: string }[] = [];
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < Math.min(cols, scanCols); x++) {
              const cx = x * cell + cell / 2;
              const cy = y * cell + cell / 2;
              if (at(cx, cy) < 128) continue;
              // tiles compile into glyphs in noise order, not left to right
              const rank = (n(x * 0.21, y * 0.21, 50) + 1) / 2;
              if (rank < glyph * 1.15 - 0.05) {
                glyphs.push({ x: x * cell, y: y * cell, ch: ihash(seed, x, y, f >> 2) > 0.5 ? "1" : "0" });
                continue;
              }
              // the freshest column at the seam reads hot: just sampled
              const fresh = seam < 1 && scanCols - x <= 2;
              const v = n(x * 0.09, y * 0.09, f * 0.01);
              ctx.fillStyle = fresh || v > 0.25 ? color.tesseraHi : color.tessera;
              ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap);
            }
          }
          if (glyphs.length) {
            const pass = (fill: string, dx: number, alpha: number) => {
              const s0 = sprite("0", fill, cell);
              const s1 = sprite("1", fill, cell);
              ctx.globalAlpha = alpha;
              for (const g of glyphs) ctx.drawImage(g.ch === "1" ? s1 : s0, g.x + dx - 1, g.y - 1);
            };
            if (chroma > 0) {
              ctx.globalCompositeOperation = "lighter";
              pass(color.chromaB, -chroma, 0.95);
              pass(color.chromaR, chroma, 0.6);
              ctx.globalCompositeOperation = "source-over";
              pass(color.chromaG, 0, 1);
            } else {
              pass(ink, 0, 1);
            }
            ctx.globalAlpha = 1;
          }
        }

        // ── SEAM ────────────────────────────────────────────────────────────
        if (seamLine && seamX > 0 && seamX < w) {
          ctx.fillStyle = seamLine;
          ctx.fillRect(seamX, 0, Math.max(1, Math.round(stroke * 0.7)), h);
        }
      }}
    />
  );
};
