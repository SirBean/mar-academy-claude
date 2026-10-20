import React from "react";
import { useCurrentFrame } from "remotion";
import { Accent, color, font, tracking } from "../system/tokens";
import { cursorOn, typed } from "../system/timing";

/**
 * CODE-AS-IDENTITY — ref A.
 * The event is written as source code: syntax colours carry meaning, text is
 * typed on, titles are built inside nested brackets, selections highlight.
 */

export type Tone = Accent | "white" | "grey";
export const tone = (t: Tone, ink: string = color.white) =>
  t === "white" ? ink : t === "grey" ? color.grey : color[t];

const textStyle = (size: number): React.CSSProperties => ({
  fontFamily: `"${font.sans}"`,
  fontWeight: 400,
  fontSize: size,
  lineHeight: 1.18,
  letterSpacing: tracking.sans,
  whiteSpace: "pre",
});

// ── Typed line ──────────────────────────────────────────────────────────────
export type Token = { t: string; c: Tone };

/** Renders tokens up to `count` characters. Optional block cursor. */
export const Tokens: React.FC<{
  tokens: Token[];
  count: number;
  size: number;
  ink?: string;
  cursor?: boolean;
  select?: { from: number; to: number; color?: string };
}> = ({ tokens, count, size, ink, cursor, select }) => {
  const frame = useCurrentFrame();
  let left = count;
  let idx = 0;
  const out: React.ReactNode[] = [];
  tokens.forEach((tok, ti) => {
    if (left <= 0) return;
    const vis = tok.t.slice(0, left);
    left -= vis.length;
    [...vis].forEach((ch, ci) => {
      const sel = select && idx >= select.from && idx < select.to;
      out.push(
        <span
          key={`${ti}-${ci}`}
          style={{
            color: sel ? color.white : tone(tok.c, ink),
            background: sel ? (select!.color ?? color.blue) : undefined,
          }}
        >
          {ch}
        </span>,
      );
      idx++;
    });
  });
  const total = tokens.reduce((s, t) => s + t.t.length, 0);
  const showCursor = cursor && (count < total || cursorOn(frame));
  return (
    <span style={textStyle(size)}>
      {out}
      {showCursor ? (
        <span style={{ background: color.blue, color: color.blue }}>{" "}</span>
      ) : null}
    </span>
  );
};

export const tokenLength = (tokens: Token[]) => tokens.reduce((s, t) => s + t.t.length, 0);

// ── Code block with scroll ─────────────────────────────────────────────────
export type CodeLine = { indent: number; tokens: Token[] };

export const CodeBlock: React.FC<{
  lines: CodeLine[];
  start: number;
  size: number;
  cps?: number;
  maxLines?: number;
  ink?: string;
  indent?: number; // px per indent level
}> = ({ lines, start, size, cps = 3, maxLines = 999, ink, indent }) => {
  const frame = useCurrentFrame();
  let budget = typed(frame, start, cps);
  const visible: { line: CodeLine; count: number }[] = [];
  for (const line of lines) {
    if (budget <= 0) break;
    const len = Math.max(1, tokenLength(line.tokens));
    visible.push({ line, count: budget });
    budget -= len;
  }
  const shown = visible.slice(-maxLines);
  const ind = indent ?? size * 3.2;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {shown.map((v, i) => (
        <div key={i} style={{ paddingLeft: v.line.indent * ind, minHeight: size * 1.18 }}>
          <Tokens
            tokens={v.line.tokens}
            count={v.count}
            size={size}
            ink={ink}
            cursor={i === shown.length - 1}
          />
        </div>
      ))}
    </div>
  );
};

// ── Bracket title ──────────────────────────────────────────────────────────
export type Node =
  | { text: string; c: Tone }
  | { open: string; close: string; c?: Tone; children: Node[] };

/** Linear "build" cost: 1 per char, 1 per bracket pair. */
const cost = (nodes: Node[]): number =>
  nodes.reduce((s, n) => s + ("text" in n ? n.text.length : 1 + cost(n.children)), 0);

/**
 * Builds e.g.  MAR Academy[2026(Creative)]  the way ref A builds its title:
 * name types on, then each bracket pair appears whole and is filled.
 * After `boxAt`, every segment gets a hairline frame.
 */
