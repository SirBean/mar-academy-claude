import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BracketTitle, Cascade, Tokens } from "../modules/Code";
import { DitherTerrain } from "../modules/DitherTerrain";
import { Frame, Label } from "../modules/Frame";
import { GlyphField } from "../modules/GlyphField";
import { StretchType } from "../modules/StretchType";
import { TesseraField } from "../modules/TesseraField";
import { WaveLines } from "../modules/WaveLines";
import { Column } from "./Mosaic";
import { titleNodes } from "./Boot";
import { BaseProps } from "../system/schema";
import { ACCENTS, Accent, color, ground } from "../system/tokens";
import { pick, prng } from "../system/rng";
import { Layout } from "../system/formats";

/**
 * GENERATIVE — the infinite variant engine.
 * The seed deals a recipe: field × composition × text system × accent.
 * Every recipe obeys STYLE.md, so any seed is on-brand. Browse seeds in the
 * Studio, keep the good ones, render them by number.
 */
export const GENERATIVE_FRAMES = 150;

const FIELDS = ["tessera", "waves", "glyphs", "signal", "terrain", "triptych", "split"] as const;
const COMPS = ["slot-bottom", "slot-top", "slot-center", "edge"] as const;
const TEXTS = ["title", "cascade", "statement", "workshop"] as const;

export type Recipe = {
  field: (typeof FIELDS)[number];
  comp: (typeof COMPS)[number];
  text: (typeof TEXTS)[number];
  accent: Accent;
  threshold: number;
};

export const recipe = (seed: number): Recipe => {
  const r = prng(`recipe-${seed}`);
  const p = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  return {
    field: p(FIELDS),
    comp: p(COMPS),
    text: p(TEXTS),
    accent: p(ACCENTS),
    threshold: -0.1 + r() * 0.3,
  };
};

const Field: React.FC<{ rc: Recipe; seed: number; l: Layout; frame: number }> = ({ rc, seed, l, frame }) => {
  switch (rc.field) {
    case "tessera":
      return <TesseraField seed={seed} cell={l.cell} threshold={rc.threshold} />;
    case "waves":
      return <WaveLines seed={seed} bands={l.portrait ? 14 : 8} stroke={Math.max(1.2, l.s / 700)} />;
    case "glyphs":
      return <GlyphField mode="scatter" seed={seed} size={Math.round(l.s * 0.016)} density={0.5} />;
    case "signal":
      return <GlyphField mode="raster" seed={seed} source={pick(["M", "A", "R"], seed)} size={Math.round(l.s * 0.014)} zoom={1 + frame / 150} chroma={Math.max(1, l.s * 0.0018)} glow={l.s * 0.004} />;
    case "terrain":
      return <DitherTerrain seed={seed} dolly={0.15 + frame / 400} rise={Math.min(1, frame / 60)} burst={Math.max(0, (frame - 60) / 160)} ink={color.black} />;
    case "triptych": {
      const w = Math.floor(l.width / 3);
      return (
        <>
          {(["glyph", "wave", "tessera"] as const).map((k, i) => (
            <div key={k} style={{ position: "absolute", left: i * w, width: w, height: l.height }}>
              <Column kind={k} seed={seed + i} w={w} h={l.height} l={l} ink={color.white} />
            </div>
          ))}
        </>
      );
    }
    case "split": {
      const half = l.portrait ? { w: l.width, h: Math.floor(l.height / 2) } : { w: Math.floor(l.width / 2), h: l.height };
      return (
        <>
          <div style={{ position: "absolute", left: 0, top: 0, width: half.w, height: half.h }}>
            <TesseraField seed={seed} cell={l.cell} width={half.w} height={half.h} threshold={rc.threshold} />
          </div>
          <div style={{ position: "absolute", right: 0, bottom: 0, width: half.w, height: half.h }}>
            <WaveLines seed={seed} width={half.w} height={half.h} bands={7} stroke={Math.max(1.2, l.s / 700)} />
          </div>
        </>
      );
    }
  }
};

