import { z } from "zod";
import { ArticleCategory } from "@prisma/client";
import { SLUG_PATTERN, slugify } from "./slug";
import { DEFAULT_THEME, HEX, PRESET_KEYS, type SystemTheme } from "./theme";
import { CHARACTER_STATUSES, FORCE_SLOTS, specialRule, statProfile } from "./codex";
import { sectorSchema } from "./regions";

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

// ---------- Codex: characters, army list, narratives ----------

/** A JSON-encoded array posted from a client-side repeatable editor. */
function jsonArray<T extends z.ZodType>(item: T, max: number, label: string) {
  return z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v || v.trim() === "") return [] as z.output<T>[];
      let parsed: unknown;
      try {
        parsed = JSON.parse(v);
      } catch {
        ctx.addIssue({ code: "custom", message: `${label} could not be read` });
        return z.NEVER;
      }
      const r = z.array(item).max(max, `At most ${max} ${label.toLowerCase()}`).safeParse(parsed);
      if (!r.success) {
        ctx.addIssue({ code: "custom", message: r.error.issues[0]?.message ?? `Invalid ${label.toLowerCase()}` });
        return z.NEVER;
      }
      return r.data;
    });
}

/** Textarea with one entry per line. */
const lines = (maxItems: number, maxLen: number) =>
  z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((l) => l.trim().slice(0, maxLen))
        .filter(Boolean)
        .slice(0, maxItems),
    );

const sortOrder = z.coerce.number().int().min(-9999).max(9999).default(0);

export const characterSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: slugField,
    title: optionalText(120),
    faction: optionalText(120),
    status: z.enum(CHARACTER_STATUSES).default("ACTIVE"),
    quote: optionalText(1000),
    quoteSource: optionalText(200),
    summary: optionalText(500),
    body: z.string().max(200000).default(""),
    // The editor posts either "" (no statline) or one JSON-encoded profile.
    profile: z
      .string()
      .optional()
      .transform((v, ctx) => {
        if (!v || v.trim() === "" || v.trim() === "null") return null;
        try {
          const r = statProfile.safeParse(JSON.parse(v));
          if (r.success) return r.data;
          ctx.addIssue({ code: "custom", message: r.error.issues[0]?.message ?? "Invalid statline" });
        } catch {
          ctx.addIssue({ code: "custom", message: "Statline could not be read" });
        }
        return z.NEVER;
      }),
    wargear: lines(30, 160),
    specialRules: jsonArray(specialRule, 20, "Special rules"),
    sortOrder,
    published: checkbox,
    portraitImageId: optionalId,
    homeworldId: optionalId,
  })
  .transform((d) => withSlug(d, d.name));

export const unitSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: slugField,
    faction: optionalText(120),
    slot: z.enum(FORCE_SLOTS).default("TROOPS"),
    points: optionalText(40),
    squad: optionalText(1000),
    profiles: jsonArray(statProfile, 10, "Profiles"),
    wargear: lines(30, 160),
    options: optionalText(20000),
    specialRules: jsonArray(specialRule, 20, "Special rules"),
    description: z.string().max(200000).default(""),
    sortOrder,
    published: checkbox,
    imageId: optionalId,
  })
  .transform((d) => withSlug(d, d.name));

export const narrativeSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    slug: slugField,
    subtitle: optionalText(200),
    epigraph: optionalText(1000),
    epigraphSource: optionalText(200),
    summary: optionalText(500),
    body: z.string().max(500000).default(""),
    published: checkbox,
    coverImageId: optionalId,
    planetId: optionalId,
    characterIds: z
      .string()
      .optional()
      .transform((v) => Array.from(new Set((v ?? "").split(",").map((s) => s.trim()).filter(Boolean))).slice(0, 50)),
  })
  .transform((d) => withSlug(d, d.title));

// ---------- Users ----------

const password = z.string().min(10, "Use at least 10 characters").max(200);
const role = z.enum(["ADMIN", "EDITOR"]);

export const newUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  name: optionalText(120),
  password,
  role: role.default("EDITOR"),
});

export const updateUserSchema = z.object({
  name: optionalText(120),
  role,
  disabled: checkbox,
});

export const resetPasswordSchema = z.object({ password });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const resetWithTokenSchema = z
  .object({
    token: z.string().min(1),
    password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

// ---------- Planet regions ----------

export const regionSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: slugField,
    kind: optionalText(80),
    summary: optionalText(20000),
    terrain: optionalText(500),
    lat: z.coerce.number().min(-90, "Latitude is between -90 and 90").max(90, "Latitude is between -90 and 90").default(0),
    lng: z.coerce.number().min(-180, "Longitude is between -180 and 180").max(180, "Longitude is between -180 and 180").default(0),
    sectors: jsonArray(sectorSchema, 30, "Sectors"),
    sortOrder,
    published: checkbox,
  })
  .transform((d) => withSlug(d, d.name));
