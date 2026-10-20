import React from "react";
import { color } from "../system/tokens";
import { noise3, rand } from "../system/rng";
import { stepped } from "../system/timing";
import { Canvas } from "./Canvas";

/**
 * WAVE LINES — ref D (middle column).
 * Bands of 1–5 thin noise curves stacked vertically, white hairline stroke.
 * Bands breathe in amplitude independently.
 */
export type WaveProps = {
  seed: number;
  bands?: number;
  stroke?: number;
  ink?: string;
  width?: number;
  height?: number;
  speed?: number;
};

export const WaveLines: React.FC<WaveProps> = ({
  seed,
  bands = 12,
  stroke = 1.6,
  ink = color.white,
  width,
  height,
  speed = 0.02,
}) => {
  const n = noise3(`wave-${seed}`);
  return (
    <Canvas
      width={width}
      height={height}
      draw={(ctx, w, h, frame) => {
        const f = stepped(frame);
        const bandH = h / bands;
        ctx.strokeStyle = ink;
        ctx.lineWidth = stroke;
        ctx.lineJoin = "round";
        for (let b = 0; b < bands; b++) {
          const lines = 1 + Math.floor(rand(seed, "lines", b) * 5);
          const cy = bandH * (b + 0.5);
          const breathe = 0.35 + 0.65 * ((n(b * 3.1, 0, f * speed * 0.5) + 1) / 2);
          for (let l = 0; l < lines; l++) {
            ctx.beginPath();
            const freq = 1.2 + rand(seed, "freq", b, l) * 2.2;
            for (let i = 0; i <= 120; i++) {
              const x = (i / 120) * w;
              const y =
                cy +
                n((i / 120) * freq, b * 7 + l * 1.7, f * speed) * bandH * 0.42 * breathe;
              i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        }
      }}
    />
  );
};
