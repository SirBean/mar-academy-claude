import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Frame, Label } from "../modules/Frame";
import { StretchType } from "../modules/StretchType";
import { BaseProps } from "../system/schema";
import { ground, time } from "../system/tokens";

/**
 * OPEN CALL — ref B. Statement words fill the frame and re-deal on every beat,
 * then a hard cut to a quiet info card.
 */
export const OPENCALL_FRAMES = 240;

/** Builds the beat sequence: pairs of words that scroll through the statement. */
export const statementSequence = (words: string[]): string[][] => {
  const seq: string[][] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const pair = [words[i], words[i + 1]];
    seq.push(pair, pair, pair);
  }
  const last = words[words.length - 1];
  seq.push([last], [last]);
  return seq;
};

export const OpenCall: React.FC<BaseProps> = ({ seed, ground: g, edition: e }) => {
  const ink = ground[g].ink;
  const seq = statementSequence(e.statement);
  const typeFrames = seq.length * time.beat;
  return (
    <Frame ground={g}>
      {(l) => (
        <>
          <Sequence durationInFrames={typeFrames} layout="none">
            <StretchType seed={seed} sequence={seq} ink={ink} gap={Math.round(l.s * 0.004)} />
          </Sequence>
          <Sequence from={typeFrames} layout="none">
            <AbsoluteFill
              style={{
                padding: l.margin,
                flexDirection: l.portrait ? "column" : "row",
                justifyContent: "space-between",
                alignItems: l.portrait ? "flex-start" : "center",
              }}
            >
              <Label size={l.type("body")}>{`${e.statement.slice(0, 2).join(" ")}\n${e.statement.slice(2).join(" ")}`}</Label>
              <Label size={l.type("body")}>{`${e.short} ${e.product} ${e.year}`}</Label>
              <Label size={l.type("body")}>{`DEADLINE   ${e.deadline}`}</Label>
            </AbsoluteFill>
          </Sequence>
        </>
      )}
    </Frame>
  );
};
