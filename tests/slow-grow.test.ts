import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  armyArticles,
  battleNarratives,
  controlShares,
  controlSnapshots,
  eventArticles,
  parseCsv,
  profilesFromCsv,
  toParagraphs,
  warlordCharacters,
  type Award,
  type Matchup,
  type Profile,
} from "@/lib/importers/slow-grow";
import { contentHash, importSlowGrow } from "@/lib/importers/slow-grow-db";
import { importWorld } from "@/lib/world-import";
import { VESPERA_PRIME } from "@/lib/worlds/vespera-prime";
import { makeUser, resetDb } from "./helpers";

// Synthetic fixtures only: no real player writing in the repo.
const match = (over: Partial<Matchup> = {}): Matchup => ({
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  p1_id: "u1",
  p2_id: "u2",
  p1_score: 72,
  p2_score: 40,
  game_result: "p1_win",
  p1_lore: "The guns spoke.\nThe line held.",
  p2_lore: null,
  p1_tldr: "We held the trail.",
  p2_tldr: null,
  status: "completed",
  theatre_name: "The Ash Wastes - Nomad Trail",
  campaign_month: 2,
  ...over,
});
const profiles: Profile[] = [
  {
    id: "u1", commander_name: "Ferrus", army_faction: "Astra Militarum", army_subfaction: "Cadian 8th", army_lore: "Raised on ash.", warlord_name: null,
    champions: [
      {
        id: "c1", name: "Colonel Vex", archetype: "Officer", points: 80, keywords: "Infantry, Character", abilities: "Orders.\nVoice of command.",
        stats: { m: "6\"", t: "3", sv: "4+", w: "4" },
        rangedWeapons: [{ name: "Bolt pistol", range: '12"', a: "1", bs: "3+", s: "4", ap: "0", d: "1", keywords: "Pistol" }],
        meleeWeapons: [{ name: "Power sword", range: "Melee", a: "4", ws: "3+", s: "5", ap: "-2", d: "1", keywords: "" }, { name: " " }],
      },
      { id: "c2", name: "Sergeant Holt" },
      { id: "c3", name: "Champion 3" },
    ],
  },
  { id: "u2", commander_name: "Grubnatz", army_faction: "Orks", army_subfaction: null, army_lore: null, warlord_name: "Old Snagga", champions: [] },
];
const award: Award = { matchup_id: match().id, commander_id: "u1", deed: "Held the Line", metric: "imperium_control", territory_name: "The Ash Wastes", note: "Not one step back." };

