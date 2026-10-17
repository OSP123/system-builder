import type { ArticleCategory, CharacterStatus } from "@prisma/client";
import { statProfile, type EleventhProfile } from "../codex";
import { slugify } from "../slug";

/**
 * Turns an export of the slow-grow-trainer campaign (Vespera Prime) into
 * Archivum records. Pure: no database access, so it is easy to test.
 *
 * Players' writing (battle reports, army lore, warlords) comes out as drafts,
 * credited to each commander; the campaign's own events and the territory
 * control snapshot come out published. No ids, emails or real names are kept.
 */

// ---------- Input shapes (as exported from Supabase) ----------

export type Matchup = {
  id: string;
  p1_id: string | null;
  p2_id: string | null;
  p1_score: number | null;
  p2_score: number | null;
  game_result: "p1_win" | "p2_win" | "draw" | null;
  p1_lore: string | null;
  p2_lore: string | null;
  p1_tldr: string | null;
  p2_tldr: string | null;
  status: string;
  theatre_name: string | null;
  campaign_month: number | null;
  uncontested?: boolean | null;
};
export type Award = {
  matchup_id: string | null;
  commander_id: string | null;
  deed: string;
  metric: string;
  territory_name: string | null;
  note: string | null;
};
export type GlobalEvent = {
  id: string;
  title: string;
  description: string;
  rules_text: string | null;
  theatre_name: string | null;
  campaign_month: number | null;
};
export type Territory = { name: string } & Partial<Record<string, number | string | null>>;
export type CampaignState = {
  current_month: number | null;
  points_limit: number | null;
};
export type Profile = {
  id: string;
  commander_name: string | null;
  army_faction: string | null;
  army_subfaction: string | null;
  army_lore: string | null;
  /** Legacy column; the app now names warlords in crucible_datasheets. */
  warlord_name: string | null;
  champions: Champion[];
};
type Weapon = {
  name?: string;
  range?: string;
  a?: string;
  bs?: string;
  ws?: string;
  s?: string;
  ap?: string;
  d?: string;
  keywords?: string;
};
/** A Crucible datasheet: the warlord and champions built on the commander profile. */
export type Champion = {
  id: string;
  name: string;
  archetype?: string;
  specialism?: string;
  points?: number;
  keywords?: string;
  abilities?: string;
  stats?: Partial<Record<"m" | "t" | "sv" | "invuln" | "w" | "ld" | "oc", string>>;
  rangedWeapons?: Weapon[];
  meleeWeapons?: Weapon[];
};

// ---------- Output shapes ----------

export type ImportedArticle = {
  sourceRef: string;
  slug: string;
  title: string;
  category: ArticleCategory;
  summary: string | null;
  body: string;
  tags: string[];
  published: boolean;
  /** Region (theatre) to link, by name. */
  regionName: string | null;
};
export type ImportedNarrative = {
  sourceRef: string;
  slug: string;
  title: string;
  subtitle: string | null;
  epigraph: string | null;
  epigraphSource: string | null;
  summary: string | null;
  body: string;
  published: boolean;
  regionName: string | null;
  /** sourceRefs of imported characters to feature (the commanders' warlords). */
  characterRefs: string[];
};
export type ImportedCharacter = {
  sourceRef: string;
  slug: string;
  name: string;
  title: string | null;
  faction: string | null;
  status: CharacterStatus;
  summary: string | null;
  body: string;
  /** 11th edition statline, shown in the 3rd edition style. */
  profile: EleventhProfile | null;
  /** The commander (player profile) the character belongs to. */
  playedBy: string | null;
  wargear: string[];
  published: boolean;
};
export type ControlShare = { faction: string; share: number };
export type ControlSnapshot = {
  regionName: string;
  shares: ControlShare[];
  asOf: string;
};

// ---------- Helpers ----------

