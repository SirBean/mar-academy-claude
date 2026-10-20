import React from "react";
import { color, font } from "../system/tokens";
import { ihash, noise3 } from "../system/rng";
import { stepped } from "../system/timing";
import { Canvas } from "./Canvas";

/**
 * GLYPH FIELD — refs C + D (left column).
 *  mode "raster":  a word/letter rasterised into a grid of 0/1 glyphs, with
 *                  chromatic split + CRT glow (ref C).
 *  mode "scatter": sparse field of tiny marks — dashes, arcs, dots (ref D).
 */
export type GlyphProps = {
  seed: number;
  mode: "raster" | "scatter";
  /** raster: what to draw (1–4 chars reads best). */
  source?: string;
  /** glyph height in px at zoom 1 */
  size: number;
  zoom?: number; // raster camera zoom around centre
  chroma?: number; // px of RGB split (0 = off)
  glow?: number; // px blur of glow pass (0 = off)
  density?: number; // scatter: 0..1
  fill?: number; // raster: share of the grid the form occupies at zoom 1
  ink?: string;
  width?: number;
  height?: number;
};

const SCATTER = ["‿", "⌒", "–", "-", "_", "·", "~", "‿", "⁀", "(", ")", "∩", "∪", "°", "˘"];

const atlas = new Map<string, HTMLCanvasElement>();
let glowC: HTMLCanvasElement | null = null;
const glowCanvas = (w: number, h: number) => {
  if (!glowC) glowC = document.createElement("canvas");
  if (glowC.width !== w || glowC.height !== h) {
    glowC.width = w;
    glowC.height = h;
  }
  return glowC;
};

