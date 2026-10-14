import { z } from "zod";
import type { CharacterStatus, ForceSlot } from "@prisma/client";

/**
 * Shared shapes for the codex sections (characters, army list, narratives).
 * Client-safe: only type imports from Prisma.
 */

// ---------- Labels ----------

export const FORCE_SLOTS = ["HQ", "ELITES", "TROOPS", "FAST_ATTACK", "HEAVY_SUPPORT", "TRANSPORT"] as const satisfies readonly ForceSlot[];

export const SLOT_LABELS: Record<ForceSlot, string> = {
  HQ: "HQ",
  ELITES: "Elites",
  TROOPS: "Troops",
  FAST_ATTACK: "Fast Attack",
  HEAVY_SUPPORT: "Heavy Support",
  TRANSPORT: "Dedicated Transport",
};

export const CHARACTER_STATUSES = ["ACTIVE", "DECEASED", "MISSING", "UNKNOWN"] as const satisfies readonly CharacterStatus[];

export const STATUS_LABELS: Record<CharacterStatus, string> = {
  ACTIVE: "In service",
  DECEASED: "Deceased",
  MISSING: "Missing in action",
  UNKNOWN: "Fate unknown",
};

// ---------- Statlines ----------

/** A single characteristic: digits, dice and the usual symbols ("4", "3+", "D6", "-", "2/3"). */
const stat = z
  .string()
  .trim()
  .max(5)
  .regex(/^[0-9DdXx+\-/*]*$/, "Use numbers, D, +, -, / or *");

export const MODEL_STATS = ["ws", "bs", "s", "t", "w", "i", "a", "ld", "sv"] as const;
export const VEHICLE_STATS = ["bs", "front", "side", "rear"] as const;

export const STAT_HEADERS: Record<string, string> = {
  ws: "WS", bs: "BS", s: "S", t: "T", w: "W", i: "I", a: "A", ld: "Ld", sv: "Sv",
  front: "Front", side: "Side", rear: "Rear",
};

const modelProfile = z.object({
  kind: z.literal("model"),
  name: z.string().trim().min(1, "Profile needs a name").max(60),
  ws: stat, bs: stat, s: stat, t: stat, w: stat, i: stat, a: stat, ld: stat, sv: stat,
});

const vehicleProfile = z.object({
  kind: z.literal("vehicle"),
  name: z.string().trim().min(1, "Profile needs a name").max(60),
  bs: stat, front: stat, side: stat, rear: stat,
});

export const statProfile = z.discriminatedUnion("kind", [modelProfile, vehicleProfile]);
export type StatProfile = z.infer<typeof statProfile>;
export type ModelProfile = z.infer<typeof modelProfile>;
export type VehicleProfile = z.infer<typeof vehicleProfile>;

export const emptyModelProfile = (name = ""): ModelProfile => ({
  kind: "model", name, ws: "", bs: "", s: "", t: "", w: "", i: "", a: "", ld: "", sv: "",
});
export const emptyVehicleProfile = (name = ""): VehicleProfile => ({ kind: "vehicle", name, bs: "", front: "", side: "", rear: "" });

// ---------- Special rules ----------

export const specialRule = z.object({
  name: z.string().trim().min(1, "Rule needs a name").max(80),
  description: z.string().trim().max(2000).default(""),
});
export type SpecialRule = z.infer<typeof specialRule>;

// ---------- Parsing helpers for stored JSON ----------

/** Read profiles from the DB, dropping anything malformed rather than crashing a page. */
export function readProfiles(raw: unknown): StatProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p) => {
    const r = statProfile.safeParse(p);
    return r.success ? [r.data] : [];
  });
}

export function readProfile(raw: unknown): StatProfile | null {
  const r = statProfile.safeParse(raw);
  return r.success ? r.data : null;
}

export function readRules(raw: unknown): SpecialRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((p) => {
    const r = specialRule.safeParse(p);
    return r.success ? [r.data] : [];
  });
}

/** Chapter headings (## / ###) in a narrative body, for its table of contents. */
export function chapterHeadings(markdown: string): { level: 2 | 3; text: string; id: string }[] {
  const out: { level: 2 | 3; text: string; id: string }[] = [];
  const seen = new Map<string, number>();
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2].replace(/[*_`]/g, "");
    const base = headingId(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    out.push({ level: m[1].length as 2 | 3, text, id: n ? `${base}-${n}` : base });
  }
  return out;
}

export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[*_`]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "section"
  );
}
