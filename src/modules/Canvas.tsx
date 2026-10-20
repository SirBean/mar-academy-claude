import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, frame: number) => void;

/**
 * Generic per-frame canvas layer. The draw function must be PURE in
 * (frame, props): no state carried between frames, so any frame can be
 * rendered in isolation by any parallel tab.
 */
export const Canvas: React.FC<{
  draw: DrawFn;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  blend?: React.CSSProperties["mixBlendMode"];
}> = ({ draw, width, height, style, blend }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useCurrentFrame();
  const cfg = useVideoConfig();
  const w = width ?? cfg.width;
  const h = height ?? cfg.height;

  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d", { alpha: true })!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    draw(ctx, w, h, frame);
  });

  return (
    <AbsoluteFill style={{ mixBlendMode: blend, ...style }}>
      <canvas ref={ref} width={w} height={h} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};
