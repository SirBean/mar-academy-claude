import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Comment } from "../modules/Code";
import { Frame } from "../modules/Frame";
import { GlyphField } from "../modules/GlyphField";
import { BaseProps } from "../system/schema";

/**
 * SIGNAL — ref C. A letterform made of 0/1 glyphs with RGB split and glow,
 * pushing in like a camera toward a CRT.
 */
export const SIGNAL_FRAMES = 150;

export const Signal: React.FC<BaseProps & { source?: string }> = ({ seed, edition: e, source }) => {
  const frame = useCurrentFrame();
  const zoom = interpolate(frame, [0, 120], [1, 2.6], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateRight: "clamp",
  });
  return (
    <Frame ground="night">
      {(l) => (
        <>
          <GlyphField
            mode="raster"
            seed={seed}
            source={source ?? e.product.charAt(0)}
            size={Math.round(l.s * 0.014)}
            zoom={zoom}
            chroma={Math.max(1, l.s * 0.0018)}
            glow={l.s * 0.004}
          />
          <AbsoluteFill style={{ padding: l.margin, justifyContent: "flex-end" }}>
            <Comment text={`// ${e.short.toLowerCase()}.${e.product.toLowerCase()}.render(${e.year})`} size={l.type("micro") * 1.4} />
          </AbsoluteFill>
        </>
      )}
    </Frame>
  );
};
