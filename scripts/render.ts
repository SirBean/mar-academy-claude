/**
 * MAR Academy — render CLI
 *
 *   npm run render -- --template Boot --format story
 *   npm run render -- --template Generative --format all --seeds 1-12
 *   npm run render -- --template Mosaic --format post --seed 7 --still
 *   npm run render -- --template Workshop --format story --workshop 2
 *   npm run kit                       # renders content/kit-2026.json
 *
 * Output names are reproducible: out/<Template>-<format>-s<seed>[ -w<n>].mp4|png
 * Same arguments → same file, frame for frame.
 */
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import editionJson from "../content/edition-2026.json";

const TEMPLATES = ["Identity", "Boot", "Mosaic", "OpenCall", "Terrain", "Signal", "Workshop", "Generative"];
const FORMATS = ["story", "post", "square", "wide"];
const STILL_FRAME: Record<string, number> = {
  Identity: 350, Boot: 230, Mosaic: 90, OpenCall: 40, Terrain: 110, Signal: 100, Workshop: 120, Generative: 100,
};

type Job = {
  template: string;
  format: string;
  seed: number;
  still?: boolean;
  frame?: number;
  ground?: "night" | "paper";
  accent?: "blue" | "green" | "orange";
  workshop?: number;
};

const args = process.argv.slice(2);
const get = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (k: string) => args.includes(`--${k}`);

const list = (v: string | undefined, all: string[]) =>
  !v || v === "all" ? all : v.split(",").map((s) => s.trim());

const seeds = (v: string | undefined): number[] => {
  if (!v) return [1];
  return v.split(",").flatMap((part) => {
    const [a, b] = part.split("-").map(Number);
    return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
  });
};

const jobsFromArgs = (): Job[] => {
  const ts = list(get("template"), TEMPLATES);
  const fs_ = list(get("format"), FORMATS);
  const ss = seeds(get("seeds") ?? get("seed"));
  const jobs: Job[] = [];
  for (const template of ts)
    for (const format of fs_)
      for (const seed of ss)
        jobs.push({
          template,
          format,
          seed,
          still: has("still"),
          frame: get("frame") ? Number(get("frame")) : undefined,
          ground: get("ground") as Job["ground"],
          accent: get("accent") as Job["accent"],
          workshop: get("workshop") ? Number(get("workshop")) : undefined,
        });
  return jobs;
};

const jobsFromKit = (file: string): Job[] => {
  const kit = JSON.parse(fs.readFileSync(file, "utf8")) as { jobs: (Job & { formats?: string[]; seeds?: number[] })[] };
  return kit.jobs.flatMap((j) =>
    (j.formats ?? [j.format]).flatMap((format) =>
      (j.seeds ?? [j.seed ?? 1]).map((seed) => ({ ...j, format, seed })),
    ),
  );
};

const main = async () => {
  const kit = get("kit");
  const jobs = kit ? jobsFromKit(kit) : jobsFromArgs();
  for (const j of jobs) {
    if (!TEMPLATES.includes(j.template)) throw new Error(`Unknown template "${j.template}". Use: ${TEMPLATES.join(", ")}`);
    if (!FORMATS.includes(j.format)) throw new Error(`Unknown format "${j.format}". Use: ${FORMATS.join(", ")}`);
  }
  const outDir = get("out") ?? "out";
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`▦ bundling…`);
  const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
  const browserExecutable = process.env.REMOTION_BROWSER || null;
  const chromiumOptions = { gl: "swiftshader" as const };
  const timeoutInMilliseconds = 120000;

  for (const [n, j] of jobs.entries()) {
    const inputProps = {
      seed: j.seed,
      ground: j.ground ?? "night",
      accent: j.accent ?? "blue",
      edition: editionJson,
      workshop: j.workshop ?? -1,
    };
    const id = `${j.template}-${j.format}`;
    const comp = await selectComposition({ serveUrl, id, inputProps, browserExecutable, chromiumOptions });
    const base = `${id}-s${j.seed}${j.workshop !== undefined ? `-w${j.workshop}` : ""}`;
    const t0 = Date.now();
    if (j.still) {
      const frame = j.frame ?? STILL_FRAME[j.template] ?? 0;
      const output = path.join(outDir, `${base}-f${frame}.png`);
      await renderStill({ composition: comp, serveUrl, output, frame, inputProps, browserExecutable, chromiumOptions, timeoutInMilliseconds, imageFormat: "png" });
      console.log(`[${n + 1}/${jobs.length}] ${output}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } else {
      const output = path.join(outDir, `${base}.mp4`);
      let last = -1;
      await renderMedia({
        composition: comp,
        serveUrl,
        codec: "h264",
        crf: 16,
        pixelFormat: "yuv420p",
        outputLocation: output,
        inputProps,
        browserExecutable,
        chromiumOptions,
        timeoutInMilliseconds,
        onProgress: ({ progress }) => {
          const pct = Math.floor(progress * 10) * 10;
          if (pct !== last) process.stdout.write(`\r[${n + 1}/${jobs.length}] ${base} ${(last = pct)}%   `);
        },
      });
      console.log(`\r[${n + 1}/${jobs.length}] ${output}  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    }
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
