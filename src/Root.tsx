import React from "react";
import { Composition, Folder } from "remotion";
import { FORMATS, FORMAT_IDS } from "./system/formats";
import { baseProps, defaults } from "./system/schema";
import { time } from "./system/tokens";
import { Boot, BOOT_FRAMES } from "./templates/Boot";
import { Mosaic, MOSAIC_FRAMES } from "./templates/Mosaic";
import { OpenCall, OPENCALL_FRAMES } from "./templates/OpenCall";
import { Terrain, TERRAIN_FRAMES } from "./templates/Terrain";
import { Signal, SIGNAL_FRAMES } from "./templates/Signal";
import { Workshop, WORKSHOP_FRAMES } from "./templates/Workshop";
import { Generative, GENERATIVE_FRAMES } from "./templates/Generative";
import { Identity, IDENTITY_FRAMES } from "./templates/Identity";

/**
 * Template registry. Composition ids are `<Template>-<format>`,
 * e.g. `Boot-story`, `Generative-wide`. The render CLI relies on this.
 */
export const TEMPLATES = {
  Identity: { component: Identity, frames: IDENTITY_FRAMES, still: 350 },
  Boot: { component: Boot, frames: BOOT_FRAMES, still: 230 },
  Mosaic: { component: Mosaic, frames: MOSAIC_FRAMES, still: 90 },
  OpenCall: { component: OpenCall, frames: OPENCALL_FRAMES, still: 40 },
  Terrain: { component: Terrain, frames: TERRAIN_FRAMES, still: 110 },
  Signal: { component: Signal, frames: SIGNAL_FRAMES, still: 100 },
  Workshop: { component: Workshop, frames: WORKSHOP_FRAMES, still: 120 },
  Generative: { component: Generative, frames: GENERATIVE_FRAMES, still: 100 },
} as const;

export const RemotionRoot: React.FC = () => (
  <>
    {Object.entries(TEMPLATES).map(([name, t]) => (
      <Folder key={name} name={name}>
        {FORMAT_IDS.map((f) => (
          <Composition
            key={f}
            id={`${name}-${f}`}
            component={t.component as React.FC<any>}
            durationInFrames={t.frames}
            fps={time.fps}
            width={FORMATS[f].width}
            height={FORMATS[f].height}
            schema={baseProps}
            defaultProps={defaults()}
          />
        ))}
      </Folder>
    ))}
  </>
);