/** The theatre part of "The Ash Wastes - Nomad Trail". */
export const theatreOf = (name: string | null) => (name ?? "").split(" - ")[0].trim() || null;
export const sectorOf = (name: string | null) => (name ?? "").split(" - ")[1]?.trim() || null;

/** Plain text to Markdown paragraphs: single line breaks become paragraph breaks when there are none. */
export function toParagraphs(text: string): string {
  const t = text.replace(/\r\n/g, "\n").trim();
  return /\n\s*\n/.test(t)
    ? t
    : t
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join("\n\n");
}

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);

/** Territory metric columns and the factions they belong to (from the source app). */
export const CONTROL_FACTIONS: Record<string, string> = {
  imperium_control: "Imperium",
  chaos_corruption: "Chaos",
  ork_foothold: "Orks",
  tau_foothold: "T'au Empire",
  aeldari_foothold: "Aeldari",
  drukhari_foothold: "Drukhari",
  necron_foothold: "Necrons",
  tyranid_foothold: "Tyranids",
  genestealer_foothold: "Genestealer Cults",
  votann_foothold: "Leagues of Votann",
};

/** Faction scores to whole-number shares summing to 100 (largest remainder), largest first. */
export function controlShares(row: Territory): ControlShare[] {
  const scored = Object.entries(CONTROL_FACTIONS).map(([metric, faction]) => ({
    faction,
    score: Math.max(0, Number(row[metric]) || 0),
  }));
  const total = scored.reduce((s, f) => s + f.score, 0);
  if (total === 0) return [];
  const exact = scored.map((f) => (f.score / total) * 100);
  const shares = exact.map(Math.floor);
  let remaining = 100 - shares.reduce((a, b) => a + b, 0);
  for (const { i } of exact.map((v, i) => ({ i, rem: v - Math.floor(v) })).sort((a, b) => b.rem - a.rem)) {
    if (remaining <= 0) break;
    shares[i] += 1;
    remaining -= 1;
  }
  return scored
    .map((f, i) => ({ faction: f.faction, share: shares[i], score: f.score }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ faction, share }) => ({ faction, share }));
}

type Who = { name: string; faction: string | null };

function commander(profiles: Map<string, Profile>, id: string | null, fallback: string): Who {
  const p = id ? profiles.get(id) : undefined;
  const faction = p?.army_subfaction && p.army_faction ? `${p.army_subfaction}, ${p.army_faction}` : (p?.army_faction ?? p?.army_subfaction ?? null);
  return { name: p?.commander_name?.trim() || fallback, faction };
}

const label = (w: Who) => (w.faction ? `${w.name} (${w.faction})` : w.name);

// ---------- Builders ----------

/**
 * One draft narrative per fought battle that has any writing: each commander's
 * account is a chapter, the victor's TL;DR is the epigraph, and both warlords
 * are featured. Ordered by round so the latest round lists first.
 */
