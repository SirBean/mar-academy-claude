import React from "react";
import { color, grid } from "../system/tokens";
import { fbm3, noise3 } from "../system/rng";
import { stepped } from "../system/timing";
import { Canvas } from "./Canvas";

/**
 * TESSERA FIELD — ref D (right column).
 * A noise field thresholded onto a square cell grid. Each filled cell is a
 * tessera. This is the identity's core metaphor: mosaic tile = pixel.
 */
export type TesseraProps = {
  seed: number;
  cell: number; // px
  threshold?: number; // -1..1, higher = fewer tiles
  scale?: number; // noise zoom (cells per noise unit)
  speed?: number; // noise travel per frame
  drift?: [number, number]; // cells per frame scroll
  ink?: string;
  inkHi?: string;
  width?: number;
  height?: number;
  /** 0..1 reveal: tiles appear in noise order, not left to right. */
  reveal?: number;
};

export const TesseraField: React.FC<TesseraProps> = ({
  seed,
  cell,
  threshold = 0.08,
  scale = 22,
  speed = 0.012,
  drift = [0, -0.18],
  ink = color.tessera,
  inkHi = color.tesseraHi,
  width,
  height,
  reveal = 1,
}) => {
  const n = noise3(`tessera-${seed}`);
  const gap = Math.max(1, Math.round(cell * grid.gap));
  return (
    <Canvas
      width={width}
      height={height}
      draw={(ctx, w, h, frame) => {
        const f = stepped(frame);
        const cols = Math.ceil(w / cell);
        const rows = Math.ceil(h / cell);
        const ox = f * drift[0];
        const oy = f * drift[1];
        const z = f * speed;
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const v = fbm3(n, (x + ox) / scale, (y + oy) / scale, z, 3);
            if (v < threshold) continue;
            // reveal gate: tile's own noise rank vs progress
            if (reveal < 1) {
              const r = (n(x * 0.37, y * 0.37, 99) + 1) / 2;
              if (r > reveal) continue;
            }
            ctx.fillStyle = v > threshold + 0.22 ? inkHi : ink;
            ctx.fillRect(x * cell, y * cell, cell - gap, cell - gap);
          }
        }
      }}
    />
  );
};
