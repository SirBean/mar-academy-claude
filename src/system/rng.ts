/**
 * Deterministic randomness. NEVER use Math.random() in this repo:
 * Remotion renders frames in parallel tabs, so every value must be a pure
 * function of (seed, frame, index). Same seed → identical video, always.
 */
import { createNoise2D, createNoise3D } from "simplex-noise";

export const hash = (input: string | number): number => {
  const str = String(input);
  let h = 2166136261 >>> 0; // FNV-1a
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** mulberry32 PRNG — fast, good enough, deterministic. */
export const prng = (seed: string | number) => {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Fast numeric hash → [0,1). Use in hot loops (per point / per cell). */
export const ihash = (a: number, b = 0, c = 0, d = 0): number => {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1);
  h = Math.imul(h ^ (c | 0), 0x9e3779b1) ^ Math.imul(d | 0, 0x85ebca6b);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
};

/** Stateless random value for a key (like remotion's random()). */
export const rand = (...key: (string | number)[]) => prng(key.join(":"))();

export const pick = <T,>(arr: readonly T[], ...key: (string | number)[]): T =>
  arr[Math.floor(rand(...key) * arr.length) % arr.length];

export const range = (min: number, max: number, ...key: (string | number)[]) =>
  min + rand(...key) * (max - min);

/** Seeded simplex noise. Cache instances per seed — creation is the expensive part. */
const cache2 = new Map<string, ReturnType<typeof createNoise2D>>();
const cache3 = new Map<string, ReturnType<typeof createNoise3D>>();

export const noise2 = (seed: string | number) => {
  const k = String(seed);
  if (!cache2.has(k)) cache2.set(k, createNoise2D(prng(k)));
  return cache2.get(k)!;
};
export const noise3 = (seed: string | number) => {
  const k = String(seed);
  if (!cache3.has(k)) cache3.set(k, createNoise3D(prng(k)));
  return cache3.get(k)!;
};

/** Fractal brownian motion, output roughly in [-1, 1]. */
export const fbm3 = (
  n: ReturnType<typeof createNoise3D>,
  x: number,
  y: number,
  z: number,
  octaves = 4,
) => {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * n(x * freq, y * freq, z * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
};
