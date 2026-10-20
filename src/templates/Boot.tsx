import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { BracketTitle, Cascade, CodeBlock, CodeLine, Comment, Loading, Node, Tokens } from "../modules/Code";
import { Frame } from "../modules/Frame";
import { BaseProps, Edition } from "../system/schema";
import { Accent, ground } from "../system/tokens";
import { pick } from "../system/rng";

/**
 * BOOT — ref A. The academy is "booted" as source code.
 * 0–100   identity code types on (+ title builds at the bottom)
 * 100–140 `academy.boot();` big, selection highlight
 * 140–190 staircase cascade: Introducing / name / pillars
 * 190–240 end card: bracket title, boxed, loading, url
 */
export const BOOT_FRAMES = 240;

export const titleNodes = (e: Edition, accent: Accent): Node[] => {
  const order: Accent[] = accent === "blue" ? ["blue", "green", "orange"] : accent === "green" ? ["green", "orange", "blue"] : ["orange", "blue", "green"];
  return [
    { text: `${e.short} `, c: "white" },
    { text: e.product, c: order[0] },
    {
      open: "[",
      close: "]",
      children: [
        { text: e.year, c: order[1] },
        { open: "(", close: ")", children: [{ text: e.tagline, c: order[2] }] },
      ],
    },
  ];
};

const identityCode = (e: Edition): CodeLine[] => [
  { indent: 0, tokens: [{ t: "from ", c: "blue" }, { t: "mar ", c: "white" }, { t: "import ", c: "blue" }, { t: "academy;", c: "white" }] },
  { indent: 0, tokens: [] },
  { indent: 0, tokens: [{ t: "const ", c: "blue" }, { t: "edition = [", c: "white" }] },
  { indent: 1, tokens: [{ t: "city: ", c: "green" }, { t: `"${e.city}",`, c: "orange" }] },
  { indent: 1, tokens: [{ t: "year: ", c: "green" }, { t: `"${e.year}",`, c: "orange" }] },
  { indent: 1, tokens: [{ t: "venue: ", c: "green" }, { t: `"${e.venue}",`, c: "orange" }] },
  { indent: 1, tokens: [{ t: "pillars: (", c: "green" }] },
  ...e.pillars.map((p) => ({ indent: 2, tokens: [{ t: `"${p}",`, c: "orange" as const }] })),
  { indent: 1, tokens: [{ t: "),", c: "green" }] },
  { indent: 0, tokens: [{ t: "];", c: "white" }] },
  { indent: 0, tokens: [] },
  { indent: 0, tokens: [{ t: "const ", c: "blue" }, { t: "workshops = [", c: "white" }] },
  ...e.workshops.map((w) => ({
    indent: 1,
    tokens: [{ t: `${w.id}: `, c: w.accent }, { t: `"${w.title}",`, c: "white" as const }],
  })),
  { indent: 0, tokens: [{ t: "];", c: "white" }] },
  { indent: 0, tokens: [] },
  { indent: 0, tokens: [{ t: "academy.", c: "white" }, { t: "boot", c: "blue" }, { t: "();", c: "white" }] },
];

export const Boot: React.FC<BaseProps> = ({ edition: e, accent, ground: g, seed }) => {
  const frame = useCurrentFrame();
  const ink = ground[g].ink;
  return (
    <Frame ground={g}>
      {(l) => {
        const m = l.margin;
        const nodes = titleNodes(e, accent);
        return (
          <>
            {/* 1 — identity code */}
            <Sequence durationInFrames={100} layout="none">
              <AbsoluteFill style={{ padding: m }}>
                <CodeBlock lines={identityCode(e)} start={0} size={l.type("label")} cps={4} maxLines={l.portrait ? 40 : 22} ink={ink} />
              </AbsoluteFill>
              <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: m * 3 }}>
                <BracketTitle nodes={nodes} start={18} size={l.type("body")} cps={0.45} ink={ink} />
              </AbsoluteFill>
            </Sequence>

            {/* 2 — boot call */}
            <Sequence from={100} durationInFrames={40} layout="none">
              <AbsoluteFill style={{ justifyContent: "center", paddingLeft: m * 2 }}>
                <Tokens
                  tokens={[{ t: "academy.", c: "white" }, { t: "boot", c: "blue" }, { t: "();", c: "white" }]}
                  count={99}
                  size={l.type("title")}
                  ink={ink}
                  cursor
                  select={frame >= 118 ? { from: 8, to: Math.min(12, 8 + Math.floor((frame - 118) / 2)) } : undefined}
                />
                <Comment text="// boot sequence" size={l.type("micro")} style={{ marginTop: l.type("micro") * 2 }} />
              </AbsoluteFill>
            </Sequence>

            {/* 3 — cascade */}
            <Sequence from={140} durationInFrames={50} layout="none">
              <AbsoluteFill style={{ justifyContent: "center", paddingLeft: m * 2 }}>
                <Cascade
                  start={0}
                  size={l.type("title")}
                  every={7}
                  ink={ink}
                  lines={[
                    [{ t: "Introducing", c: "white" }],
                    [{ t: e.name, c: accent }],
                    ...e.pillars.map((p, i) => [{ t: p, c: (["green", "orange", "blue"] as const)[i % 3] }]),
                  ]}
                />
              </AbsoluteFill>
            </Sequence>

            {/* 4 — end card */}
            <Sequence from={190} layout="none">
              <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: l.type("title") * 1.4, flexDirection: "column" }}>
                <BracketTitle nodes={nodes} start={0} size={l.type("title")} cps={99} boxAt={8} ink={ink} />
                <Loading progress={Math.min(1, (frame - 192) / 40)} size={l.type("body")} ink={ink} label={pick(["Loading", "Booting", "Compiling"], seed, "load")} />
              </AbsoluteFill>
              <AbsoluteFill style={{ justifyContent: "flex-end", padding: m, flexDirection: "row", alignItems: "flex-end" }}>
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