// Offscreen mask cache: one rasterised source per (text, cols, rows).
const masks = new Map<string, Uint8Array>();
const getMask = (text: string, cols: number, rows: number, fill: number) => {
  const key = `${text}|${cols}|${rows}|${fill}`;
  const hit = masks.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  // A glyph cell is ~1.7× taller than wide on screen, so in mask space the
  // text is stretched horizontally by CELL_ASPECT to keep true proportions.
  const CELL_ASPECT = 1.05 / 0.62;
  const fs = 100;
  ctx.font = `900 ${fs}px "${font.display}"`;
  const m = ctx.measureText(text);
  const capH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const sy = Math.min((cols * fill) / (m.width * CELL_ASPECT), (rows * fill) / capH);
  const sx = sy * CELL_ASPECT;
  ctx.setTransform(sx, 0, 0, sy, cols / 2, rows / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  ctx.fillText(text, 0, (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  const data = ctx.getImageData(0, 0, cols, rows).data;
  const out = new Uint8Array(cols * rows);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 4 + 3] > 110 ? 1 : 0;
  masks.set(key, out);
  return out;
};

export const GlyphField: React.FC<GlyphProps> = ({
  seed,
  mode,
  source = "A",
  size,
  zoom = 1,
  chroma = 0,
  glow = 0,
  density = 0.35,
  fill = 0.36,
  ink = color.white,
  width,
  height,
}) => {
  const n = noise3(`glyph-${seed}`);
  return (
    <Canvas
      width={width}
      height={height}
      draw={(ctx, w, h, frame) => {
        const f = stepped(frame);
        if (mode === "scatter") {
          const cw = size * 0.9;
          const ch = size * 1.5;
          const cols = Math.ceil(w / cw);
          const rows = Math.ceil(h / ch);
          ctx.font = `400 ${size}px "${font.mono}"`;
          ctx.fillStyle = ink;
          ctx.textBaseline = "top";
          for (let y = 0; y < rows; y++) {
            // rows switch on/off in bands, like scanlines of a terminal
            const band = (n(0, y * 0.21, f * 0.03) + 1) / 2;
            for (let x = 0; x < cols; x++) {
              const v = (n(x * 0.18, y * 0.18, f * 0.05) + 1) / 2;
              if (band < 0.32) continue; // blank scanline rows
              if (v < 1 - density * 1.5) continue;
              if (ihash(seed, x, y, f) > 0.75) continue; // flicker
              const g = SCATTER[Math.floor(ihash(seed + 7, x, y, Math.floor(f / 6)) * SCATTER.length)];
              ctx.fillText(g, x * cw, y * ch);
            }
          }
          return;
        }

        // ── raster mode ──
        const gh = size * zoom; // glyph height on screen
        const gw = gh * 0.62;
        const lh = gh * 1.05;
        // grid resolution is FIXED (at zoom 1) so zooming is a camera move
        const cols = Math.floor(w / (size * 0.62));
        const rows = Math.floor(h / (size * 1.05));
        const mask = getMask(source, cols, rows, fill);
        const x0 = w / 2 - (cols * gw) / 2;
        const y0 = h / 2 - (rows * lh) / 2;
        // per-row horizontal extent of the form
        const rowMin = new Int32Array(rows).fill(-1);
        const rowMax = new Int32Array(rows).fill(-1);
        const rowReach = new Int32Array(rows).fill(-1);
        for (let y = 0; y < rows; y++)
          for (let x = 0; x < cols; x++)
            if (mask[y * cols + x]) {
              if (rowMin[y] < 0) rowMin[y] = x;
              rowMax[y] = x;
              rowReach[y] = 1;
            }
        type G = { x: number; y: number; ch: string; a: number };
        const glyphs: G[] = [];
        for (let y = 0; y < rows; y++) {
          const py = y0 + y * lh;
          if (py < -lh || py > h) continue;
          for (let x = 0; x < cols; x++) {
            const px = x0 + x * gw;
            if (px < -gw || px > w) continue;
            const inside = mask[y * cols + x] === 1;
            const r = ihash(seed, x, y, Math.floor(f / 4));
            if (inside) {
              if (r < 0.03) continue; // dropouts
              glyphs.push({ x: px, y: py, ch: r > 0.95 ? "1" : "0", a: 1 });
            } else {
              // strays: only on rows the form occupies, within reach of it (ref C:
              // bits leak sideways out of the letter like a signal error)
              const reach = rowReach[y];
              if (reach < 0) continue;
              const dist = Math.min(Math.abs(x - rowMin[y]), Math.abs(x - rowMax[y]));
              if (x > rowMin[y] && x < rowMax[y]) continue;
              const v = n(x * 0.25, y * 0.9, f * 0.05);
              if (dist < cols * 0.18 && v > 0.25 + dist / (cols * 0.25) && r > 0.35)
                glyphs.push({ x: px, y: py, ch: r > 0.85 ? "1" : "0", a: 0.55 });
            }
          }
        }

        // Glyph atlas: each (char, colour, size) is rasterised once, then blitted.
        const sprite = (ch: string, fill: string) => {
          const key = `${ch}|${fill}|${gh.toFixed(1)}`;
          let c = atlas.get(key);
          if (!c) {
            c = document.createElement("canvas");
            c.width = Math.ceil(gw + 2);
            c.height = Math.ceil(lh + 2);
            const a = c.getContext("2d")!;
            a.font = `700 ${gh}px "${font.mono}"`;
            a.textBaseline = "top";
            a.fillStyle = fill;
            a.fillText(ch, 1, 1);
            if (atlas.size > 400) atlas.clear();
            atlas.set(key, c);
          }
          return c;
        };
        const pass = (fill: string, dx: number, alpha: number) => {
          const s0 = sprite("0", fill);
          const s1 = sprite("1", fill);
          for (const g of glyphs) {
            ctx.globalAlpha = alpha * g.a;
            ctx.drawImage(g.ch === "1" ? s1 : s0, g.x + dx - 1, g.y - 1);
          }
        };

        ctx.globalCompositeOperation = "lighter";
        if (glow > 0) {
          // cheap bloom: draw blocks at 1/8 resolution, upscale with smoothing
          const k = 8;
          const gc = glowCanvas(Math.ceil(w / k), Math.ceil(h / k));
          const gx = gc.getContext("2d")!;
          gx.clearRect(0, 0, gc.width, gc.height);
          gx.fillStyle = color.chromaB;
          for (const g of glyphs) {
            gx.globalAlpha = 0.5 * g.a;
            gx.fillRect(g.x / k, g.y / k, gw / k, lh / k);
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.globalAlpha = Math.min(1, glow / 4);
          ctx.drawImage(gc, -k, -k, w + 2 * k, h + 2 * k);
          ctx.imageSmoothingEnabled = false;
        }
        if (chroma > 0) {
          const d = chroma * zoom;
          pass(color.chromaB, -d, 0.95);
          pass(color.chromaR, d, 0.6);
          ctx.globalCompositeOperation = "source-over"; // core stays crisp, not washed
          pass(color.chromaG, 0, 1);
        } else {
          pass(ink, 0, 1);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }}
    />
  );
};