export function battleNarratives(matchups: Matchup[], awards: Award[], profiles: Profile[] = []): ImportedNarrative[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const awardsByMatch = new Map<string, Award[]>();
  for (const a of awards) if (a.matchup_id) awardsByMatch.set(a.matchup_id, [...(awardsByMatch.get(a.matchup_id) ?? []), a]);
  const text = (t: string | null | undefined) => t?.trim() || null;

  return matchups
    .filter((m) => m.status === "completed" && !m.uncontested)
    .filter((m) => [m.p1_lore, m.p2_lore, m.p1_tldr, m.p2_tldr].some(text))
    .sort((a, b) => (a.campaign_month ?? 0) - (b.campaign_month ?? 0))
    .map((m) => {
      const p1 = commander(byId, m.p1_id, "First commander");
      const p2 = commander(byId, m.p2_id, "Second commander");
      const theatre = theatreOf(m.theatre_name);
      const sector = sectorOf(m.theatre_name);
      const round = m.campaign_month ?? null;
      // Titles stay short for the banner; the subtitle names both sides and the result.
      const title = clip(`${sector ?? theatre ?? "Battle"}${round ? `, Round ${round}` : ""}`, 200);
      const scores = m.p1_score != null && m.p2_score != null;
      const subtitle = clip(
        m.game_result === "p1_win"
          ? `Victory for ${p1.name} over ${p2.name}${scores ? `, ${m.p1_score}–${m.p2_score} VP` : ""}`
          : m.game_result === "p2_win"
            ? `Victory for ${p2.name} over ${p1.name}${scores ? `, ${m.p2_score}–${m.p1_score} VP` : ""}`
            : m.game_result === "draw"
              ? `${p1.name} and ${p2.name} fought to a draw${scores ? `, ${m.p1_score}–${m.p2_score} VP` : ""}`
              : `${p1.name} vs ${p2.name}`,
        200,
      );

      const sides = [
        { who: p1, tldr: text(m.p1_tldr), lore: text(m.p1_lore) },
        { who: p2, tldr: text(m.p2_tldr), lore: text(m.p2_lore) },
      ];
      // The victor's TL;DR opens the account (on a draw, whoever wrote one first).
      const opener = (m.game_result === "p2_win" ? [sides[1], sides[0]] : sides).find((x) => x.tldr) ?? null;
      const chapters = sides
        // A side whose only writing is the epigraph needs no chapter of its own.
        .filter((x) => x.lore || (x.tldr && x !== opener))
        .map((x) =>
          [`## ${label(x.who)}`, x.tldr && x !== opener ? `> ${x.tldr.replace(/\s+/g, " ")}` : null, x.lore ? toParagraphs(x.lore) : null]
            .filter(Boolean)
            .join("\n\n"),
        );
      const deeds = awardsByMatch.get(m.id) ?? [];
      if (deeds.length) {
        chapters.push(
          [
            "## Deeds credited by Campaign Command",
            ...deeds.map((d) => {
              const who = d.commander_id === m.p1_id ? p1.name : d.commander_id === m.p2_id ? p2.name : null;
              return `- **${d.deed}**${who ? ` (${who})` : ""}${d.note ? `: ${d.note.trim()}` : ""}`;
            }),
          ].join("\n"),
        );
      }

      const featured = [m.p1_id, m.p2_id].map((id) => (id && byId.has(id) ? warlordRef(byId.get(id)!) : null)).filter((r): r is string => !!r);
      return {
        sourceRef: `slow-grow:matchup:${m.id}`,
        slug: slugify(`${sector ?? theatre ?? "battle"} round ${round ?? ""} ${m.id.slice(0, 8)}`),
        title,
        subtitle,
        epigraph: opener ? clip(opener.tldr!.replace(/\s+/g, " "), 1000) : null,
        epigraphSource: opener ? clip(opener.who.name, 200) : null,
        // The epigraph already carries the TL;DR; listings fall back to the subtitle.
        summary: null,
        body: chapters.join("\n\n"),
        published: false,
        regionName: theatre,
        characterRefs: featured,
      };
    });
}

/** The campaign's own global events, published as Events records. */
export function eventArticles(events: GlobalEvent[]): ImportedArticle[] {
  return events.map((e) => ({
    sourceRef: `slow-grow:event:${e.id}`,
    slug: slugify(e.title),
    title: e.title,
    category: "EVENT" as const,
    summary: clip([e.campaign_month ? `Round ${e.campaign_month}.` : null, e.description.split(/(?<=[.!?])\s/)[0]].filter(Boolean).join(" "), 480),
    body: [toParagraphs(e.description), e.rules_text?.trim() ? `## Battlefield conditions\n\n${toParagraphs(e.rules_text)}` : null].filter(Boolean).join("\n\n"),
    tags: ["slow-grow", ...(e.campaign_month ? [`round-${e.campaign_month}`] : [])],
    published: true,
    regionName: theatreOf(e.theatre_name),
  }));
}

