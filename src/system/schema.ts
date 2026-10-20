import { z } from "zod";
import edition from "../../content/edition-2026.json";

export const accentSchema = z.enum(["blue", "green", "orange"]);
export const groundSchema = z.enum(["night", "paper"]);

export const workshopSchema = z.object({
  id: z.string(),
  title: z.string(),
  speaker: z.string(),
  date: z.string(),
  accent: accentSchema,
});

export const editionSchema = z.object({
  name: z.string(),
  short: z.string(),
  product: z.string(),
  year: z.string(),
  tagline: z.string(),
  venue: z.string(),
  city: z.string(),
  url: z.string(),
  pillars: z.array(z.string()),
  cta: z.array(z.string()),
  statement: z.array(z.string()),
  deadline: z.string(),
  workshops: z.array(workshopSchema),
});

/** Props shared by every template. Override any of them from the CLI. */
export const baseProps = z.object({
  seed: z.number().int(),
  ground: groundSchema,
  accent: accentSchema,
  edition: editionSchema,
  /** Optional: focus a single workshop (index into edition.workshops). */
  workshop: z.number().int().min(-1),
});

export type BaseProps = z.infer<typeof baseProps>;
export type Edition = z.infer<typeof editionSchema>;

export const defaultEdition = editionSchema.parse(edition);

export const defaults = (over: Partial<BaseProps> = {}): BaseProps => ({
  seed: 1,
  ground: "night",
  accent: "blue",
  edition: defaultEdition,
  workshop: -1,
  ...over,
});
