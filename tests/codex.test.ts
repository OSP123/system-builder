import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { chapterHeadings, readProfiles, readRules } from "@/lib/codex";
import { createCharacter, createNarrative, createUnit, updateNarrative } from "@/lib/codex-content";
import { createPlanet, createSystem, createWorld, ForbiddenError } from "@/lib/content";
import { getPublishedCharacter, getWorldCharacters } from "@/lib/queries";
import {
  characterSchema,
  narrativeSchema,
  planetSchema,
  systemSchema,
  unitSchema,
  worldSchema,
} from "@/lib/validation";
import { makeUser, resetDb } from "./helpers";

const marine = { kind: "model", name: "Battle-Brother", ws: "4", bs: "4", s: "4", t: "4", w: "1", i: "4", a: "1", ld: "8", sv: "3+" };
const rhino = { kind: "vehicle", name: "Rhino", bs: "4", front: "11", side: "11", rear: "10" };

describe("unitSchema", () => {
  it("parses profiles, rules and wargear lines", () => {
    const r = unitSchema.parse({
      name: "Tactical Squad",
      slot: "TROOPS",
      points: "15 pts/model",
      profiles: JSON.stringify([marine, rhino]),
      specialRules: JSON.stringify([{ name: "And They Shall Know No Fear", description: "Regroup always." }]),
      wargear: "Bolter\n\n  Frag grenades  \nKrak grenades",
    });
    expect(r.slug).toBe("tactical-squad");
    expect(r.profiles).toHaveLength(2);
    expect(r.wargear).toEqual(["Bolter", "Frag grenades", "Krak grenades"]);
    expect(r.specialRules[0].name).toBe("And They Shall Know No Fear");
  });

  it("rejects bad characteristics and malformed JSON", () => {
    expect(unitSchema.safeParse({ name: "X", profiles: JSON.stringify([{ ...marine, ws: "<b>" }]) }).success).toBe(false);
    expect(unitSchema.safeParse({ name: "X", profiles: "{not json" }).success).toBe(false);
    expect(unitSchema.safeParse({ name: "X", slot: "LORDS_OF_WAR" }).success).toBe(false);
  });
});

describe("characterSchema", () => {
  it("treats an empty statline as none", () => {
    expect(characterSchema.parse({ name: "Syl", profile: "" }).profile).toBeNull();
    expect(characterSchema.parse({ name: "Syl", profile: "null" }).profile).toBeNull();
  });

  it("accepts a single profile", () => {
    const r = characterSchema.parse({ name: "Hesaar", profile: JSON.stringify({ ...marine, name: "Hesaar", ws: "6" }) });
    expect(r.profile).toMatchObject({ name: "Hesaar", ws: "6" });
  });

  it("accepts an 11th edition statline, with inches only on movement", () => {
    const eleventh = { kind: "eleventh", name: "Vex", m: '6"', t: "3", sv: "4+", inv: "5+", w: "4", ld: "6+", oc: "1" };
    expect(characterSchema.parse({ name: "Vex", profile: JSON.stringify(eleventh) }).profile).toEqual(eleventh);
    expect(() => characterSchema.parse({ name: "Vex", profile: JSON.stringify({ ...eleventh, t: '3"' }) })).toThrow();
    expect(() => characterSchema.parse({ name: "Vex", profile: JSON.stringify({ ...eleventh, m: "fast" }) })).toThrow();
    expect(characterSchema.parse({ name: "Vex", profile: JSON.stringify({ ...eleventh, m: "6”" }) }).profile).toMatchObject({ m: '6"' });
  });
});

describe("narrativeSchema", () => {
  it("dedupes character ids", () => {
    expect(narrativeSchema.parse({ title: "The Deep", characterIds: "a,b,a," }).characterIds).toEqual(["a", "b"]);
  });
});

describe("readers", () => {
  it("drop malformed stored data instead of throwing", () => {
    expect(readProfiles([marine, { kind: "nope" }, "junk"])).toHaveLength(1);
    expect(readProfiles(null)).toEqual([]);
    expect(readRules([{ name: "Fearless" }, { description: "no name" }])).toEqual([{ name: "Fearless", description: "" }]);
  });
});

describe("chapterHeadings", () => {
  it("collects ## and ### headings with unique ids, ignoring code fences", () => {
    const md = "# Title\n## The Descent\ntext\n### Below\n```\n## not a heading\n```\n## The Descent";
    expect(chapterHeadings(md)).toEqual([
      { level: 2, text: "The Descent", id: "the-descent" },
      { level: 3, text: "Below", id: "below" },
      { level: 2, text: "The Descent", id: "the-descent-1" },
    ]);
  });
});

describe("codex content", () => {
  beforeEach(resetDb);
  afterAll(() => db.$disconnect());

  async function setup() {
    const owner = await makeUser();
    const w = await createWorld(owner, worldSchema.parse({ name: "Cerulean" }));
    const other = await createWorld(owner, worldSchema.parse({ name: "Elsewhere" }));
    const sys = await createSystem(owner, other.id, systemSchema.parse({ name: "Far" }));
    const foreignPlanet = await createPlanet(owner, sys.id, planetSchema.parse({ name: "Far Prime" }));
    return { owner, w, other, foreignPlanet };
  }

  it("editors cannot add units to someone else's world", async () => {
    const { w } = await setup();
    const stranger = await makeUser();
    await expect(createUnit(stranger, w.id, unitSchema.parse({ name: "X" }))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("stores unit profiles and rules", async () => {
    const { owner, w } = await setup();
    const u = await createUnit(owner, w.id, unitSchema.parse({ name: "Tactical Squad", profiles: JSON.stringify([marine]) }));
    expect(readProfiles(u.profiles)).toHaveLength(1);
  });

  it("keeps a character's commander out of public queries", async () => {
    const { owner, w } = await setup();
    const c = await createCharacter(owner, w.id, characterSchema.parse({ name: "Vex", playedBy: "Ferrus", published: "on" }));
    expect(c.playedBy).toBe("Ferrus");
    expect(await getPublishedCharacter(w.id, c.slug)).not.toHaveProperty("playedBy");
    expect((await getWorldCharacters(w.id))[0]).not.toHaveProperty("playedBy");
  });

  it("rejects a homeworld from another world", async () => {
    const { owner, w, foreignPlanet } = await setup();
    await expect(
      createCharacter(owner, w.id, characterSchema.parse({ name: "Hesaar", homeworldId: foreignPlanet.id })),
    ).rejects.toMatchObject({ field: "homeworldId" });
  });

  it("links and relinks featured characters, refusing foreign ones", async () => {
    const { owner, w, other } = await setup();
    const hesaar = await createCharacter(owner, w.id, characterSchema.parse({ name: "Hesaar" }));
    const syl = await createCharacter(owner, w.id, characterSchema.parse({ name: "Syl" }));
    const outsider = await createCharacter(owner, other.id, characterSchema.parse({ name: "Outsider" }));

    const n = await createNarrative(owner, w.id, narrativeSchema.parse({ title: "The Deep", characterIds: hesaar.id }));
    await updateNarrative(owner, n.id, narrativeSchema.parse({ title: "The Deep", slug: "the-deep", characterIds: syl.id }));
    const linked = await db.narrative.findUnique({ where: { id: n.id }, include: { characters: true } });
    expect(linked?.characters.map((c) => c.name)).toEqual(["Syl"]);

    await expect(
      createNarrative(owner, w.id, narrativeSchema.parse({ title: "Bad", characterIds: outsider.id })),
    ).rejects.toMatchObject({ field: "characterIds" });
  });
});
