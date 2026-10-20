import React from "react";
import { color } from "../system/tokens";
import { fbm3, ihash, noise3 } from "../system/rng";
import { stepped } from "../system/timing";
import { Canvas } from "./Canvas";

/**
 * DITHER TERRAIN — ref E.
 * A noise heightmap sampled as a point grid, projected in 3D and shaded with
 * 1-bit stochastic dithering (a dot is drawn or not — no greys).
 * `burst` (0..1) disintegrates the surface into a rising particle cloud.
 */
export type TerrainProps = {
  seed: number;
  /** points per side — 220 ≈ 48k points */
  res?: number;
  /** 0..1 camera dolly (0 = far tile, 1 = inside the surface) */
  dolly: number;
  /** 0..1 height growth */
  rise: number;
  /** 0..1 disintegration */
  burst: number;
  /** camera pitch in degrees */
  pitch?: number;
  ink?: string;
  dot?: number;
  width?: number;
  height?: number;
};

export const DitherTerrain: React.FC<TerrainProps> = ({
  seed,
  res = 320,
  dolly,
  rise,
  burst,
  pitch = 32,
  ink = color.black,
  dot,
  width,
  height,
}) => {
  const n = noise3(`terrain-${seed}`);
  return (
    <Canvas
      width={width}
      height={height}
      draw={(ctx, w, h, frame) => {
        const f = stepped(frame);
        const s = Math.min(w, h);
        const d = dot ?? Math.max(1, Math.round(s / 540));
        const N = res;
        // height field
        const H = new Float32Array(N * N);
        const amp = 0.05 + 0.2 * rise;
        for (let j = 0; j < N; j++) {
          for (let i = 0; i < N; i++) {
            const u = i / (N - 1) - 0.5;
            const v = j / (N - 1) - 0.5;
            let y = fbm3(n, u * 1.9, v * 1.9, seed * 0.13, 4);
            // radial striations fanning from the front edge (ref E, frame 1)
            const ang = Math.atan2(v - 0.5, u);
            y += 0.06 * Math.sin(ang * 140) * Math.max(0, 0.35 - Math.hypot(u, v - 0.5));
            H[j * N + i] = y * amp;
          }
        }
        const pr = (pitch * Math.PI) / 180;
        const cp = Math.cos(pr);
        const sp = Math.sin(pr);
        const dist = 2.6 - 2.05 * dolly; // camera distance
        const focal = s * 1.05;
        const lx = -0.5, ly = 0.8, lz = -0.3; // light
        const ll = Math.hypot(lx, ly, lz);
        ctx.fillStyle = ink;
        for (let j = 1; j < N - 1; j++) {
          for (let i = 1; i < N - 1; i++) {
            const k = j * N + i;
            const u = i / (N - 1) - 0.5;
            const v = j / (N - 1) - 0.5;
            let y = H[k];
            // normal via central differences → lambert
            const dx = (H[k + 1] - H[k - 1]) * N * 0.5;
            const dz = (H[k + N] - H[k - N]) * N * 0.5;
            const nl = Math.hypot(dx, 1, dz);
            let lum = (-dx * lx + ly - dz * lz) / (nl * ll);
            lum = Math.min(1, Math.max(0, lum * 0.9 + (y / amp) * 0.25 + 0.05));
            // disintegration: points lift and spread, edges first
            let px = u, pz = v;
            if (burst > 0) {
              const r1 = ihash(seed, i, j);
              const edge = Math.max(Math.abs(u), Math.abs(v)) * 2; // 0 centre → 1 edge
              const t = Math.max(0, burst * 1.6 - (1 - edge) * 0.6 - r1 * 0.4);
              if (t > 0) {
                y += t * t * (0.18 + r1 * 0.5);
                px += (ihash(seed, i, j, 1) - 0.5) * t * 0.9 + n(u * 3, v * 3, f * 0.02) * t * 0.15;
                pz += (ihash(seed, i, j, 2) - 0.5) * t * 0.7;
                lum = Math.min(1, lum + t * 0.35); // particles thin out
              }
            }
            // stochastic 1-bit dither: dark → dot
            if (ihash(seed, i, j, f >> 2) < lum) continue;
            // camera: rotate around X, translate along view
            const cy = y * cp - pz * sp;
            const cz = y * sp + pz * cp + dist;
            if (cz <= 0.05) continue;
            const sx = w / 2 + (px * focal) / cz;
            const sy = h / 2 - (cy * focal) / cz + s * 0.04;
            if (sx < 0 || sy < 0 || sx > w || sy > h) continue;
            // dots grow as the camera gets close, so the surface never thins out
            const ds = Math.round(d * Math.min(2.5, Math.max(1, 1.8 / cz)));
            ctx.fillRect(sx | 0, sy | 0, ds, ds);
          }
        }
      }}
    />
  );
};
