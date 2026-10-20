import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { BracketTitle, Comment, Token, Tokens } from "../modules/Code";
import { Frame } from "../modules/Frame";
import { SeamMark } from "../modules/SeamMark";
import { StretchType } from "../modules/StretchType";
import { titleNodes } from "./Boot";
import { BaseProps } from "../system/schema";
import { Layout } from "../system/formats";
import { color, ground, time } from "../system/tokens";
import { snap, stepped } from "../system/timing";

/**
 * IDENTITY — the hero film. Hand × machine, told by one seam.
 * 0–90    GESTURE   the mark is drawn by hand, hatched hairline
 * 90–165  SAMPLE    the seam scans across: the hand becomes tesserae
 * 165–225 COMPILE   tesserae compile into 0/1 glyphs (chroma split)
 * 225–285 DIALOGUE  stretch type, one pair per beat: ART / CODE / HAND / MACHINE
 * 285–360 LOCKUP    the split mark at rest + bracket title + url
 */
export const IDENTITY_FRAMES = 360;

const ACT = {
  gesture: [0, 90],
  sample: [90, 165],
  compile: [165, 225],
  dialogue: [225, 285],
  lockup: [285, 360],
} as const;

/** The mark box: wide and short, snapped to the cell grid. */
const markBox = (l: Layout, cell: number) => {
  const snapPx = (v: number) => Math.floor(v / cell) * cell;
  // 9:16, 4:5 and 1:1 use the full width; only 16:9 leaves air at the sides
  const w = snapPx(l.width / l.height < 1.3 ? l.width - l.margin * 2 : l.width * 0.62);
  const h = snapPx(l.portrait ? Math.min(w * 0.8, l.height * 0.44) : Math.min(w * 0.5, l.height * 0.46));
  return { w, h, x: Math.round((l.width - w) / 2), y: Math.round((l.height - h) / 2 - (l.portrait ? l.height * 0.04 : l.height * 0.06)) };
};

const Mark: React.FC<{
  l: Layout;
  seed: number;
  text: string;
  seam: number;
  draw?: number;
  glyph?: number;
  chroma?: number;
  ink: string;
}> = ({ l, seed, text, ink, ...rest }) => {
  const cell = l.cell * 2;
  const b = markBox(l, cell);
  return (
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w, height: b.h }}>
      <SeamMark seed={seed} text={text} cell={cell} width={b.w} height={b.h} stroke={Math.max(1.2, l.s / 600)} ink={ink} seamLine={color.dim} {...rest} />
    </div>
  );
};

