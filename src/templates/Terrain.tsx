import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { DitherTerrain } from "../modules/DitherTerrain";
import { Frame, Label } from "../modules/Frame";
import { BaseProps } from "../system/schema";
import { ground } from "../system/tokens";

/**
 * TERRAIN — ref E. A 1-bit dithered landscape on paper ground: the tile sits
 * small in the centre, rises, the camera dives in and it disintegrates.
 */
export const TERRAIN_FRAMES = 210;

export const Terrain: React.FC<BaseProps> = ({ seed, edition: e }) => {
  const frame = useCurrentFrame();
  const g = "paper"; // this template is always on paper, like the reference
  const ease = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const rise = interpolate(frame, [10, 80], [0, 1], ease);
  const dolly = interpolate(frame, [30, 200], [0, 1], ease);
  const burst = interpolate(frame, [70, 200], [0, 1], { ...ease, easing: Easing.in(Easing.quad) });
  return (
    <Frame ground={g}>
      {(l) => (
        <>
          <DitherTerrain seed={seed} dolly={dolly} rise={rise} burst={burst} ink={ground[g].ink} />
          <AbsoluteFill style={{ padding: l.margin, justifyContent: "space-between", flexDirection: "row" }}>
            {/* labels sit in ground-coloured slots so particles never cross text (STYLE §4) */}
            <div style={{ alignSelf: "flex-start", background: ground[g].bg, padding: l.cell }}>
              <Label size={l.type("label")} color={ground[g].ink}>
                {`${e.short} ${e.product}\n${e.year}`}
              </Label>
            </div>
            <div style={{ alignSelf: "flex-start", background: ground[g].bg, padding: l.cell }}>
              <Label size={l.type("label")} color={ground[g].ink} style={{ textAlign: "right" }}>
                {e.pillars.join("\n")}
              </Label>
            </div>
          </AbsoluteFill>
        </>
      )}
    </Frame>
  );
};
