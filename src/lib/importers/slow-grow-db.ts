import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { ControlSnapshot, ImportedArticle, ImportedCharacter, ImportedNarrative } from "./slow-grow";

/**
 * Writes slow-grow records into a world. Each record is matched by sourceRef;
 * sourceHash remembers what the importer last wrote, so a re-run updates a
 * record only if nobody has edited it since, and never touches CMS edits.
 */

export type SlowGrowBatch = {
  articles: ImportedArticle[];
  characters: ImportedCharacter[];
  narratives: ImportedNarrative[];
  control: ControlSnapshot[];
};
export type SlowGrowReport = {
  created: string[];
  updated: string[];
  kept: string[];
  removed: string[];
  unmatchedRegions: string[];
};

/** Battle reports were first imported as lore records; they are narratives now. */
const RETIRED_ARTICLE_REFS = "slow-grow:matchup:";

export const contentHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);

const articleContent = (a: { title: string; category: string; summary: string | null; body: string; tags: string[]; regionId: string | null }) =>
  contentHash([a.title, a.category, a.summary, a.body, a.tags, a.regionId]);
const characterContent = (c: {
  name: string;
  title: string | null;
  faction: string | null;
  status: string;
  summary: string | null;
  body: string;
  profile: unknown;
  wargear: string[];
}) => contentHash([c.name, c.title, c.faction, c.status, c.summary, c.body, c.profile ?? null, c.wargear]);
const narrativeContent = (n: {
  title: string;
  subtitle: string | null;
  epigraph: string | null;
  epigraphSource: string | null;
  summary: string | null;
  body: string;
  regionId: string | null;
  characterIds: string[];
}) => contentHash([n.title, n.subtitle, n.epigraph, n.epigraphSource, n.summary, n.body, n.regionId, [...n.characterIds].sort()]);

/** A slug free in this world: the wanted one, else with -2, -3… */
async function freeSlug(taken: (slug: string) => Promise<boolean>, wanted: string) {
  for (let n = 1; ; n++) {
    const slug = n === 1 ? wanted : `${wanted}-${n}`;
    if (!(await taken(slug))) return slug;
  }
}

