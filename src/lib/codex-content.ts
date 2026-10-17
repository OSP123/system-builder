import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { db } from "./db";
import {
  assertCanContribute,
  assertCanEditRecord,
  assertMediaInWorld,
  assertNarration,
  assertRegionInWorld,
  ContentError,
  guardSlug,
  type Actor,
} from "./content";
import { pruneRecording } from "./recordings";
import type { characterSchema, narrativeSchema, unitSchema } from "./validation";

/** Mutations for characters, army list units and narratives, with the same authorship rules as content.ts. */

type CharacterInput = z.output<typeof characterSchema>;
type UnitInput = z.output<typeof unitSchema>;
type NarrativeInput = z.output<typeof narrativeSchema>;

const json = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));

async function assertPlanetInWorld(planetId: string | null | undefined, worldId: string, field: string) {
  if (!planetId) return;
  const planet = await db.planet.findFirst({ where: { id: planetId, system: { worldId } }, select: { id: true } });
  if (!planet) throw new ContentError("Planet not found in this world", field);
}

/** World and author of an existing record, or null if it doesn't exist. */
async function recordOf(model: "character" | "unit" | "narrative", id: string) {
  const select = { worldId: true, authorId: true } as const;
  return model === "character"
    ? db.character.findUnique({ where: { id }, select })
    : model === "unit"
      ? db.unit.findUnique({ where: { id }, select })
      : db.narrative.findUnique({ where: { id }, select });
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
  await assertCanContribute(actor, worldId);
  await checkCharacter(worldId, d);
  return guardSlug(() => db.character.create({ data: { ...characterData(d), worldId, authorId: actor.id } }));
}

export async function updateCharacter(actor: Actor, id: string, d: CharacterInput) {
  const rec = await recordOf("character", id);
  if (!rec) throw new ContentError("Character not found");
  assertCanEditRecord(actor, rec);
  const worldId = rec.worldId;
  await checkCharacter(worldId, d);
  return guardSlug(() => db.character.update({ where: { id }, data: characterData(d) }));
}

export async function deleteCharacter(actor: Actor, id: string) {
  const rec = await recordOf("character", id);
  if (!rec) return;
  assertCanEditRecord(actor, rec);
  await db.character.delete({ where: { id } });
}

// ---------- Units ----------

function unitData(d: UnitInput) {
  return { ...d, profiles: d.profiles as Prisma.InputJsonValue, specialRules: json(d.specialRules) };
}

export async function createUnit(actor: Actor, worldId: string, d: UnitInput) {
  await assertCanContribute(actor, worldId);
  await assertMediaInWorld(d.imageId, worldId, "imageId");
  return guardSlug(() => db.unit.create({ data: { ...unitData(d), worldId, authorId: actor.id } }));
}

export async function updateUnit(actor: Actor, id: string, d: UnitInput) {
  const rec = await recordOf("unit", id);
  if (!rec) throw new ContentError("Unit not found");
  assertCanEditRecord(actor, rec);
  const worldId = rec.worldId;
  await assertMediaInWorld(d.imageId, worldId, "imageId");
  return guardSlug(() => db.unit.update({ where: { id }, data: unitData(d) }));
}

export async function deleteUnit(actor: Actor, id: string) {
  const rec = await recordOf("unit", id);
  if (!rec) return;
  assertCanEditRecord(actor, rec);
  await db.unit.delete({ where: { id } });
}

// ---------- Narratives ----------

async function checkNarrative(worldId: string, d: NarrativeInput) {
  await assertMediaInWorld(d.coverImageId, worldId, "coverImageId");
  await assertPlanetInWorld(d.planetId, worldId, "planetId");
  await assertRegionInWorld(d.regionId, worldId, d.planetId);
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
  await assertCanContribute(actor, worldId);
  await checkNarrative(worldId, d);
  await assertNarration(actor, worldId, d.narrationId);
  const { rest, characters } = narrativeData(d);
  return guardSlug(() =>
    db.narrative.create({ data: { ...rest, worldId, authorId: actor.id, characters: { connect: characters } } }),
  );
}

export async function updateNarrative(actor: Actor, id: string, d: NarrativeInput) {
  const rec = await recordOf("narrative", id);
  if (!rec) throw new ContentError("Narrative not found");
  assertCanEditRecord(actor, rec);
  const worldId = rec.worldId;
  await checkNarrative(worldId, d);
  const before = await db.narrative.findUniqueOrThrow({ where: { id }, select: { narrationId: true } });
  await assertNarration(actor, worldId, d.narrationId, before.narrationId);
  const { rest, characters } = narrativeData(d);
  const updated = await guardSlug(() => db.narrative.update({ where: { id }, data: { ...rest, characters: { set: characters } } }));
  if (before.narrationId !== updated.narrationId) await pruneRecording(before.narrationId);
  return updated;
}

export async function deleteNarrative(actor: Actor, id: string) {
  const rec = await recordOf("narrative", id);
  if (!rec) return;
  assertCanEditRecord(actor, rec);
  const deleted = await db.narrative.delete({ where: { id }, select: { narrationId: true } });
  await pruneRecording(deleted.narrationId);
}
