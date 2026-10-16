import { Prisma, type ArticleCategory, type CharacterStatus, type PrismaClient } from "@prisma/client";

/**
 * Imports a world described as data (see src/lib/worlds/). Create-only and
 * idempotent: anything that already exists, matched by slug, is left exactly
 * as it is, so edits made in the CMS are never overwritten and re-running is safe.
 */

export type WorldSpec = {
  world: { slug: string; name: string; tagline?: string; summary?: string; published: boolean };
  system: {
    slug: string;
    name: string;
    starType?: string;
    segmentum?: string;
    description?: string;
    x: number;
    y: number;
    z: number;
    published: boolean;
  };
  planet: {
    slug: string;
    name: string;
    classification?: string;
    description?: string;
    population?: string;
    titheGrade?: string;
    orbitIndex: number;
    genParams?: Record<string, unknown>;
    published: boolean;
  };
  regions: {
    slug: string;
    name: string;
    kind?: string;
    summary?: string;
    terrain?: string;
    lat: number;
    lng: number;
    sectors: { name: string; pointsLevel?: number; shape?: string; cx?: number; cy?: number }[];
  }[];
  articles: {
    slug: string;
    title: string;
    category: ArticleCategory;
    summary?: string;
    body: string;
    tags?: string[];
    published: boolean;
  }[];
  characters: {
    slug: string;
    name: string;
    title?: string;
    faction?: string;
    status: CharacterStatus;
    quote?: string;
    quoteSource?: string;
    summary?: string;
    body: string;
    sortOrder: number;
    published: boolean;
  }[];
  narratives: {
    slug: string;
    title: string;
    subtitle?: string;
    epigraph?: string;
    epigraphSource?: string;
    summary?: string;
    body: string;
    /** Character slugs featured in the narrative. */
    characters: string[];
    published: boolean;
  }[];
};

export type ImportReport = { created: string[]; skipped: string[] };

export async function importWorld(db: PrismaClient, ownerId: string, spec: WorldSpec): Promise<ImportReport> {
  const report: ImportReport = { created: [], skipped: [] };
  const note = (made: boolean, label: string) => (made ? report.created : report.skipped).push(label);

  let world = await db.world.findUnique({ where: { slug: spec.world.slug } });
  if (!world) {
    world = await db.world.create({ data: { ...spec.world, ownerId } });
    note(true, `world ${spec.world.name}`);
  } else note(false, `world ${spec.world.name}`);
  const author = { authorId: world.ownerId };

  let system = await db.starSystem.findUnique({ where: { worldId_slug: { worldId: world.id, slug: spec.system.slug } } });
  if (!system) {
    system = await db.starSystem.create({ data: { ...spec.system, ...author, worldId: world.id } });
    note(true, `system ${spec.system.name}`);
  } else note(false, `system ${spec.system.name}`);

  let planet = await db.planet.findUnique({ where: { systemId_slug: { systemId: system.id, slug: spec.planet.slug } } });
  if (!planet) {
    const { genParams, ...rest } = spec.planet;
    planet = await db.planet.create({
      data: { ...rest, ...author, systemId: system.id, genParams: (genParams as Prisma.InputJsonObject) ?? Prisma.DbNull },
    });
    note(true, `planet ${spec.planet.name}`);
  } else note(false, `planet ${spec.planet.name}`);

  for (const [i, r] of spec.regions.entries()) {
    const exists = await db.region.findUnique({ where: { planetId_slug: { planetId: planet.id, slug: r.slug } } });
    if (!exists) {
      await db.region.create({
        data: { ...r, sectors: r.sectors as Prisma.InputJsonValue, sortOrder: i, published: spec.planet.published, ...author, planetId: planet.id },
      });
    }
    note(!exists, `region ${r.name}`);
  }

  const located = { systemId: system.id, planetId: planet.id };

  for (const a of spec.articles) {
    const exists = await db.article.findUnique({ where: { worldId_slug: { worldId: world.id, slug: a.slug } } });
    if (!exists) await db.article.create({ data: { ...a, tags: a.tags ?? [], ...author, ...located, worldId: world.id } });
    note(!exists, `record ${a.title}`);
  }

  for (const c of spec.characters) {
    const exists = await db.character.findUnique({ where: { worldId_slug: { worldId: world.id, slug: c.slug } } });
    if (!exists) await db.character.create({ data: { ...c, ...author, homeworldId: planet.id, worldId: world.id } });
    note(!exists, `character ${c.name}`);
  }

  for (const n of spec.narratives) {
    const exists = await db.narrative.findUnique({ where: { worldId_slug: { worldId: world.id, slug: n.slug } } });
    if (!exists) {
      const { characters, ...rest } = n;
      const featured = await db.character.findMany({ where: { worldId: world.id, slug: { in: characters } }, select: { id: true } });
      await db.narrative.create({
        data: { ...rest, ...author, planetId: planet.id, worldId: world.id, characters: { connect: featured } },
      });
    }
    note(!exists, `narrative ${n.title}`);
  }

  return report;
}