/** Who holds each theatre, as of the export. */
export function controlSnapshots(territories: Territory[], state?: CampaignState | null): ControlSnapshot[] {
  const asOf =
    [state?.current_month ? `Round ${state.current_month}` : null, state?.points_limit ? `${state.points_limit.toLocaleString("en-US")} points` : null]
      .filter(Boolean)
      .join(" · ") || "Campaign snapshot";
  return territories.map((t) => ({
    regionName: t.name,
    shares: controlShares(t),
    asOf,
  }));
}

/** Each commander's army chronicle as a draft Factions record. */
export function armyArticles(profiles: Profile[]): ImportedArticle[] {
  return profiles
    .filter((p) => p.army_lore?.trim() && p.commander_name?.trim())
    .map((p) => {
      const force = p.army_subfaction?.trim() || p.army_faction?.trim() || "Army";
      return {
        sourceRef: `slow-grow:army:${p.id}`,
        slug: slugify(`${p.commander_name} ${force}`),
        title: clip(`${force} of ${p.commander_name!.trim()}`, 200),
        category: "FACTION" as const,
        summary: clip(`Army chronicle of ${p.commander_name!.trim()}${p.army_faction ? `, ${p.army_faction}` : ""}.`, 480),
        body: toParagraphs(p.army_lore!),
        tags: ["slow-grow", "army"],
        published: false,
        regionName: null,
      };
    });
}

const CHAMPION_STATS = [
  ["m", "M"],
  ["t", "T"],
  ["sv", "Sv"],
  ["invuln", "Inv"],
  ["w", "W"],
  ["ld", "Ld"],
  ["oc", "OC"],
] as const;

/** The champion's characteristics as an 11th edition statline, or null if none are set or they don't validate. */
function championProfile(c: Champion): EleventhProfile | null {
  const v = (k: (typeof CHAMPION_STATS)[number][0]) => c.stats?.[k]?.trim() ?? "";
  if (!CHAMPION_STATS.some(([k]) => v(k))) return null;
  const r = statProfile.safeParse({
    kind: "eleventh",
    name: clip(c.name.trim(), 60),
    m: v("m"),
    t: v("t"),
    sv: v("sv"),
    inv: v("invuln"),
    w: v("w"),
    ld: v("ld"),
    oc: v("oc"),
  });
  return r.success && r.data.kind === "eleventh" ? r.data : null;
}

/** "Bolt pistol (12", A1, BS3+, S4, AP0, D1; Pistol)": one wargear line per weapon. */
function weaponLine(w: Weapon) {
  const stats = [
    w.range?.trim() && w.range.trim() !== "Melee" ? w.range.trim() : null,
    w.a?.trim() && `A${w.a.trim()}`,
    w.bs?.trim() && `BS${w.bs.trim()}`,
    w.ws?.trim() && `WS${w.ws.trim()}`,
    w.s?.trim() && `S${w.s.trim()}`,
    w.ap?.trim() && `AP${w.ap.trim()}`,
    w.d?.trim() && `D${w.d.trim()}`,
  ].filter(Boolean);
  const detail = [stats.join(", "), w.keywords?.trim()].filter(Boolean).join("; ");
  return clip(detail ? `${w.name!.trim()} (${detail})` : w.name!.trim(), 200);
}

function championBody(c: Champion, statline: boolean) {
  const parts: string[] = [];
  const kind = [c.archetype?.trim(), c.specialism?.trim()].filter(Boolean).join(" · ");
  if (kind || c.points) parts.push([kind, c.points ? `${c.points} points` : ""].filter(Boolean).join(" · "));
  // Stats that would not fit a statline stay readable as a table.
  const stats = statline ? [] : CHAMPION_STATS.filter(([k]) => c.stats?.[k]?.trim());
  if (stats.length) {
    parts.push(
      [`| ${stats.map(([, h]) => h).join(" | ")} |`, `| ${stats.map(() => "---").join(" | ")} |`, `| ${stats.map(([k]) => c.stats![k]!.trim()).join(" | ")} |`].join(
        "\n",
      ),
    );
  }
  if (c.abilities?.trim()) parts.push(`## Abilities\n\n${toParagraphs(c.abilities.trim())}`);
  if (c.keywords?.trim()) parts.push(`**Keywords:** ${c.keywords.trim()}`);
  return parts.join("\n\n");
}

