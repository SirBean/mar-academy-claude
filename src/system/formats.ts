import { grid, typeScale } from "./tokens";

export const FORMATS = {
  story: { width: 1080, height: 1920, label: "9:16 Reel / Story / Shorts" },
  post: { width: 1080, height: 1350, label: "4:5 Feed post" },
  square: { width: 1080, height: 1080, label: "1:1" },
  wide: { width: 1920, height: 1080, label: "16:9 YouTube / screens" },
} as const;

export type FormatId = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

/** Layout helpers derived from the frame size. All sizes are short-side relative. */
export const layout = (width: number, height: number) => {
  const s = Math.min(width, height);
  const portrait = height > width;
  return {
    width,
    height,
    s,
    portrait,
    margin: Math.round(s * grid.margin),
    cell: Math.max(4, Math.round(s * grid.cell)),
    type: (k: keyof typeof typeScale) => Math.round(s * typeScale[k]),
  };
};

export type Layout = ReturnType<typeof layout>;
