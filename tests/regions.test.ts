import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createArticle, createPlanet, createRegion, createSystem, createWorld, deletePlanet, deleteRegion, ForbiddenError, updateRegion } from "@/lib/content";
import { segmentumAt, sideOfRift } from "@/lib/galaxy/coords";
import { formatLatLng, latLngToVector, polygonCentre, readControl, readSectors, sectorSchema } from "@/lib/regions";
import { importWorld } from "@/lib/world-import";
import { VESPERA_PRIME } from "@/lib/worlds/vespera-prime";
import { createNarrative } from "@/lib/codex-content";
import { articleSchema, narrativeSchema, planetSchema, regionSchema, systemSchema, worldSchema } from "@/lib/validation";
import { makeUser, resetDb } from "./helpers";

describe("region helpers", () => {
  it("validates sector shapes", () => {
    expect(sectorSchema.safeParse({ name: "Outer Wall", pointsLevel: 400, shape: "100,450 700,450 640,380" }).success).toBe(true);
    expect(sectorSchema.safeParse({ name: "Bad", shape: "1,2 3,4" }).success).toBe(false); // fewer than 3 points
    expect(sectorSchema.safeParse({ name: "Bad", shape: "<svg>" }).success).toBe(false);
  });

  it("drops malformed stored sectors", () => {
    expect(readSectors([{ name: "Ok" }, { shape: "no name" }, "junk"])).toEqual([{ name: "Ok" }]);
    expect(readSectors(null)).toEqual([]);
  });

  it("maps latitude and longitude onto the globe", () => {
    const [x, y, z] = latLngToVector(0, 0, 2);
    expect([x, y, z].map((v) => +v.toFixed(6))).toEqual([0, 0, 2]);
    expect(latLngToVector(90, 0)[1]).toBeCloseTo(1);
    expect(latLngToVector(0, 90)[0]).toBeCloseTo(1);
    expect(formatLatLng(-25, 135)).toBe("25°S 135°E");
  });

  it("reads control snapshots, dropping malformed shares", () => {
    expect(readControl([{ faction: "Imperium", share: 60 }, { faction: "Chaos" }, { share: 10 }, null])).toEqual([{ faction: "Imperium", share: 60 }]);
    expect(readControl("nope")).toEqual([]);
  });

  it("finds a polygon's centre", () => {
    expect(polygonCentre("0,0 100,0 100,50 0,50")).toEqual([50, 25]);
  });

  it("validates regions", () => {
    const r = regionSchema.parse({ name: "The Ash Wastes", lat: "25", lng: "10", sectors: JSON.stringify([{ name: "Dead Zone", pointsLevel: 2000 }]) });
    expect(r).toMatchObject({ slug: "the-ash-wastes", lat: 25, lng: 10 });
    expect(regionSchema.safeParse({ name: "X", lat: "91" }).success).toBe(false);
    expect(regionSchema.safeParse({ name: "X", lng: "-181" }).success).toBe(false);
    expect(regionSchema.safeParse({ name: "X", sectors: "{oops" }).success).toBe(false);
  });
});