/**
 * Each commander's warlord and champions (their Crucible datasheets) as draft
 * characters. The first datasheet is the warlord. Profiles from before the
 * datasheet builder may carry only the legacy warlord_name.
 */
const namedChampions = (p: Profile) => p.champions.filter((c) => c.name?.trim() && !/^Champion \d+$/.test(c.name.trim()));

/** sourceRef of the commander's warlord character, if the import makes one. */
export function warlordRef(p: Profile): string | null {
  if (!p.commander_name?.trim()) return null;
  const [first] = namedChampions(p);
  return first ? `slow-grow:warlord:${p.id}:${first.id}` : p.warlord_name?.trim() ? `slow-grow:warlord:${p.id}` : null;
}

export function warlordCharacters(profiles: Profile[]): ImportedCharacter[] {
  return profiles
    .filter((p) => p.commander_name?.trim())
    .flatMap((p) => {
      const faction = p.army_subfaction?.trim() || p.army_faction?.trim() || null;
      const playedBy = clip(p.commander_name!.trim(), 80);
      const army = `${p.commander_name!.trim()}'s ${p.army_faction?.trim() || "army"}`;
      const champions = namedChampions(p);
      if (!champions.length && p.warlord_name?.trim()) {
        const name = p.warlord_name.trim();
        return [
          {
            sourceRef: `slow-grow:warlord:${p.id}`,
            slug: slugify(name),
            name,
            title: "Warlord",
            faction,
            playedBy,
            status: "UNKNOWN" as const,
            summary: clip(`Warlord of ${army} in the Siege of Vespera.`, 480),
            body: "",
            profile: null,
            wargear: [],
            published: false,
          },
        ];
      }
      return champions.map((c, i) => {
        const profile = championProfile(c);
        return {
          sourceRef: `slow-grow:warlord:${p.id}:${c.id}`,
          slug: slugify(c.name.trim()),
          name: clip(c.name.trim(), 120),
          title: i === 0 ? "Warlord" : "Champion",
          faction,
          playedBy,
          status: "UNKNOWN" as const,
          summary: clip(`${i === 0 ? "Warlord" : "Champion"} of ${army} in the Siege of Vespera.`, 480),
          body: championBody(c, !!profile),
          profile,
          wargear: [...(c.rangedWeapons ?? []), ...(c.meleeWeapons ?? [])].filter((w) => w.name?.trim()).map(weaponLine),
          published: false,
        };
      });
    });
}

// ---------- CSV (for the profiles export) ----------

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim() !== ""));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ""])));
}

/** Profiles from the CSV export; only the columns the import uses are kept. */
export function profilesFromCsv(text: string): Profile[] {
  const blank = (v?: string) => (v && v.trim() && v.trim().toUpperCase() !== "NULL" ? v : null);
  return parseCsv(text)
    .filter((r) => r.id)
    .map((r) => ({
      id: r.id,
      commander_name: blank(r.commander_name),
      army_faction: blank(r.army_faction),
      army_subfaction: blank(r.army_subfaction),
      army_lore: blank(r.army_lore),
      warlord_name: blank(r.warlord_name),
      champions: champions(r.crucible_datasheets),
    }));
}

/** The crucible_datasheets JSON column; anything malformed is dropped. */
function champions(raw?: string): Champion[] {
  if (!raw?.trim()) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((c): c is Champion => !!c && typeof c === "object" && typeof c.id === "string" && typeof c.name === "string") : [];
  } catch {
    return [];
  }
}