export const Generative: React.FC<BaseProps> = (props) => {
  const { seed, edition: e } = props;
  const frame = useCurrentFrame();
  const rc = recipe(seed);
  const g = rc.field === "terrain" ? "paper" : "night";
  const ink = ground[g].ink;
  return (
    <Frame ground={g}>
      {(l) => {
        const size = l.type("title");
        // Text sits in a solid "slot": a ground-coloured block snapped to the cell grid.
        const snapPx = (v: number) => Math.round(v / l.cell) * l.cell;
        const slot: React.CSSProperties = {
          background: ground[g].bg,
          padding: `${snapPx(size * 0.6)}px ${snapPx(size * 0.8)}px`,
          display: "inline-block",
          maxWidth: l.width - l.margin * 2,
        };
        const text = (() => {
          switch (rc.text) {
            case "title":
              return <BracketTitle nodes={titleNodes(e, rc.accent)} start={6} size={size} cps={0.6} boxAt={70} ink={ink} />;
            case "cascade":
              return (
                <Cascade
                  start={6}
                  size={size}
                  every={8}
                  ink={ink}
                  lines={[[{ t: e.name, c: "white" }], ...e.pillars.map((p, i) => [{ t: p, c: ACCENTS[(ACCENTS.indexOf(rc.accent) + i) % 3] }])]}
                />
              );
            case "workshop": {
              const w = e.workshops[seed % e.workshops.length];
              return (
                <div>
                  <Tokens tokens={[{ t: "import ", c: "green" }, { t: w.id, c: "white" }]} count={Math.floor(frame / 1.5)} size={size} ink={ink} />
                  <div />
                  <Tokens tokens={[{ t: `"${w.title}"`, c: w.accent }]} count={Math.max(0, Math.floor((frame - 25) * 2))} size={size} ink={ink} />
                </div>
              );
            }
            case "statement":
              return null; // rendered as full-bleed stretch type below
          }
        })();

        if (rc.text === "statement") {
          // statement recipes go full-bleed type in a band over the field
          const bandH = Math.round(l.height * (l.portrait ? 0.32 : 0.45));
          return (
            <>
              <Field rc={rc} seed={seed} l={l} frame={frame} />
              <div style={{ position: "absolute", left: 0, top: (l.height - bandH) / 2, width: l.width, height: bandH, background: ground[g].bg }}>
                <StretchType
                  seed={seed}
                  sequence={[[e.statement[0], e.statement[1]], [e.statement[0], e.statement[1]], [e.statement[2], e.statement[3] ?? e.year], [e.statement[2], e.statement[3] ?? e.year], [e.short, e.year], [e.short, e.year], [e.short, e.year], [e.short, e.year], [e.short, e.year], [e.short, e.year]]}
                  width={l.width}
                  height={bandH}
                  ink={ink}
                  gap={Math.round(l.s * 0.004)}
                />
              </div>
            </>
          );
        }

        const pos: React.CSSProperties =
          rc.comp === "slot-top"
            ? { justifyContent: "flex-start" }
            : rc.comp === "slot-center"
              ? { justifyContent: "center" }
              : { justifyContent: "flex-end" };
        return (
          <>
            <Field rc={rc} seed={seed} l={l} frame={frame} />
            <AbsoluteFill style={{ padding: l.margin, alignItems: rc.comp === "edge" ? "flex-start" : "center", ...pos }}>
              <div style={slot}>{text}</div>
            </AbsoluteFill>
            <AbsoluteFill style={{ padding: l.margin, justifyContent: "flex-end", alignItems: "flex-end" }}>
              {rc.comp !== "slot-bottom" ? (
                <div style={{ background: ground[g].bg, padding: `${l.cell}px ${l.cell * 2}px` }}>
                  <Label size={l.type("label")} color={ink}>{`${e.short} ${e.product} ${e.year}`}</Label>
                </div>
              ) : null}
            </AbsoluteFill>
          </>
        );
      }}
    </Frame>
  );
};
