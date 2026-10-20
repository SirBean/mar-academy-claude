import { Easing, interpolate } from "remotion";
import { time } from "./tokens";

/** Quantise a frame to "twos" (or any step). Generative layers must use this. */
export const stepped = (frame: number, step: number = time.step) =>
  Math.floor(frame / step) * step;

/** Beat index and progress inside the beat. */
export const beatOf = (frame: number, beat: number = time.beat) => ({
  index: Math.floor(frame / beat),
  local: frame % beat,
});

/** The ONLY easing used for motion that travels (camera, cell resize). */
export const snapEase = Easing.bezier(0.16, 1, 0.3, 1); // expo-out

/** 0→1 over `dur` frames starting at `start`, expo-out, clamped. */
export const snap = (frame: number, start: number, dur: number = time.snap) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    easing: snapEase,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** Typewriter: how many characters are visible at `frame`. */
export const typed = (frame: number, start: number, cps: number = time.typeCps) =>
  Math.max(0, Math.floor((frame - start) * cps));

/** Cursor blink, hard on/off every 8 frames (terminal behaviour). */
export const cursorOn = (frame: number) => Math.floor(frame / 8) % 2 === 0;

/** Visible inside [from, to) — hard cuts, no fades. */
export const live = (frame: number, from: number, to: number) => frame >= from && frame < to;