describe("Vespera Prime data", () => {
  it("keeps every theatre, sector and shape from the source", () => {
    expect(VESPERA_PRIME.regions.map((r) => r.name)).toEqual([
      "The Hive Spires",
      "The Ash Wastes",
      "The Magma Forges",
      "Orbital Relay Station",
      "The Sump Ruins",
      "The Toxic Oceans",
    ]);
    for (const r of VESPERA_PRIME.regions) {
      expect(r.sectors).toHaveLength(5);
      expect(r.sectors.map((s) => s.pointsLevel)).toEqual([400, 800, 1200, 1600, 2000]);
      for (const s of r.sectors) expect(sectorSchema.safeParse(s).success).toBe(true);
      expect(Math.abs(r.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(r.lng)).toBeLessThanOrEqual(180);
    }
  });

  it("uses the chosen spelling throughout", () => {
    expect(JSON.stringify(VESPERA_PRIME)).not.toMatch(/Vesperia/);
  });

  it("sits in Segmentum Solar, on Terra's side of the Rift", () => {
    const { x, z } = VESPERA_PRIME.system;
    expect(segmentumAt(x, z)).toBe("Solar");
    expect(sideOfRift(x, z)).toBe("Imperium Sanctus");
  });
});

describe("importWorld", () => {
  beforeEach(resetDb);
  afterAll(() => db.$disconnect());

  it("creates the whole world, then changes nothing on a second run", async () => {
    const admin = await makeUser("ADMIN");
    const first = await importWorld(db, admin.id, VESPERA_PRIME);
    expect(first.skipped).toEqual([]);

    const world = await db.world.findUniqueOrThrow({ where: { slug: "vespera-prime" } });
    expect(world).toMatchObject({ name: "Vespera Prime", ownerId: admin.id, published: true });
    const planet = await db.planet.findFirstOrThrow({ where: { system: { worldId: world.id } }, include: { regions: true } });
    expect(planet.regions).toHaveLength(6);
    expect(readSectors(planet.regions.find((r) => r.slug === "the-sump-ruins")!.sectors).map((s) => s.name)).toContain("Buried Tomb");
    const narrative = await db.narrative.findFirstOrThrow({ where: { worldId: world.id }, include: { characters: true } });
    expect(narrative.characters.map((c) => c.name).sort()).toEqual(["Charmeleus Kane", "Silvanus Petro"]);
    expect(await db.character.count({ where: { worldId: world.id, authorId: admin.id } })).toBe(2);

    const second = await importWorld(db, admin.id, VESPERA_PRIME);
    expect(second.created).toEqual([]);
    expect(await db.region.count()).toBe(6);
  });

  it("never overwrites edits made in the CMS", async () => {
    const admin = await makeUser("ADMIN");
    await importWorld(db, admin.id, VESPERA_PRIME);
    await db.region.updateMany({ where: { slug: "the-ash-wastes" }, data: { summary: "Edited in the CMS" } });
    await db.character.updateMany({ where: { slug: "charmeleus-kane" }, data: { status: "MISSING" } });
    await importWorld(db, admin.id, VESPERA_PRIME);
    expect((await db.region.findFirstOrThrow({ where: { slug: "the-ash-wastes" } })).summary).toBe("Edited in the CMS");
    expect((await db.character.findFirstOrThrow({ where: { slug: "charmeleus-kane" } })).status).toBe("MISSING");
  });
});

describe("region permissions", () => {
  beforeEach(resetDb);

  it("contributors add regions to open worlds and change only their own", async () => {
    const admin = await makeUser("ADMIN");
    const alice = await makeUser("EDITOR");
    const bob = await makeUser("EDITOR");
    const world = await createWorld(admin, worldSchema.parse({ name: "Open", published: "on" }));
    const sys = await createSystem(admin, world.id, systemSchema.parse({ name: "Sys" }));
    const planet = await createPlanet(admin, sys.id, planetSchema.parse({ name: "Rock" }));

    const r = await createRegion(alice, planet.id, regionSchema.parse({ name: "Badlands" }));
    expect(r.authorId).toBe(alice.id);
    await expect(updateRegion(bob, r.id, regionSchema.parse({ name: "Mine now", slug: "badlands" }))).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deleteRegion(bob, r.id)).rejects.toBeInstanceOf(ForbiddenError);

    // A planet holding someone else's region can only be deleted by an admin
    const bobsPlanet = await createPlanet(bob, sys.id, planetSchema.parse({ name: "Bob's Rock" }));
    await createRegion(alice, bobsPlanet.id, regionSchema.parse({ name: "Alice's Corner" }));
    await expect(deletePlanet(bob, bobsPlanet.id)).rejects.toThrow(/regions other contributors/);
    await deletePlanet(admin, bobsPlanet.id);
    expect(await db.region.count({ where: { planetId: bobsPlanet.id } })).toBe(0);
  });
});

describe("records linked to regions", () => {
  beforeEach(resetDb);

  it("accept a region in the world, on the chosen planet", async () => {
    const admin = await makeUser("ADMIN");
    const world = await createWorld(admin, worldSchema.parse({ name: "Linked", published: "on" }));
    const other = await createWorld(admin, worldSchema.parse({ name: "Elsewhere" }));
    const sys = await createSystem(admin, world.id, systemSchema.parse({ name: "Sys" }));
    const a = await createPlanet(admin, sys.id, planetSchema.parse({ name: "A" }));
    const b = await createPlanet(admin, sys.id, planetSchema.parse({ name: "B" }));
    const region = await createRegion(admin, a.id, regionSchema.parse({ name: "Front" }));

    const ok = await createArticle(admin, world.id, articleSchema.parse({ category: "BATTLE", title: "Battle", planetId: a.id, regionId: region.id }));
    expect(ok.regionId).toBe(region.id);
    await expect(createArticle(admin, world.id, articleSchema.parse({ category: "BATTLE", title: "Wrong planet", planetId: b.id, regionId: region.id }))).rejects.toThrow(/different planet/);
    await expect(createArticle(admin, other.id, articleSchema.parse({ category: "BATTLE", title: "Wrong world", regionId: region.id }))).rejects.toThrow(/not found in this world/);

    const story = await createNarrative(admin, world.id, narrativeSchema.parse({ title: "Account", planetId: a.id, regionId: region.id }));
    expect(story.regionId).toBe(region.id);
    await expect(createNarrative(admin, world.id, narrativeSchema.parse({ title: "Wrong planet", planetId: b.id, regionId: region.id }))).rejects.toThrow(/different planet/);
    await expect(createNarrative(admin, other.id, narrativeSchema.parse({ title: "Wrong world", regionId: region.id }))).rejects.toThrow(/not found in this world/);
  });
});
