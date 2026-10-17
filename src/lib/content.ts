import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "./db";
import { canContribute, canEditRecord, canManageWorld, isAdmin, type Actor } from "./permissions";
import { pruneRecording } from "./recordings";
import type { articleSchema, planetSchema, regionSchema, systemSchema, worldSchema } from "./validation";

/**
 * Content mutations with authorization (rules in permissions.ts). Server
 * actions call these after validating input; every create records the author
 * and every update/delete checks it.
 */

export type { Actor };

export class ContentError extends Error {
  constructor(
    message: string,
    public field: string = "_form",
  ) {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to edit this world") {
    super(message);
  }
}

type WorldInput = z.output<typeof worldSchema>;
type ArticleInput = z.output<typeof articleSchema>;
type SystemInput = z.output<typeof systemSchema>;
type PlanetInput = z.output<typeof planetSchema>;
type RegionInput = z.output<typeof regionSchema>;

async function findWorld(worldId: string) {
  const world = await db.world.findUnique({ where: { id: worldId }, select: { id: true, ownerId: true, published: true } });
  if (!world) throw new ContentError("World not found");
  return world;
}

/** World settings, publishing and deletion: owner or admin. */
export async function assertCanManageWorld(actor: Actor, worldId: string) {
  const world = await findWorld(worldId);
  if (!canManageWorld(actor, world)) throw new ForbiddenError();
  return world;
}

/** Adding records to a world: published worlds, or worlds the actor owns. */
export async function assertCanContribute(actor: Actor, worldId: string) {
  const world = await findWorld(worldId);
  if (!canContribute(actor, world)) throw new ForbiddenError("You do not have permission to add to this world");
  return world;
}

/** Editing or deleting a record: its author or an admin. */
export function assertCanEditRecord(actor: Actor, record: { authorId: string | null }) {
  if (!canEditRecord(actor, record)) {
    throw new ForbiddenError("You do not have permission to change another contributor's record");
  }
}

/** Worlds shown on a user's CMS dashboard. */
export function accessibleWorldsWhere(actor: Actor): Prisma.WorldWhereInput {
  return isAdmin(actor) ? {} : { OR: [{ ownerId: actor.id }, { published: true }] };
}

/** Translate unique-constraint failures on slug into a friendly field error. */
export async function guardSlug<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ContentError("That slug is already in use", "slug");
    }
    throw e;
  }
}

export async function assertMediaInWorld(mediaId: string | null | undefined, worldId: string, field = "coverImageId") {
  if (!mediaId) return;
  const media = await db.media.findUnique({ where: { id: mediaId }, select: { worldId: true } });
  if (!media || (media.worldId !== null && media.worldId !== worldId)) {
    throw new ContentError("Selected image does not belong to this world", field);
  }
}

// ---------- Worlds ----------

export async function createWorld(actor: Actor, data: WorldInput) {
  return guardSlug(() => db.world.create({ data: { ...data, ownerId: actor.id } }));
}

export async function updateWorld(actor: Actor, worldId: string, data: WorldInput) {
  await assertCanManageWorld(actor, worldId);
  await assertMediaInWorld(data.coverImageId, worldId);
  return guardSlug(() => db.world.update({ where: { id: worldId }, data }));
}

export async function deleteWorld(actor: Actor, worldId: string) {
  await assertCanManageWorld(actor, worldId);
  await db.world.delete({ where: { id: worldId } });
}

// ---------- Articles ----------

async function assertArticleLinks(worldId: string, data: ArticleInput) {
  await assertMediaInWorld(data.coverImageId, worldId);
  if (data.systemId) {
    const sys = await db.starSystem.findFirst({ where: { id: data.systemId, worldId } });
    if (!sys) throw new ContentError("Star system not found in this world", "systemId");
  }
  if (data.planetId) {
    const planet = await db.planet.findFirst({ where: { id: data.planetId, system: { worldId } } });
    if (!planet) throw new ContentError("Planet not found in this world", "planetId");
  }
  await assertRegionInWorld(data.regionId, worldId, data.planetId);
}

