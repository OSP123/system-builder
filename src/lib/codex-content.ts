import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "./db";
import { assertCanEditWorld, assertMediaInWorld, ContentError, guardSlug, type Actor } from "./content";
import type { characterSchema, narrativeSchema, unitSchema } from "./validation";

/** Mutations for characters, army list units and narratives, with the same ownership rules as content.ts. */

type CharacterInput = z.output<typeof characterSchema>;
type UnitInput = z.output<typeof unitSchema>;
type NarrativeInput = z.output<typeof narrativeSchema>;

const json = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));

async function assertPlanetInWorld(planetId: string | null | undefined, worldId: string, field: string) {
  if (!planetId) return;
  const planet = await db.planet.findFirst({ where: { id: planetId, system: { worldId } }, select: { id: true } });
  if (!planet) throw new ContentError("Planet not found in this world", field);
}

async function worldOf(model: "character" | "unit" | "narrative", id: string) {
  const row =
    model === "character"
      ? await db.character.findUnique({ where: { id }, select: { worldId: true } })
      : model === "unit"
        ? await db.unit.findUnique({ where: { id }, select: { worldId: true } })
        : await db.narrative.findUnique({ where: { id }, select: { worldId: true } });
  return row?.worldId ?? null;
}

// ---------- Characters ----------

function characterData(d: CharacterInput) {
  return { ...d, profile: json(d.profile), specialRules: json(d.specialRules) };
}

async function checkCharacter(worldId: string, d: CharacterInput) {
  await assertMediaInWorld(d.portraitImageId, worldId, "portraitImageId");
  await assertPlanetInWorld(d.homeworldId, worldId, "homeworldId");
}

export async function createCharacter(actor: Actor, worldId: string, d: CharacterInput) {
  await assertCanEditWorld(actor, worldId);
  await checkCharacter(worldId, d);
  return guardSlug(() => db.character.create({ data: { ...characterData(d), worldId } }));
}

export async function updateCharacter(actor: Actor, id: string, d: CharacterInput) {
  const worldId = await worldOf("character", id);
  if (!worldId) throw new ContentError("Character not found");
  await assertCanEditWorld(actor, worldId);
  await checkCharacter(worldId, d);
  return guardSlug(() => db.character.update({ where: { id }, data: characterData(d) }));
}

export async function deleteCharacter(actor: Actor, id: string) {
  const worldId = await worldOf("character", id);
  if (!worldId) return;
  await assertCanEditWorld(actor, worldId);
  await db.character.delete({ where: { id } });
}

// ---------- Units ----------

function unitData(d: UnitInput) {
  return { ...d, profiles: d.profiles as Prisma.InputJsonValue, specialRules: json(d.specialRules) };
}

export async function createUnit(actor: Actor, worldId: string, d: UnitInput) {
  await assertCanEditWorld(actor, worldId);
  await assertMediaInWorld(d.imageId, worldId, "imageId");
  return guardSlug(() => db.unit.create({ data: { ...unitData(d), worldId } }));
}

export async function updateUnit(actor: Actor, id: string, d: UnitInput) {
  const worldId = await worldOf("unit", id);
  if (!worldId) throw new ContentError("Unit not found");
  await assertCanEditWorld(actor, worldId);
  await assertMediaInWorld(d.imageId, worldId, "imageId");
  return guardSlug(() => db.unit.update({ where: { id }, data: unitData(d) }));
}

export async function deleteUnit(actor: Actor, id: string) {
  const worldId = await worldOf("unit", id);
  if (!worldId) return;
  await assertCanEditWorld(actor, worldId);
  await db.unit.delete({ where: { id } });
}

// ---------- Narratives ----------

async function checkNarrative(worldId: string, d: NarrativeInput) {
  await assertMediaInWorld(d.coverImageId, worldId, "coverImageId");
  await assertPlanetInWorld(d.planetId, worldId, "planetId");
  if (d.characterIds.length) {
    const found = await db.character.count({ where: { id: { in: d.characterIds }, worldId } });
    if (found !== d.characterIds.length) throw new ContentError("A selected character is not in this world", "characterIds");
  }
}

function narrativeData(d: NarrativeInput) {
  const { characterIds, ...rest } = d;
  return { rest, characters: characterIds.map((id) => ({ id })) };
}

export async function createNarrative(actor: Actor, worldId: string, d: NarrativeInput) {
  await assertCanEditWorld(actor, worldId);
  await checkNarrative(worldId, d);
  const { rest, characters } = narrativeData(d);
  return guardSlug(() => db.narrative.create({ data: { ...rest, worldId, characters: { connect: characters } } }));
}

export async function updateNarrative(actor: Actor, id: string, d: NarrativeInput) {
  const worldId = await worldOf("narrative", id);
  if (!worldId) throw new ContentError("Narrative not found");
  await assertCanEditWorld(actor, worldId);
  await checkNarrative(worldId, d);
  const { rest, characters } = narrativeData(d);
  return guardSlug(() => db.narrative.update({ where: { id }, data: { ...rest, characters: { set: characters } } }));
}

export async function deleteNarrative(actor: Actor, id: string) {
  const worldId = await worldOf("narrative", id);
  if (!worldId) return;
  await assertCanEditWorld(actor, worldId);
  await db.narrative.delete({ where: { id } });
}
