import { Prisma, type User } from "@prisma/client";
import type { z } from "zod";
import { db } from "./db";
import type { articleSchema, planetSchema, systemSchema, worldSchema } from "./validation";

/**
 * Content mutations with authorization. Admins may edit any world; editors
 * only the worlds they own. Server actions call these after validating input.
 */

export class ContentError extends Error {
  constructor(
    message: string,
    public field: string = "_form",
  ) {
    super(message);
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("You do not have permission to edit this world");
  }
}

type Actor = Pick<User, "id" | "role">;
type WorldInput = z.output<typeof worldSchema>;
type ArticleInput = z.output<typeof articleSchema>;
type SystemInput = z.output<typeof systemSchema>;
type PlanetInput = z.output<typeof planetSchema>;

export async function assertCanEditWorld(actor: Actor, worldId: string) {
  const world = await db.world.findUnique({ where: { id: worldId }, select: { id: true, ownerId: true } });
  if (!world) throw new ContentError("World not found");
  if (actor.role !== "ADMIN" && world.ownerId !== actor.id) throw new ForbiddenError();
  return world;
}

export function editableWorldsWhere(actor: Actor): Prisma.WorldWhereInput {
  return actor.role === "ADMIN" ? {} : { ownerId: actor.id };
}

/** Translate unique-constraint failures on slug into a friendly field error. */
async function guardSlug<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ContentError("That slug is already in use", "slug");
    }
    throw e;
  }
}

async function assertMediaInWorld(mediaId: string | null | undefined, worldId: string, field = "coverImageId") {
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
  await assertCanEditWorld(actor, worldId);
  await assertMediaInWorld(data.coverImageId, worldId);
  return guardSlug(() => db.world.update({ where: { id: worldId }, data }));
}

export async function deleteWorld(actor: Actor, worldId: string) {
  await assertCanEditWorld(actor, worldId);
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
}

export async function createArticle(actor: Actor, worldId: string, data: ArticleInput) {
  await assertCanEditWorld(actor, worldId);
  await assertArticleLinks(worldId, data);
  return guardSlug(() => db.article.create({ data: { ...data, worldId } }));
}

export async function updateArticle(actor: Actor, articleId: string, data: ArticleInput) {
  const article = await db.article.findUnique({ where: { id: articleId }, select: { worldId: true } });
  if (!article) throw new ContentError("Article not found");
  await assertCanEditWorld(actor, article.worldId);
  await assertArticleLinks(article.worldId, data);
  return guardSlug(() => db.article.update({ where: { id: articleId }, data }));
}

export async function deleteArticle(actor: Actor, articleId: string) {
  const article = await db.article.findUnique({ where: { id: articleId }, select: { worldId: true } });
  if (!article) return;
  await assertCanEditWorld(actor, article.worldId);
  await db.article.delete({ where: { id: articleId } });
}

// ---------- Star systems ----------

function systemData(data: SystemInput) {
  return { ...data, theme: data.theme as unknown as Prisma.InputJsonObject };
}

export async function createSystem(actor: Actor, worldId: string, data: SystemInput) {
  await assertCanEditWorld(actor, worldId);
  await assertMediaInWorld(data.backdropImageId, worldId, "backdropImageId");
  return guardSlug(() => db.starSystem.create({ data: { ...systemData(data), worldId } }));
}

export async function updateSystem(actor: Actor, systemId: string, data: SystemInput) {
  const sys = await db.starSystem.findUnique({ where: { id: systemId }, select: { worldId: true } });
  if (!sys) throw new ContentError("Star system not found");
  await assertCanEditWorld(actor, sys.worldId);
  await assertMediaInWorld(data.backdropImageId, sys.worldId, "backdropImageId");
  return guardSlug(() => db.starSystem.update({ where: { id: systemId }, data: systemData(data) }));
}

export async function deleteSystem(actor: Actor, systemId: string) {
  const sys = await db.starSystem.findUnique({ where: { id: systemId }, select: { worldId: true } });
  if (!sys) return;
  await assertCanEditWorld(actor, sys.worldId);
  await db.starSystem.delete({ where: { id: systemId } });
}

// ---------- Planets ----------

function planetData(data: PlanetInput) {
  const { genParams, ...rest } = data;
  return { ...rest, genParams: genParams === null ? Prisma.DbNull : (genParams as Prisma.InputJsonObject) };
}

export async function createPlanet(actor: Actor, systemId: string, data: PlanetInput) {
  const sys = await db.starSystem.findUnique({ where: { id: systemId }, select: { worldId: true } });
  if (!sys) throw new ContentError("Star system not found");
  await assertCanEditWorld(actor, sys.worldId);
  await assertMediaInWorld(data.coverImageId, sys.worldId);
  return guardSlug(() => db.planet.create({ data: { ...planetData(data), systemId } }));
}

export async function updatePlanet(actor: Actor, planetId: string, data: PlanetInput) {
  const planet = await db.planet.findUnique({
    where: { id: planetId },
    select: { system: { select: { worldId: true } } },
  });
  if (!planet) throw new ContentError("Planet not found");
  await assertCanEditWorld(actor, planet.system.worldId);
  await assertMediaInWorld(data.coverImageId, planet.system.worldId);
  return guardSlug(() => db.planet.update({ where: { id: planetId }, data: planetData(data) }));
}

export async function deletePlanet(actor: Actor, planetId: string) {
  const planet = await db.planet.findUnique({
    where: { id: planetId },
    select: { system: { select: { worldId: true } } },
  });
  if (!planet) return;
  await assertCanEditWorld(actor, planet.system.worldId);
  await db.planet.delete({ where: { id: planetId } });
}