export async function importSlowGrow(db: PrismaClient, worldSlug: string, batch: SlowGrowBatch): Promise<SlowGrowReport> {
  const report: SlowGrowReport = {
    created: [],
    updated: [],
    kept: [],
    removed: [],
    unmatchedRegions: [],
  };
  const world = await db.world.findUnique({ where: { slug: worldSlug } });
  if (!world) throw new Error(`World "${worldSlug}" not found. Run \`npm run db:import-worlds\` first.`);
  const planet = await db.planet.findFirst({
    where: { system: { worldId: world.id } },
    orderBy: { orbitIndex: "asc" },
    include: { regions: true },
  });
  if (!planet) throw new Error(`World "${worldSlug}" has no planet.`);
  const regionByName = new Map(planet.regions.map((r) => [r.name.toLowerCase(), r]));
  const regionId = (name: string | null) => {
    if (!name) return null;
    const r = regionByName.get(name.toLowerCase());
    if (!r && !report.unmatchedRegions.includes(name)) report.unmatchedRegions.push(name);
    return r?.id ?? null;
  };
  const author = { authorId: world.ownerId };

  for (const a of batch.articles) {
    const fields = {
      title: a.title,
      category: a.category,
      summary: a.summary,
      body: a.body,
      tags: a.tags,
      regionId: regionId(a.regionName),
    };
    const hash = articleContent(fields);
    const existing = await db.article.findUnique({
      where: {
        worldId_sourceRef: { worldId: world.id, sourceRef: a.sourceRef },
      },
    });
    if (!existing) {
      const slug = await freeSlug(
        async (s) =>
          !!(await db.article.findUnique({
            where: { worldId_slug: { worldId: world.id, slug: s } },
          })),
        a.slug,
      );
      await db.article.create({
        data: {
          ...fields,
          ...author,
          slug,
          published: a.published,
          worldId: world.id,
          systemId: planet.systemId,
          planetId: planet.id,
          sourceRef: a.sourceRef,
          sourceHash: hash,
        },
      });
      report.created.push(`record ${a.title}`);
    } else if (existing.sourceHash === hash) {
      report.kept.push(`record ${a.title}`);
    } else if (articleContent(existing) === existing.sourceHash) {
      await db.article.update({
        where: { id: existing.id },
        data: { ...fields, sourceHash: hash },
      });
      report.updated.push(`record ${a.title}`);
    } else report.kept.push(`record ${a.title} (edited in the CMS)`);
  }

  for (const c of batch.characters) {
    const fields = {
      name: c.name,
      title: c.title,
      faction: c.faction,
      status: c.status,
      summary: c.summary,
      body: c.body,
      wargear: c.wargear,
    };
    const profile = c.profile ? (c.profile as Prisma.InputJsonValue) : Prisma.DbNull;
    const hash = characterContent({ ...fields, profile: c.profile });
    const existing = await db.character.findUnique({
      where: {
        worldId_sourceRef: { worldId: world.id, sourceRef: c.sourceRef },
      },
    });
    if (!existing) {
      const slug = await freeSlug(
        async (s) =>
          !!(await db.character.findUnique({
            where: { worldId_slug: { worldId: world.id, slug: s } },
          })),
        c.slug,
      );
      await db.character.create({
        data: {
          ...fields,
          profile,
          playedBy: c.playedBy,
          ...author,
          slug,
          published: c.published,
          sortOrder: 100,
          worldId: world.id,
          sourceRef: c.sourceRef,
          sourceHash: hash,
        },
      });
      report.created.push(`character ${c.name}`);
      continue;
    }
    // Which commander a character belongs to is bookkeeping, not content: fill it in when missing, whatever else was edited.
    if (c.playedBy && !existing.playedBy) await db.character.update({ where: { id: existing.id }, data: { playedBy: c.playedBy } });
    if (existing.sourceHash === hash) {
      report.kept.push(`character ${c.name}`);
    } else if (characterContent(existing) === existing.sourceHash) {
      await db.character.update({
        where: { id: existing.id },
        data: { ...fields, profile, sourceHash: hash },
      });
      report.updated.push(`character ${c.name}`);
    } else report.kept.push(`character ${c.name} (edited in the CMS)`);
  }

  // After characters, so each battle can feature the commanders' warlords.
  const characterIdByRef = new Map(
    (await db.character.findMany({ where: { worldId: world.id, sourceRef: { not: null } }, select: { id: true, sourceRef: true } })).map((c) => [c.sourceRef!, c.id]),
  );
  for (const n of batch.narratives) {
    const characterIds = n.characterRefs.flatMap((ref) => characterIdByRef.get(ref) ?? []);
    const fields = {
      title: n.title,
      subtitle: n.subtitle,
      epigraph: n.epigraph,
      epigraphSource: n.epigraphSource,
      summary: n.summary,
      body: n.body,
      regionId: regionId(n.regionName),
    };
    const hash = narrativeContent({ ...fields, characterIds });
    const existing = await db.narrative.findUnique({
      where: { worldId_sourceRef: { worldId: world.id, sourceRef: n.sourceRef } },
      include: { characters: { select: { id: true } } },
    });
    const characters = characterIds.map((id) => ({ id }));
    if (!existing) {
      const slug = await freeSlug(async (s) => !!(await db.narrative.findUnique({ where: { worldId_slug: { worldId: world.id, slug: s } } })), n.slug);
      await db.narrative.create({
        data: {
          ...fields,
          ...author,
          slug,
          published: n.published,
          worldId: world.id,
          planetId: planet.id,
          sourceRef: n.sourceRef,
          sourceHash: hash,
          characters: { connect: characters },
        },
      });
      report.created.push(`narrative ${n.title}`);
    } else if (existing.sourceHash === hash) {
      report.kept.push(`narrative ${n.title}`);
    } else if (narrativeContent({ ...existing, characterIds: existing.characters.map((c) => c.id) }) === existing.sourceHash) {
      await db.narrative.update({ where: { id: existing.id }, data: { ...fields, sourceHash: hash, characters: { set: characters } } });
      report.updated.push(`narrative ${n.title}`);
    } else report.kept.push(`narrative ${n.title} (edited in the CMS)`);
  }

  // Remove the old lore copies of battle reports, unless someone edited one.
  for (const a of await db.article.findMany({ where: { worldId: world.id, sourceRef: { startsWith: RETIRED_ARTICLE_REFS } } })) {
    if (articleContent(a) === a.sourceHash) {
      await db.article.delete({ where: { id: a.id } });
      report.removed.push(`record ${a.title}`);
    } else report.kept.push(`record ${a.title} (edited in the CMS; now duplicated by its narrative)`);
  }

  // A snapshot fills in control only where none is set, so hand edits stand.
  for (const s of batch.control) {
    const id = regionId(s.regionName);
    if (!id || !s.shares.length) continue;
    const region = planet.regions.find((r) => r.id === id)!;
    if (region.control) {
      report.kept.push(`control of ${region.name}`);
      continue;
    }
    await db.region.update({
      where: { id },
      data: { control: s.shares as Prisma.InputJsonValue, controlAsOf: s.asOf },
    });
    report.created.push(`control of ${region.name}`);
  }

  return report;
}
