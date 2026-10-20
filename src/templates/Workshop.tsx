import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Comment, Tokens, tone } from "../modules/Code";
import { Frame } from "../modules/Frame";
import { TesseraField } from "../modules/TesseraField";
import { BaseProps } from "../system/schema";
import { color, ground } from "../system/tokens";
import { typed } from "../system/timing";

/**
 * WORKSHOP — ref A "character roster" (import hoots … #328FF2 (1/6)).
 * One card per workshop:  import community  ▦  #54CA31 (1/4)
 * then the details are typed underneath. The tile icon is a live tessera patch.
 */
export const WORKSHOP_FRAMES = 150;

export const Workshop: React.FC<BaseProps> = ({ seed, ground: g, edition: e, workshop }) => {
  const frame = useCurrentFrame();
  const idx = Math.max(0, Math.min(e.workshops.length - 1, workshop < 0 ? seed % e.workshops.length : workshop));
  const w = e.workshops[idx];
  const hex = color[w.accent];
  const ink = ground[g].ink;
  return (
    <Frame ground={g}>
      {(l) => {
        const size = l.type("body");
        const icon = Math.round(l.s * 0.16);
        const sel = frame >= 40 && frame < 70; // ref A: the import name gets selected
        return (
          <>
            <Comment
              text={`${e.short.toLowerCase()}_${e.year}.load(workshops)`}
              size={l.type("micro")}
              style={{ position: "absolute", top: l.margin, width: "100%", textAlign: "center" }}
            />
            <AbsoluteFill
              style={{
                padding: l.margin,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Tokens
                tokens={[{ t: "import ", c: "green" }, { t: w.id, c: "white" }]}
                count={typed(frame, 4, 1)}
                size={size}
                ink={ink}
                select={sel ? { from: 7, to: 7 + w.id.length, color: hex } : undefined}
              />
              <div style={{ width: icon, height: icon, position: "relative", opacity: frame > 14 ? 1 : 0 }}>
                <TesseraField seed={seed + idx} cell={Math.max(4, Math.round(icon / 14))} width={icon} height={icon} ink={hex} inkHi={color.white} threshold={-0.05} reveal={Math.min(1, (frame - 14) / 20)} />
              </div>
              <Tokens
                tokens={[
                  { t: "#", c: "white" },
                  { t: hex.slice(1).toUpperCase(), c: w.accent },
                  { t: ` (${idx + 1}/${e.workshops.length})`, c: "white" },
                ]}
                count={frame > 10 ? 99 : 0}
                size={size}
                ink={ink}
              />
            </AbsoluteFill>
            <AbsoluteFill style={{ justifyContent: "flex-end", padding: l.margin }}>
              {[
                [{ t: "title: ", c: "green" as const }, { t: `"${w.title}"`, c: "orange" as const }],
                [{ t: "speaker: ", c: "green" as const }, { t: `"${w.speaker}"`, c: "orange" as const }],
                [{ t: "date: ", c: "green" as const }, { t: `"${w.date}"`, c: "orange" as const }],
                [{ t: "venue: ", c: "green" as const }, { t: `"${e.venue}"`, c: "orange" as const }],
              ].map((tk, i) => (
                <div key={i}>
                  <Tokens tokens={tk} count={typed(frame, 50 + i * 12, 3)} size={l.type("label")} ink={ink} />
                </div>
              ))}
              <div style={{ height: l.type("label") }} />
              <Tokens tokens={[{ t: e.url, c: "white" }]} count={frame > 100 ? 99 : 0} size={l.type("label")} ink={tone("grey")} />
            </AbsoluteFill>
          </>
        );
      }}
    </Frame>
  );
};