/** Act header: `// 01 gesture` top left, seam readout top right. */
const Header: React.FC<{ l: Layout; act: string; readout?: string }> = ({ l, act, readout }) => (
  <AbsoluteFill style={{ padding: l.margin, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
    <Comment text={act} size={l.type("label")} />
    {readout ? <Comment text={readout} size={l.type("label")} /> : null}
  </AbsoluteFill>
);

/** A typed code line under the mark. */
const Line: React.FC<{ l: Layout; tokens: Token[]; start: number; ink: string }> = ({ l, tokens, start, ink }) => {
  const frame = useCurrentFrame();
  const b = markBox(l, l.cell * 2);
  return (
    <div style={{ position: "absolute", left: b.x, top: b.y + b.h + l.type("title") }}>
      <Tokens tokens={tokens} count={Math.max(0, (frame - start) * time.typeCps)} size={l.type("title")} ink={ink} cursor />
    </div>
  );
};

export const Identity: React.FC<BaseProps> = ({ seed, edition: e, ground: g, accent }) => {
  const frame = useCurrentFrame();
  const ink = ground[g].ink;
  const text = e.short;
  return (
    <Frame ground={g}>
      {(l) => {
        // SAMPLE: the seam advances in 8 machine steps, each one a snap
        const sampleSeam = (f: number) => {
          const every = 7;
          const k = Math.floor((f - 6) / every);
          if (k < 0) return 0;
          if (k >= 8) return 1;
          return (k + snap(f - 6, k * every)) / 8;
        };
        const local = (a: readonly [number, number]) => frame - a[0];
        const pairs = [...e.dialogue, [e.short, e.year]];
        return (
          <>
            {/* 1 — gesture */}
            <Sequence from={ACT.gesture[0]} durationInFrames={ACT.gesture[1] - ACT.gesture[0]} layout="none">
              <Mark l={l} seed={seed} text={text} seam={0} ink={ink} draw={interpolate(stepped(local(ACT.gesture)), [4, 78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
              <Header l={l} act="// 01 gesture" readout={`hand ${Math.min(100, Math.round(((local(ACT.gesture) - 4) / 74) * 100)).toString().padStart(3, " ")}%`} />
              <Line l={l} start={10} ink={ink} tokens={[{ t: "hand.", c: "white" }, { t: "draw", c: "blue" }, { t: "(", c: "white" }, { t: `"${text}"`, c: "orange" }, { t: ");", c: "white" }]} />
            </Sequence>

            {/* 2 — sample */}
            <Sequence from={ACT.sample[0]} durationInFrames={ACT.sample[1] - ACT.sample[0]} layout="none">
              <Mark l={l} seed={seed} text={text} seam={sampleSeam(local(ACT.sample))} ink={ink} />
              <Header l={l} act="// 02 sample" readout={`seam x=${sampleSeam(local(ACT.sample)).toFixed(2)}`} />
              <Line l={l} start={4} ink={ink} tokens={[{ t: "machine.", c: "white" }, { t: "sample", c: "blue" }, { t: "(", c: "white" }, { t: "hand", c: "green" }, { t: ");", c: "white" }]} />
            </Sequence>

            {/* 3 — compile */}
            <Sequence from={ACT.compile[0]} durationInFrames={ACT.compile[1] - ACT.compile[0]} layout="none">
              <Mark l={l} seed={seed} text={text} seam={1} ink={ink} glyph={interpolate(stepped(local(ACT.compile)), [4, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} chroma={Math.max(1, l.s * 0.0018)} />
              <Header l={l} act="// 03 compile" readout="tessera = pixel = glyph" />
              <Line l={l} start={4} ink={ink} tokens={[{ t: "const ", c: "blue" }, { t: "art", c: "white" }, { t: " = ", c: "white" }, { t: "code", c: "orange" }, { t: ";", c: "white" }]} />
            </Sequence>

            {/* 4 — dialogue */}
            <Sequence from={ACT.dialogue[0]} durationInFrames={ACT.dialogue[1] - ACT.dialogue[0]} layout="none">
              <AbsoluteFill style={{ padding: l.margin }}>
                <StretchType seed={seed} sequence={pairs} width={l.width - l.margin * 2} height={l.height - l.margin * 2} ink={ink} gap={Math.round(l.s * 0.004)} intro={6} />
              </AbsoluteFill>
            </Sequence>

            {/* 5 — lockup */}
            <Sequence from={ACT.lockup[0]} layout="none">
              <Mark l={l} seed={seed} text={text} seam={0.5} ink={ink} />
              <Header l={l} act="// art ⇄ code" readout="seam x=0.50" />
              {(() => {
                const b = markBox(l, l.cell * 2);
                return (
                  <div style={{ position: "absolute", left: b.x, top: b.y + b.h + l.type("title") }}>
                    <BracketTitle nodes={titleNodes(e, accent)} start={4} size={l.type("title")} cps={1} boxAt={40} ink={ink} />
                  </div>
                );
              })()}
              <AbsoluteFill style={{ justifyContent: "flex-end", padding: l.margin, flexDirection: "row", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Tokens tokens={[{ t: e.cta.join(" "), c: "white" }]} count={99} size={l.type("body")} ink={ink} />
                </div>
                <Tokens tokens={[{ t: e.url, c: "white" }]} count={99} size={l.type("body")} ink={ink} />
              </AbsoluteFill>
            </Sequence>
          </>
        );
      }}
    </Frame>
  );
};
