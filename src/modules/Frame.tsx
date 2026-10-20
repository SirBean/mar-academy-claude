import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useFonts } from "../system/fonts";
import { layout, Layout } from "../system/formats";
import { font, Ground, ground } from "../system/tokens";

/** Root of every template: ground colour, font gate, layout context. */
export const Frame: React.FC<{
  ground: Ground;
  children: (l: Layout) => React.ReactNode;
}> = ({ ground: g, children }) => {
  const ready = useFonts();
  const { width, height } = useVideoConfig();
  const l = layout(width, height);
  return (
    <AbsoluteFill style={{ background: ground[g].bg, color: ground[g].ink, overflow: "hidden" }}>
      {ready ? children(l) : null}
    </AbsoluteFill>
  );
};

/** Small uppercase label set in the display face (ref B footer, ref D credit). */
export const Label: React.FC<{
  children: React.ReactNode;
  size: number;
  style?: React.CSSProperties;
  color?: string;
}> = ({ children, size, style, color }) => (
  <div
    style={{
      fontFamily: `"${font.display}"`,
      fontWeight: 900,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: "-0.01em",
      textTransform: "uppercase",
      whiteSpace: "pre",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);