/** A linked region must be in the world and, if a planet is chosen too, on that planet. */
export async function assertRegionInWorld(regionId: string | null | undefined, worldId: string, planetId?: string | null) {
  if (!regionId) return;
  const region = await db.region.findFirst({ where: { id: regionId, planet: { system: { worldId } } } });
  if (!region) throw new ContentError("Region not found in this world", "regionId");
  if (planetId && region.planetId !== planetId) throw new ContentError("That region is on a different planet", "regionId");
}

/**
 * A narration must be a recording in this world, made by the actor (or any, for
 * an admin), and not already narrating something else. Keeping the current one is always fine.
 */
export async function assertNarration(actor: Actor, worldId: string, narrationId: string | null | undefined, current: string | null = null) {
  if (!narrationId || narrationId === current) return;
  const r = await db.recording.findUnique({
    where: { id: narrationId },
    select: { worldId: true, uploadedById: true, article: { select: { id: true } }, narrative: { select: { id: true } } },
  });
  if (!r || r.worldId !== worldId) throw new ContentError("Recording not found in this world", "narrationId");
  if (!isAdmin(actor) && r.uploadedById !== actor.id) throw new ContentError("You can only attach recordings you made", "narrationId");
  if (r.article || r.narrative) throw new ContentError("That recording already narrates another entry", "narrationId");
}

export async function createArticle(actor: Actor, worldId: string, data: ArticleInput) {
  await assertCanContribute(actor, worldId);
  await assertArticleLinks(worldId, data);
  await assertNarration(actor, worldId, data.narrationId);
  return guardSlug(() => db.article.create({ data: { ...data, worldId, authorId: actor.id } }));
}

async function findArticle(id: string) {
  return db.article.findUnique({ where: { id }, select: { worldId: true, authorId: true, narrationId: true } });
}

export async function updateArticle(actor: Actor, articleId: string, data: ArticleInput) {
  const article = await findArticle(articleId);
  if (!article) throw new ContentError("Article not found");
  assertCanEditRecord(actor, article);
  await assertArticleLinks(article.worldId, data);
  await assertNarration(actor, article.worldId, data.narrationId, article.narrationId);
  const updated = await guardSlug(() => db.article.update({ where: { id: articleId }, data }));
  if (article.narrationId !== updated.narrationId) await pruneRecording(article.narrationId);
  return updated;
}

export async function deleteArticle(actor: Actor, articleId: string) {
  const article = await findArticle(articleId);
  if (!article) return;
  assertCanEditRecord(actor, article);
  await db.article.delete({ where: { id: articleId } });
  await pruneRecording(article.narrationId);
}

// ---------- Star systems ----------

function systemData(data: SystemInput) {
  return { ...data, theme: data.theme as unknown as Prisma.InputJsonObject };
}

export async function createSystem(actor: Actor, worldId: string, data: SystemInput) {
  await assertCanContribute(actor, worldId);
  await assertMediaInWorld(data.backdropImageId, worldId, "backdropImageId");
  return guardSlug(() => db.starSystem.create({ data: { ...systemData(data), worldId, authorId: actor.id } }));
}

async function findSystem(id: string) {
  return db.starSystem.findUnique({ where: { id }, select: { worldId: true, authorId: true } });
}

export async function updateSystem(actor: Actor, systemId: string, data: SystemInput) {
  const sys = await findSystem(systemId);
  if (!sys) throw new ContentError("Star system not found");
  assertCanEditRecord(actor, sys);
  await assertMediaInWorld(data.backdropImageId, sys.worldId, "backdropImageId");
  return guardSlug(() => db.starSystem.update({ where: { id: systemId }, data: systemData(data) }));
}

/** Deleting a system also deletes its planets, so non-admins may only do it when every planet is theirs too. */
export async function deleteSystem(actor: Actor, systemId: string) {
  const sys = await findSystem(systemId);
  if (!sys) return;
  assertCanEditRecord(actor, sys);
  if (!isAdmin(actor)) {
    const others = await db.planet.count({
      where: { systemId, OR: [{ authorId: null }, { authorId: { not: actor.id } }] },
    });
    if (others > 0) {
      throw new ForbiddenError("You do not have permission to delete planets other contributors added to this system");
    }
  }
  await db.starSystem.delete({ where: { id: systemId } });
}