export const BracketTitle: React.FC<{
  nodes: Node[];
  start: number;
  size: number;
  cps?: number;
  boxAt?: number;
  ink?: string;
}> = ({ nodes, start, size, cps = 1, boxAt, ink }) => {
  const frame = useCurrentFrame();
  let budget = typed(frame, start, cps);
  const boxed = boxAt !== undefined && frame >= boxAt;
  const box: React.CSSProperties = boxed
    ? { outline: `${Math.max(1, size / 28)}px solid ${color.dim}`, outlineOffset: -1 }
    : {};

  const render = (list: Node[], key: string): React.ReactNode[] =>
    list.map((n, i) => {
      if (budget <= 0) return null;
      if ("text" in n) {
        const vis = n.text.slice(0, budget);
        budget -= vis.length;
        return (
          <span key={key + i} style={{ color: tone(n.c, ink), padding: boxed ? "0 0.08em" : 0, ...box }}>
            {vis}
          </span>
        );
      }
      budget -= 1; // pair appears at once
      const bc = tone(n.c ?? "white", ink);
      const inner = render(n.children, key + i + "-");
      return (
        <span key={key + i} style={{ display: "inline-flex", ...box }}>
          <span style={{ color: bc }}>{n.open}</span>
          {inner}
          <span style={{ color: bc }}>{n.close}</span>
        </span>
      );
    });

  return (
    <div style={{ ...textStyle(size), display: "inline-flex", alignItems: "baseline", padding: boxed ? size * 0.12 : 0 }}>
      {render(nodes, "n")}
    </div>
  );
};
export const titleCost = cost;

// ── Cascade (indented staircase list) ──────────────────────────────────────
export const Cascade: React.FC<{
  lines: Token[][];
  start: number;
  size: number;
  every?: number; // frames between lines
  step?: number; // indent per line, in em
  ink?: string;
}> = ({ lines, start, size, every = 8, step = 1.4, ink }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((tokens, i) => {
        const t0 = start + i * every;
        if (frame < t0) return null;
        return (
          <div key={i} style={{ paddingLeft: `${i * step}em`, fontSize: size }}>
            <Tokens tokens={tokens} count={typed(frame, t0, 3)} size={size} ink={ink} />
          </div>
        );
      })}
    </div>
  );
};

// ── Loading ────────────────────────────────────────────────────────────────
export const Loading: React.FC<{
  progress: number; // 0..1
  size: number;
  dots?: number;
  label?: string;
  ink?: string;
}> = ({ progress, size, dots = 6, label = "Loading", ink = color.white }) => {
  const filled = Math.round(progress * dots);
  const pct = Math.round(progress * 100);
  const d = size * 0.78;
  return (
    <div style={{ ...textStyle(size), color: ink }}>
      <div>
        {label}
        <span style={{ color: color.blue, marginLeft: "0.6em" }}>{pct}%</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: size * 0.18 }}>
        <span>[</span>
        {Array.from({ length: dots }).map((_, i) => (
          <span
            key={i}
            style={{
              width: d,
              height: d,
              borderRadius: "50%",
              background: i < filled ? (i === 0 ? color.green : color.blue) : "transparent",
              boxShadow: i < filled ? undefined : `inset 0 0 0 1px ${color.dim}`,
            }}
          />
        ))}
        <span>]</span>
      </div>
    </div>
  );
};

// ── Micro labels & measure frame ───────────────────────────────────────────
export const Comment: React.FC<{ text: string; size: number; style?: React.CSSProperties }> = ({
  text,
  size,
  style,
}) => (
  <div style={{ ...textStyle(size), fontFamily: `"${font.mono}"`, color: color.grey, ...style }}>{text}</div>
);

/** Hairline frame with dimension ticks, like ref A's type-spec board. */
export const MeasureFrame: React.FC<{
  w: number;
  h: number;
  label?: number;
  size: number;
  ink?: string;
}> = ({ w, h, label = 54, size, ink = color.dim }) => {
  const num: React.CSSProperties = {
    position: "absolute",
    fontFamily: `"${font.mono}"`,
    fontSize: size,
    color: color.grey,
  };
  return (
    <div style={{ position: "relative", width: w, height: h, boxShadow: `inset 0 0 0 1px ${ink}` }}>
      <span style={{ ...num, top: -size * 1.6, left: "50%" }}>{label}</span>
      <span style={{ ...num, bottom: -size * 1.6, left: "50%" }}>{label}</span>
      <span style={{ ...num, left: -size * 2.2, top: "50%" }}>{label}</span>
      <span style={{ ...num, right: -size * 2.2, top: "50%" }}>{label}</span>
      <span style={{ ...num, left: "12%", top: "50%" }}>0</span>
      <span style={{ ...num, right: "12%", top: "50%" }}>0</span>
    </div>
  );
};
