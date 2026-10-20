/**
 * MAR ACADEMY — DESIGN TOKENS
 * Single source of truth. Values were measured from the reference material
 * (see STYLE.md §2). Change them here and every template follows.
 */

// ── Colour ──────────────────────────────────────────────────────────────────
export const color = {
  // Grounds
  black: "#000000", // night ground (refs A, B, C, D)
  paper: "#CDCDCD", // paper ground (ref E, measured)
  // Inks
  white: "#F2F1F2", // primary ink on black (ref A, measured)
  grey: "#949494", // secondary text, labels (ref A "bodySecondary")
  dim: "#363436", // hairlines, measure frames, grid
  tessera: "#9C9C9C", // filled cell grey (ref D, measured)
  tesseraHi: "#D3D3D3",
  // Accents — syntax colours (ref A, measured). Max ONE accent per word.
  blue: "#328FF2",
  green: "#54CA31",
  orange: "#FF7B00",
  // Chromatic split for glyph renders (ref C)
  chromaR: "#FF2A3A",
  chromaG: "#DDF7E6",
  chromaB: "#2A3BFF",
} as const;

export type Accent = "blue" | "green" | "orange";
export const ACCENTS: Accent[] = ["blue", "green", "orange"];

export type Ground = "night" | "paper";
export const ground = {
  night: { bg: color.black, ink: color.white, mute: color.grey, line: color.dim },
  paper: { bg: color.paper, ink: color.black, mute: "#5A5A5A", line: "#A8A8A8" },
} as const;

// ── Type ────────────────────────────────────────────────────────────────────
export const font = {
  sans: "Geist Sans", // ref A voice: neutral grotesk, code-like
  mono: "Geist Mono", // glyph fields, data, labels
  display: "Archivo", // ref B stretch type, used at 900 only
} as const;

/** Type scale as a fraction of the SHORT side of the frame (format-agnostic). */
export const typeScale = {
  micro: 0.011, // "// comments", measure numbers
  label: 0.018, // code body, footers
  body: 0.03,
  title: 0.056, // bracket title, speaker names
  hero: 0.11, // city / statement lists
} as const;

export const tracking = {
  sans: "-0.01em",
  display: "-0.02em",
  mono: "0em",
} as const;

// ── Grid ────────────────────────────────────────────────────────────────────
/** Everything snaps to a cell grid: one cell = one tessera = one pixel = one glyph. */
export const grid = {
  margin: 0.04, // outer margin, fraction of short side
  columns: 12,
  cell: 0.0075, // base tessera size, fraction of short side (~8px @1080)
  gap: 0.22, // gap between tesserae, fraction of cell
} as const;

// ── Time ────────────────────────────────────────────────────────────────────
export const time = {
  fps: 30,
  beat: 15, // 0.5 s — measured cut rhythm in ref B (≈120 BPM)
  bar: 60, // 4 beats
  step: 2, // generative layers update "on twos" (stepped, never smooth)
  typeCps: 2, // typewriter: characters per frame
  snap: 4, // duration of a snap transition (frames)
  hold: 45, // minimum readable hold for a text card
} as const;
