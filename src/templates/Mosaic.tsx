import React from "react";
import { AbsoluteFill } from "remotion";
import { Frame, Label } from "../modules/Frame";
import { GlyphField } from "../modules/GlyphField";
import { TesseraField } from "../modules/TesseraField";
import { WaveLines } from "../modules/WaveLines";
import { BaseProps } from "../system/schema";
import { color, ground } from "../system/tokens";
import { prng } from "../system/rng";
import { Layout } from "../system/formats";

/**
 * MOSAIC — ref D. Three generative strips side by side
 * (glyph scatter · wave lines · tessera field) + one tiny credit line.
 * Column order and parameters come from the seed.
 */
export const MOSAIC_FRAMES = 180;

type Kind = "glyph" | "wave" | "tessera";

export const Column: React.FC<{ kind: Kind; seed: number; w: number; h: number; l: Layout; ink: string }> = ({
  kind,
  seed,
  w,
  h,
  l,
  ink,
}) => {
  if (kind === "glyph")
    return <GlyphField mode="scatter" seed={seed} size={Math.round(l.s * 0.016)} density={0.42} width={w} height={h} ink={ink} />;
  if (kind === "wave")
    return <WaveLines seed={seed} bands={l.portrait ? 11 : 6} stroke={Math.max(1.2, l.s / 700)} width={w} height={h} ink={ink} />;
  return <TesseraField seed={seed} cell={l.cell} width={w} height={h} threshold={0.05} />;
};

export const Mosaic: React.FC<BaseProps> = ({ seed, ground: g, edition }) => {
  const ink = ground[g].ink;
  const r = prng(`mosaic-${seed}`);
  const kinds: Kind[] = ["glyph", "wave", "tessera"].sort(() => r() - 0.5) as Kind[];
  // keep the ref order on seed 1 so the default matches the reference exactly
  const order: Kind[] = seed === 1 ? ["glyph", "wave", "tessera"] : kinds;
  return (
    <Frame ground={g}>
      {(l) => {
        const colW = Math.floor(l.width / 3);
        return (
          <>
            {order.map((k, i) => (
              <div key={k} style={{ position: "absolute", left: i * colW, top: 0, width: colW, height: l.height }}>
                <Column kind={k} seed={seed + i * 101} w={colW} h={l.height} l={l} ink={ink} />
              </div>
            ))}
            <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: l.margin }}>
              <Label size={l.type("label")} color={color.white}>
                {edition.name}
              </Label>
            </AbsoluteFill>
          </>
        );
      }}
    </Frame>
  );
};
