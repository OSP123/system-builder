import { z } from "zod";
import { ArticleCategory } from "@prisma/client";
import { SLUG_PATTERN, slugify } from "./slug";
import { DEFAULT_THEME, HEX, PRESET_KEYS, type SystemTheme } from "./theme";

// HTML forms send "" for empty inputs; treat those as absent.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const checkbox = z
  .union([z.string(), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .max(80)
  .refine((v) => v === "" || SLUG_PATTERN.test(v), {
    message: "Use lowercase letters, numbers and hyphens only",
  })
  .optional();

/** Fill in an empty slug from the given name/title. */
function withSlug<T extends { slug?: string }>(data: T, source: string) {
  return { ...data, slug: data.slug || slugify(source) };
}

/** Optional "#rrggbb" colour; empty means "use the preset". */
const themeColor = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || HEX.test(v), { message: "Use a #rrggbb colour" })
  .transform((v) => (v ? v.toLowerCase() : undefined));

const percent = (fallback: number) =>
  z
    .union([z.literal(""), z.coerce.number().int().min(0).max(100)])
    .optional()
    .transform((v) => (v === "" || v === undefined ? fallback : v));

const coordinate = z.coerce.number().finite().min(-100000).max(100000).default(0);

export const worldSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: slugField,
    tagline: optionalText(200),
    summary: optionalText(20000),
    published: checkbox,
    coverImageId: optionalId,
  })
  .transform((d) => withSlug(d, d.name));

export const articleSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: slugField,
    category: z.enum(ArticleCategory),
    summary: optionalText(500),
    body: z.string().max(200000).default(""),
    tags: z
      .string()
      .optional()
      .transform((v) =>
        Array.from(
          new Set(
            (v ?? "")
              .split(",")
              .map((t) => t.trim().toLowerCase())
              .filter(Boolean),
          ),
        ).slice(0, 30),
      ),
    published: checkbox,
    coverImageId: optionalId,
    systemId: optionalId,
    planetId: optionalId,
  })
  .transform((d) => withSlug(d, d.title));

export const systemSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: slugField,
    starType: optionalText(80),
    segmentum: optionalText(80),
    description: optionalText(50000),
    x: coordinate,
    y: coordinate,
    z: coordinate,
    published: checkbox,
    backdropImageId: optionalId,
    // Theme fields arrive flat from the form and are folded into one JSON object.
    themePreset: z.enum(PRESET_KEYS).optional(),
    themeAccent: themeColor,
    themeMetal: themeColor,
    themeText: themeColor,
    themeTerminal: themeColor,
    themeAtmosphere: themeColor,
    themeAtmosphereStrength: percent(DEFAULT_THEME.atmosphereStrength),
    themeBackdropOpacity: percent(DEFAULT_THEME.backdropOpacity),
  })
  .transform((d) => {
    const {
      themePreset, themeAccent, themeMetal, themeText, themeTerminal, themeAtmosphere,
      themeAtmosphereStrength, themeBackdropOpacity, ...rest
    } = d;
    const colors: SystemTheme["colors"] = {};
    if (themeAccent) colors.accent = themeAccent;
    if (themeMetal) colors.metal = themeMetal;
    if (themeText) colors.text = themeText;
    if (themeTerminal) colors.terminal = themeTerminal;
    if (themeAtmosphere) colors.atmosphere = themeAtmosphere;
    const theme: SystemTheme = {
      preset: themePreset ?? "imperial",
      colors,
      atmosphereStrength: themeAtmosphereStrength,
      backdropOpacity: themeBackdropOpacity,
    };
    return withSlug({ ...rest, theme }, d.name);
  });

export const planetSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: slugField,
    classification: optionalText(80),
    description: optionalText(50000),
    orbitIndex: z.coerce.number().int().min(0).max(100).default(0),
    population: optionalText(120),
    titheGrade: optionalText(80),
    genParams: z
      .string()
      .optional()
      .transform((v, ctx) => {
        if (!v || v.trim() === "") return null;
        try {
          const parsed = JSON.parse(v);
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            throw new Error();
          }
          return parsed as Record<string, unknown>;
        } catch {
          ctx.addIssue({ code: "custom", message: "Must be a JSON object" });
          return z.NEVER;
        }
      }),
    published: checkbox,
    coverImageId: optionalId,
  })
  .transform((d) => withSlug(d, d.name));

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

/** Convert FormData to a plain object (last value wins) for zod parsing. */
export function formToObject(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export type FieldErrors = Record<string, string>;

export function flattenErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