describe("slow-grow transforms", () => {
  it("turns single line breaks into paragraphs", () => {
    expect(toParagraphs("a\nb")).toBe("a\n\nb");
    expect(toParagraphs("a\n\nb\nc")).toBe("a\n\nb\nc");
  });

  it("builds a draft battle narrative linked to its theatre", () => {
    const [n] = battleNarratives([match()], [award]);
    expect(n).toMatchObject({
      sourceRef: `slow-grow:matchup:${match().id}`,
      published: false,
      regionName: "The Ash Wastes",
      title: "Nomad Trail, Round 2",
      subtitle: "Victory for First commander over Second commander, 72–40 VP",
      epigraph: "We held the trail.",
      epigraphSource: "First commander",
      summary: null,
      characterRefs: [],
    });
    // Each account is a chapter; the epigraph is not repeated inside it.
    expect(n.body).toMatch(/^## First commander\n\nThe guns spoke.\n\nThe line held./);
    expect(n.body).not.toContain("> We held the trail.");
    expect(n.body).toContain("## Deeds credited by Campaign Command\n- **Held the Line** (First commander): Not one step back.");
  });

  it("names commanders, features their warlords and opens with the victor", () => {
    const [n] = battleNarratives([match({ game_result: "p2_win", p2_tldr: "WAAAGH!", p2_lore: "We won." })], [], profiles);
    expect(n).toMatchObject({ title: "Nomad Trail, Round 2", subtitle: "Victory for Grubnatz over Ferrus, 40–72 VP" });
    expect(n).toMatchObject({ epigraph: "WAAAGH!", epigraphSource: "Grubnatz", characterRefs: ["slow-grow:warlord:u1:c1", "slow-grow:warlord:u2"] });
    expect(n.body).toContain("## Ferrus (Cadian 8th, Astra Militarum)\n\n> We held the trail.");
    expect(n.body).not.toContain("u1");

    // A side whose only writing became the epigraph gets no empty chapter.
    const [solo] = battleNarratives([match({ p1_lore: null, p2_lore: "Their account." , game_result: "draw" })], [], profiles);
    expect(solo).toMatchObject({ subtitle: "Ferrus and Grubnatz fought to a draw, 72–40 VP", epigraph: "We held the trail." });
    expect(solo.body).not.toContain("## Ferrus");
    expect(solo.body).toContain("## Grubnatz (Orks)\n\nTheir account.");
  });

  it("skips unfought, uncontested and unwritten battles, and lists rounds in order", () => {
    expect(battleNarratives([match({ status: "scheduled" }), match({ uncontested: true }), match({ p1_lore: null, p1_tldr: " " })], [])).toEqual([]);
    const rounds = battleNarratives([match({ id: "b", campaign_month: 3 }), match({ id: "a", campaign_month: 1 })], []).map((n) => n.title);
    expect(rounds).toEqual(["Nomad Trail, Round 1", "Nomad Trail, Round 3"]);
  });

  it("publishes campaign events with their battlefield conditions", () => {
    const [e] = eventArticles([{ id: "e1", title: "The Tomb Stirs", description: "Something wakes. It is old.", rules_text: "Re-roll 1s.", theatre_name: "The Sump Ruins", campaign_month: 3 }]);
    expect(e).toMatchObject({ category: "EVENT", published: true, slug: "the-tomb-stirs", regionName: "The Sump Ruins", summary: "Round 3. Something wakes." });
    expect(e.body).toContain("## Battlefield conditions\n\nRe-roll 1s.");
  });

  it("splits control into whole shares that sum to 100", () => {
    const shares = controlShares({ name: "X", imperium_control: 1, chaos_corruption: 1, ork_foothold: 1 });
    expect(shares.reduce((s, f) => s + f.share, 0)).toBe(100);
    expect(shares.map((s) => s.share).sort()).toEqual([33, 33, 34]);
    expect(controlShares({ name: "Empty" })).toEqual([]);
    const [snap] = controlSnapshots([{ name: "X", imperium_control: 30, tau_foothold: 10 }], { current_month: 4, points_limit: 1600 });
    expect(snap).toEqual({ regionName: "X", asOf: "Round 4 · 1,600 points", shares: [{ faction: "Imperium", share: 75 }, { faction: "T'au Empire", share: 25 }] });
  });

  it("makes army chronicles and warlords as drafts", () => {
    expect(armyArticles(profiles)).toEqual([expect.objectContaining({ title: "Cadian 8th of Ferrus", category: "FACTION", published: false, body: "Raised on ash." })]);
    const [vex, holt, snagga, ...rest] = warlordCharacters(profiles);
    expect(rest).toEqual([]);
    // Stats that would not pass as a statline stay in the text instead.
    const [odd] = warlordCharacters([{ ...profiles[0], champions: [{ id: "c9", name: "Odd", stats: { m: "fast", t: "3" } }] }]);
    expect(odd.profile).toBeNull();
    expect(odd.body).toContain("| M | T |\n| --- | --- |\n| fast | 3 |");
    expect(vex).toMatchObject({ sourceRef: "slow-grow:warlord:u1:c1", name: "Colonel Vex", title: "Warlord", faction: "Cadian 8th", playedBy: "Ferrus", published: false });
    expect(vex.wargear).toEqual(['Bolt pistol (12", A1, BS3+, S4, AP0, D1; Pistol)', "Power sword (A4, WS3+, S5, AP-2, D1)"]);
    expect(vex.body).toContain("Officer · 80 points");
    expect(vex.profile).toEqual({ kind: "eleventh", name: "Colonel Vex", m: '6"', t: "3", sv: "4+", inv: "", w: "4", ld: "", oc: "" });
    expect(vex.body).not.toContain("| M |");
    expect(vex.body).toContain("## Abilities\n\nOrders.\n\nVoice of command.");
    expect(vex.body).toContain("**Keywords:** Infantry, Character");
    expect(holt).toMatchObject({ sourceRef: "slow-grow:warlord:u1:c2", title: "Champion", body: "", profile: null, wargear: [] });
    // Unrenamed "Champion N" sheets are skipped; the legacy column still counts.
    expect(snagga).toMatchObject({ sourceRef: "slow-grow:warlord:u2", name: "Old Snagga", title: "Warlord", playedBy: "Grubnatz" });
  });

  it("parses CSV exports, including quoted commas and newlines", () => {
    expect(parseCsv('a,b\n"x, y","line1\nline2 ""q"""\r\n')).toEqual([{ a: "x, y", b: 'line1\nline2 "q"' }]);
    const [p, q] = profilesFromCsv(
      '﻿id,commander_name,army_faction,army_subfaction,army_lore,warlord_name,email,crucible_datasheets,discord_name\nu9,Kor,Orks,NULL,,Gaz,secret@x,"[{""id"":""c1"",""name"":""Badrukk""},{""name"":""no id""}]",kor.waaagh\nu8,Ash,Orks,,,,x@y,not json,\n',
    );
    expect(p).toEqual({ id: "u9", commander_name: "Kor", army_faction: "Orks", army_subfaction: null, army_lore: null, warlord_name: "Gaz", champions: [{ id: "c1", name: "Badrukk" }] });
    expect(p).not.toHaveProperty("email");
    expect(p).not.toHaveProperty("discord_name");
    expect(q.champions).toEqual([]);
  });
});

describe("importSlowGrow", () => {
  beforeEach(resetDb);
  afterAll(() => db.$disconnect());

  const batch = (body = "Original") => ({
    articles: [],
    characters: warlordCharacters(profiles),
    narratives: [{ ...battleNarratives([match()], [], profiles)[0], body }],
    control: controlSnapshots([{ name: "The Ash Wastes", imperium_control: 3, ork_foothold: 1 }]),
  });

  it("links records to the world, theatre and warlords, and re-runs safely", async () => {
    const admin = await makeUser("ADMIN");
    await importWorld(db, admin.id, VESPERA_PRIME);
    const first = await importSlowGrow(db, "vespera-prime", batch());
    expect(first.created).toHaveLength(5);
    const vex = await db.character.findFirstOrThrow({ where: { sourceRef: "slow-grow:warlord:u1:c1" } });
    expect(vex).toMatchObject({ name: "Colonel Vex", playedBy: "Ferrus", published: false, authorId: admin.id });
    expect(vex.wargear).toHaveLength(2);
    expect(vex.profile).toMatchObject({ kind: "eleventh", m: '6"' });
    expect(first.unmatchedRegions).toEqual([]);

    const n = await db.narrative.findFirstOrThrow({ where: { sourceRef: { startsWith: "slow-grow:" } }, include: { region: true, planet: true, characters: true } });
    expect(n).toMatchObject({ published: false, authorId: admin.id, title: "Nomad Trail, Round 2", subtitle: "Victory for Ferrus over Grubnatz, 72–40 VP" });
    expect(n.region?.name).toBe("The Ash Wastes");
    expect(n.planet?.name).toBe("Vespera Prime");
    expect(n.characters.map((c) => c.name).sort()).toEqual(["Colonel Vex", "Old Snagga"]);
    const region = await db.region.findFirstOrThrow({ where: { slug: "the-ash-wastes" } });
    expect(region.control).toEqual([{ faction: "Imperium", share: 75 }, { faction: "Orks", share: 25 }]);

    const again = await importSlowGrow(db, "vespera-prime", batch());
    expect(again.created).toEqual([]);
    expect(again.updated).toEqual([]);
  });

  it("updates unedited records but keeps CMS edits", async () => {
    const admin = await makeUser("ADMIN");
    await importWorld(db, admin.id, VESPERA_PRIME);
    await importSlowGrow(db, "vespera-prime", batch("Original"));

    const updated = await importSlowGrow(db, "vespera-prime", batch("Revised"));
    expect(updated.updated).toHaveLength(1);
    expect((await db.narrative.findFirstOrThrow({ where: { sourceRef: { not: null } } })).body).toBe("Revised");

    // Unfeaturing a character counts as an edit too.
    const n = await db.narrative.findFirstOrThrow({ where: { sourceRef: { not: null } } });
    await db.narrative.update({ where: { id: n.id }, data: { characters: { set: [] } } });
    await db.region.updateMany({ where: { slug: "the-ash-wastes" }, data: { control: [{ faction: "Chaos", share: 100 }] } });
    // A hand-edited character keeps its edits but still gets a missing commander filled in, and never loses one set by hand.
    await db.character.updateMany({ where: { sourceRef: "slow-grow:warlord:u1:c1" }, data: { body: "Hand edited", playedBy: null } });
    await db.character.updateMany({ where: { sourceRef: "slow-grow:warlord:u1:c2" }, data: { playedBy: "Someone else" } });
    const kept = await importSlowGrow(db, "vespera-prime", batch("Third"));
    expect(kept.updated).toEqual([]);
    expect(kept.kept.some((l) => l.includes("edited in the CMS"))).toBe(true);
    expect((await db.narrative.findFirstOrThrow({ where: { id: n.id } })).body).toBe("Revised");
    expect((await db.region.findFirstOrThrow({ where: { slug: "the-ash-wastes" } })).control).toEqual([{ faction: "Chaos", share: 100 }]);
    expect(await db.character.findFirstOrThrow({ where: { sourceRef: "slow-grow:warlord:u1:c1" } })).toMatchObject({ body: "Hand edited", playedBy: "Ferrus" });
    expect(await db.character.findFirstOrThrow({ where: { sourceRef: "slow-grow:warlord:u1:c2" } })).toMatchObject({ playedBy: "Someone else" });
  });

  it("removes the old lore copies of battle reports unless they were edited", async () => {
    const admin = await makeUser("ADMIN");
    const world = await importWorld(db, admin.id, VESPERA_PRIME).then(() => db.world.findUniqueOrThrow({ where: { slug: "vespera-prime" } }));
    const old = { category: "BATTLE" as const, summary: null, body: "Old", tags: ["slow-grow"], worldId: world.id };
    const hash = (title: string) => contentHash([title, old.category, old.summary, old.body, old.tags, null]);
    await db.article.create({ data: { ...old, title: "Untouched", slug: "untouched", sourceRef: "slow-grow:matchup:1", sourceHash: hash("Untouched") } });
    await db.article.create({ data: { ...old, title: "Edited", slug: "edited", sourceRef: "slow-grow:matchup:2", sourceHash: hash("Before the edit") } });

    const report = await importSlowGrow(db, "vespera-prime", batch());
    expect(report.removed).toEqual(["record Untouched"]);
    expect((await db.article.findMany({ where: { sourceRef: { startsWith: "slow-grow:matchup:" } } })).map((a) => a.title)).toEqual(["Edited"]);
  });

  it("needs the world imported first", async () => {
    await expect(importSlowGrow(db, "vespera-prime", batch())).rejects.toThrow(/not found/);
  });
});
