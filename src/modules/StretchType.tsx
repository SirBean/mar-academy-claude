import React from "react";
import { color, font, time } from "../system/tokens";
import { ihash } from "../system/rng";
import { snap } from "../system/timing";
import { Canvas } from "./Canvas";

/**
 * STRETCH TYPE — ref B.
 * Words fill the frame edge to edge. Every letter lives in its own cell and is
 * scaled non-uniformly to fill it. On every beat, row heights and letter
 * widths are re-dealt and snap (expo-out) to the new layout.
 *
 * `sequence[b]` = rows visible at beat b. Rows that disappear collapse to 0
 * height at the top, rows that appear grow from 0 at the bottom.
 */
export type StretchProps = {
  seed: number;
  sequence: string[][];
  beat?: number;
  ink?: string;
  /** frames for the opening scale-up from a small centred block */
  intro?: number;
  gap?: number; // px between cells
  width?: number;
  height?: number;
};

type Metric = { l: number; r: number; a: number; d: number };
const metrics = new Map<string, Metric>();
const FS = 200;
const measure = (ctx: CanvasRenderingContext2D, ch: string): Metric => {
  const hit = metrics.get(ch);
  if (hit) return hit;
  ctx.font = `900 ${FS}px "${font.display}"`;
  const m = ctx.measureText(ch);
  const out = {
    l: m.actualBoundingBoxLeft,
    r: m.actualBoundingBoxRight,
    a: m.actualBoundingBoxAscent,
    d: m.actualBoundingBoxDescent,
  };
  metrics.set(ch, out);
  return out;
};

const weights = (seed: number, row: string, beat: number) =>
  [...row].map((_, i) => 0.25 + Math.pow(ihash(seed, beat, i, row.length * 31 + row.charCodeAt(0)), 1.6) * 2.2);

const rowWeight = (seed: number, row: string, beat: number) =>
  0.35 + ihash(seed + 99, beat, row.charCodeAt(0), row.length) * 1.3;

export const StretchType: React.FC<StretchProps> = ({
  seed,
  sequence,
  beat = time.beat,
  ink = color.white,
  intro = 10,
  gap = 0,
  width,
  height,
}) => (
  <Canvas
    width={width}
    height={height}
    draw={(ctx, w, h, frame) => {
      const b = Math.min(Math.floor(frame / beat), sequence.length - 1);
      const local = frame - b * beat;
      const t = b === 0 ? 1 : snap(local, 0, time.snap + 2);
      const cur = sequence[b];
      const prev = b > 0 ? sequence[b - 1] : cur;
      const outgoing = prev.filter((r) => !cur.includes(r));
      const rows = [...outgoing, ...cur];

      // row heights (weights) tweened prev→cur
      const rw = rows.map((r) => {
        const a = prev.includes(r) ? rowWeight(seed, r, b - 1) : 0;
        const c = cur.includes(r) ? rowWeight(seed, r, b) : 0;
        return a + (c - a) * t;
      });
      const total = rw.reduce((s, x) => s + x, 0) || 1;

      // intro: whole block scales up from a small centred label
      const k = intro > 0 ? 0.14 + 0.86 * snap(frame, 0, intro) : 1;
      const bw = w * k;
      const bh = h * k;
      const bx = (w - bw) / 2;
      let y = (h - bh) / 2;

      ctx.fillStyle = ink;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.font = `900 ${FS}px "${font.display}"`;

      rows.forEach((row, ri) => {
        const rh = (rw[ri] / total) * bh;
        if (rh < 1) {
          y += rh;
          return;
        }
        const wa = weights(seed, row, b - 1);
        const wc = weights(seed, row, b);
        const lw = [...row].map((_, i) => wa[i] + (wc[i] - wa[i]) * t);
        const lt = lw.reduce((s, x) => s + x, 0);
        let x = bx;
        [...row].forEach((ch, i) => {
          const cw = (lw[i] / lt) * bw;
          if (ch !== " ") {
            const m = measure(ctx, ch);
            const gw = m.l + m.r;
            const gh = m.a + m.d;
            const sx = Math.max(0.0001, (cw - gap) / gw);
            const sy = Math.max(0.0001, (rh - gap) / gh);
            ctx.setTransform(sx, 0, 0, sy, x + gap / 2 + m.l * sx, y + gap / 2 + m.a * sy);
            ctx.fillText(ch, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
          x += cw;
        });
        y += rh;
      });
    }}
  />
);