// ---------- Planets ----------

function planetData(data: PlanetInput) {
  const { genParams, ...rest } = data;
  return { ...rest, genParams: genParams === null ? Prisma.DbNull : (genParams as Prisma.InputJsonObject) };
}

/** Anyone who may contribute to the world may add a planet to any of its systems. */
export async function createPlanet(actor: Actor, systemId: string, data: PlanetInput) {
  const sys = await findSystem(systemId);
  if (!sys) throw new ContentError("Star system not found");
  await assertCanContribute(actor, sys.worldId);
  await assertMediaInWorld(data.coverImageId, sys.worldId);
  await assertMediaInWorld(data.textureImageId, sys.worldId, "textureImageId");
  return guardSlug(() => db.planet.create({ data: { ...planetData(data), systemId, authorId: actor.id } }));
}

async function findPlanet(id: string) {
  return db.planet.findUnique({ where: { id }, select: { authorId: true, system: { select: { worldId: true } } } });
}

export async function updatePlanet(actor: Actor, planetId: string, data: PlanetInput) {
  const planet = await findPlanet(planetId);
  if (!planet) throw new ContentError("Planet not found");
  assertCanEditRecord(actor, planet);
  await assertMediaInWorld(data.coverImageId, planet.system.worldId);
  await assertMediaInWorld(data.textureImageId, planet.system.worldId, "textureImageId");
  return guardSlug(() => db.planet.update({ where: { id: planetId }, data: planetData(data) }));
}

/** Deleting a planet also deletes its regions, so non-admins may only do it when every region is theirs too. */
export async function deletePlanet(actor: Actor, planetId: string) {
  const planet = await findPlanet(planetId);
  if (!planet) return;
  assertCanEditRecord(actor, planet);
  if (!isAdmin(actor)) {
    const others = await db.region.count({ where: { planetId, OR: [{ authorId: null }, { authorId: { not: actor.id } }] } });
    if (others > 0) throw new ForbiddenError("You do not have permission to delete regions other contributors added to this planet");
  }
  await db.planet.delete({ where: { id: planetId } });
}

// ---------- Planet regions ----------

const regionData = (d: RegionInput) => ({ ...d, sectors: d.sectors as Prisma.InputJsonValue });

/** Anyone who may contribute to the world may add a region to any of its planets. */
export async function createRegion(actor: Actor, planetId: string, data: RegionInput) {
  const planet = await findPlanet(planetId);
  if (!planet) throw new ContentError("Planet not found");
  await assertCanContribute(actor, planet.system.worldId);
  return guardSlug(() => db.region.create({ data: { ...regionData(data), planetId, authorId: actor.id } }));
}

async function findRegion(id: string) {
  return db.region.findUnique({ where: { id }, select: { authorId: true } });
}

export async function updateRegion(actor: Actor, regionId: string, data: RegionInput) {
  const region = await findRegion(regionId);
  if (!region) throw new ContentError("Region not found");
  assertCanEditRecord(actor, region);
  return guardSlug(() => db.region.update({ where: { id: regionId }, data: regionData(data) }));
}

export async function deleteRegion(actor: Actor, regionId: string) {
  const region = await findRegion(regionId);
  if (!region) return;
  assertCanEditRecord(actor, region);
  await db.region.delete({ where: { id: regionId } });
}

// ---------- Media ----------

/** Uploads are shared within a world; only the uploader or an admin may change or remove one. */
export async function assertCanEditMedia(actor: Actor, mediaId: string) {
  const media = await db.media.findUnique({ where: { id: mediaId } });
  if (!media) return null;
  if (!isAdmin(actor) && media.uploadedById !== actor.id) {
    throw new ForbiddenError("You do not have permission to change another contributor's image");
  }
  return media;
}
