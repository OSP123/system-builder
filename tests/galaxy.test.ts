import { describe, expect, it } from "vitest";
import {
  bearing,
  GALAXY_RADIUS_LY,
  GREAT_RIFT_PATH,
  sideOfRift,
  SOLAR_RADIUS_LY,
  LANDMARKS,
  segmentumAt,
  SEGMENTUM_LABEL_POSITIONS,
  TERRA,
  toScene,
  wedgeBoundaryLine,
} from "@/lib/galaxy/coords";
import { generateGalaxy } from "@/lib/galaxy/generate";
import { mapPlanetLook, orbitPeriod, orbitRadius, planetLook, sortByOrbit } from "@/lib/galaxy/planets";
import { existsSync } from "node:fs";
import { VESPERA_PRIME } from "@/lib/worlds/vespera-prime";
import { gaussian, hashString, rng } from "@/lib/galaxy/random";
import { parseView, viewQuery, worldColor, type GalaxyData } from "@/lib/galaxy/state";
import { starLook } from "@/lib/galaxy/stars";

describe("random", () => {
  it("is deterministic per seed", () => {
    const a = rng(7), b = rng(7), c = rng(8);
    const seqA = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(seqA);
    expect(c()).not.toBe(seqA[0]);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("gaussian samples centre on zero", () => {
    const r = rng(1);
    const xs = Array.from({ length: 5000 }, () => gaussian(r));
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.06);
  });

  it("hashString is stable", () => {
    expect(hashString("cerulean")).toBe(hashString("cerulean"));
    expect(hashString("cerulean")).not.toBe(hashString("Cerulean"));
  });
});

describe("galactic coordinates", () => {
  it("converts light-years to scene units", () => {
    expect(toScene(26_000, -500, 1_000)).toEqual([26, -0.5, 1]);
  });

  it("measures bearings clockwise from north", () => {
    const o = { x: 0, z: 0 };
    expect(bearing(o, { x: 0, z: -1 })).toBeCloseTo(0);
    expect(bearing(o, { x: 1, z: 0 })).toBeCloseTo(90);
    expect(bearing(o, { x: 0, z: 1 })).toBeCloseTo(180);
    expect(bearing(o, { x: -1, z: 0 })).toBeCloseTo(270);
  });

  it("places Terra in Solar and the compass regions in their Segmenta", () => {
    expect(segmentumAt(TERRA.x, TERRA.z)).toBe("Solar");
    expect(segmentumAt(0, -30_000)).toBe("Obscurus");
    expect(segmentumAt(40_000, 20_000)).toBe("Ultima");
    expect(segmentumAt(0, 49_000)).toBe("Tempestus");
    expect(segmentumAt(-40_000, 26_000)).toBe("Pacificus");
  });

  it("puts each label inside its own Segmentum and lore landmarks where expected", () => {
    for (const [name, p] of Object.entries(SEGMENTUM_LABEL_POSITIONS)) expect(segmentumAt(p.x, p.z)).toBe(name);
    const at = (id: string) => LANDMARKS.find((l) => l.id === id)!;
    expect(segmentumAt(at("eye").x, at("eye").z)).toBe("Obscurus");
    expect(segmentumAt(at("ultramar").x, at("ultramar").z)).toBe("Ultima");
  });

  it("places Cerulean (as seeded) on the southern rim in Segmentum Tempestus", () => {
    expect(segmentumAt(-12_000, 46_000)).toBe("Tempestus");
    expect(Math.hypot(-12_000, 46_000)).toBeGreaterThan(GALAXY_RADIUS_LY * 0.9);
    expect(sideOfRift(-12_000, 46_000)).toBe("Imperium Sanctus");
  });

  it("draws wedge boundaries from the Solar ring out past the rim", () => {
    const [start, end] = wedgeBoundaryLine(90);
    expect(Math.hypot(start.x - TERRA.x, start.z - TERRA.z)).toBeCloseTo(SOLAR_RADIUS_LY, -1);
    expect(Math.hypot(end.x, end.z)).toBeGreaterThanOrEqual(GALAXY_RADIUS_LY);
  });
});

describe("lore geography", () => {
  const at = (id: string) => LANDMARKS.find((l) => l.id === id)!;

  it("puts the galactic core in Ultima Segmentum, east of Terra", () => {
    expect(segmentumAt(0, 0)).toBe("Ultima");
    expect(TERRA.x).toBeLessThan(0);
  });

  it("puts the Eye of Terror in Obscurus, north and west of Terra, near the galaxy's edge", () => {
    const eye = at("eye");
    expect(segmentumAt(eye.x, eye.z)).toBe("Obscurus");
    expect(eye.x).toBeLessThan(TERRA.x);
    expect(eye.z).toBeLessThan(TERRA.z);
    expect(Math.hypot(eye.x, eye.z)).toBeGreaterThan(GALAXY_RADIUS_LY * 0.85);
  });

  it("puts the Maelstrom in Ultima, between Segmentum Solar's border and the core", () => {
    const m = at("maelstrom");
    expect(segmentumAt(m.x, m.z)).toBe("Ultima");
    const fromTerra = Math.hypot(m.x - TERRA.x, m.z - TERRA.z);
    expect(fromTerra).toBeLessThan(Math.hypot(TERRA.x, TERRA.z)); // closer to Terra than the core is
    expect(Math.hypot(m.x, m.z)).toBeLessThan(Math.hypot(TERRA.x, TERRA.z));
  });

  it("puts Baal, Ultramar, the Ghoul Stars and Hadex in Ultima, in the right quarters", () => {
    for (const id of ["baal", "ultramar", "ghoul", "hadex"]) expect(segmentumAt(at(id).x, at(id).z)).toBe("Ultima");
    const ghoul = at("ghoul");
    expect(ghoul.x).toBeGreaterThan(0); // east
    expect(ghoul.z).toBeLessThan(0); // north
    expect(at("ultramar").z).toBeGreaterThan(0); // south-east
  });

  it("splits the Imperium along the Great Rift as the lore has it", () => {
    expect(sideOfRift(TERRA.x, TERRA.z)).toBe("Imperium Sanctus");
    expect(sideOfRift(at("ultramar").x, at("ultramar").z)).toBe("Imperium Sanctus");
    expect(sideOfRift(at("maelstrom").x, at("maelstrom").z)).toBe("Imperium Sanctus");
    expect(sideOfRift(at("baal").x, at("baal").z)).toBe("Imperium Nihilus");
    // Most of Segmentum Obscurus lies beyond the Rift
    const o = SEGMENTUM_LABEL_POSITIONS.Obscurus;
    expect(sideOfRift(o.x, o.z)).toBe("Imperium Nihilus");
  });

  it("runs the Rift from the Eye of Terror to the Hadex Anomaly, west to east", () => {
    const first = GREAT_RIFT_PATH[0];
    const last = GREAT_RIFT_PATH[GREAT_RIFT_PATH.length - 1];
    expect(first).toEqual({ x: at("eye").x, z: at("eye").z });
    expect(last).toEqual({ x: at("hadex").x, z: at("hadex").z });
    for (let i = 1; i < GREAT_RIFT_PATH.length; i++) expect(GREAT_RIFT_PATH[i].x).toBeGreaterThan(GREAT_RIFT_PATH[i - 1].x);
  });

  it("keeps every landmark inside the galaxy", () => {
    for (const l of LANDMARKS) expect(Math.hypot(l.x, l.z)).toBeLessThanOrEqual(GALAXY_RADIUS_LY);
  });
});

describe("generateGalaxy", () => {
  it("is deterministic, sized correctly and stays within the disc", () => {
    const a = generateGalaxy({ seed: 3, count: 4000 });
    const b = generateGalaxy({ seed: 3, count: 4000 });
    expect(a.positions).toEqual(b.positions);
    expect(a.positions.length).toBe(12_000);
    expect(a.colors.length).toBe(12_000);
    expect(a.sizes.length).toBe(4000);
    let outside = 0;
    let maxHeight = 0;
    for (let i = 0; i < a.count; i++) {
      const [x, y, z] = [a.positions[i * 3], a.positions[i * 3 + 1], a.positions[i * 3 + 2]];
      if (Math.hypot(x, z) > 60) outside++;
      maxHeight = Math.max(maxHeight, Math.abs(y));
      expect(Number.isFinite(x + y + z)).toBe(true);
    }
    expect(outside / a.count).toBeLessThan(0.01);
    expect(maxHeight).toBeLessThan(8); // a thin disc, not a ball
  });

  it("is densest at the core", () => {
    const g = generateGalaxy({ seed: 5, count: 20_000 });
    let inner = 0, outer = 0;
    for (let i = 0; i < g.count; i++) {
      const r = Math.hypot(g.positions[i * 3], g.positions[i * 3 + 2]);
      if (r < 5) inner++;
      else if (r > 40 && r < 45) outer++;
    }
    // Inner disc (area 25π) vs an outer annulus (area 425π): density must be far higher inside.
    expect(inner / 25).toBeGreaterThan((outer / 425) * 10);
  });
});

describe("starLook", () => {
  it("reads colour and size from free text", () => {
    expect(starLook("Blue giant")).toEqual({ color: "#9bb4ff", scale: 1.6 });
    expect(starLook("red dwarf")).toEqual({ color: "#ff7a52", scale: 0.6 });
    expect(starLook("G-class").color).toBe("#fff1c9");
    expect(starLook(null)).toEqual({ color: "#fff1c9", scale: 1 });
    expect(starLook("Red supergiant").scale).toBe(2.2);
  });
});

describe("planetLook", () => {
  it("applies classification presets", () => {
    expect(planetLook("p1", "Hive World", null).lights).toBeGreaterThan(0.5);
    expect(planetLook("p1", "Forge World", null).lava).toBeGreaterThan(0.5);
    expect(planetLook("p1", "Ice World", null).ice).toBeGreaterThan(0.8);
    expect(planetLook("p1", "Mystery", null).water).toBe(0.55);
  });

  it("lets genParams override, ignoring junk", () => {
    const look = planetLook("p1", "Death World", {
      seed: 42,
      water: 0.9,
      clouds: 7,
      atmosphere: "#123456",
      lightsColor: "red",
      palette: { deep: "#04121c", nonsense: "#ffffff", low: "not-a-colour" },
    });
    expect(look.seed).toBe(42);
    expect(look.water).toBe(0.9);
    expect(look.clouds).toBe(1);
    expect(look.atmosphere).toBe("#123456");
    expect(look.lightsColor).toBe("#ffb35c");
    expect(look.palette.deep).toBe("#04121c");
    expect(look.palette.low).toBe("#1f3d1a");
    expect(look.palette).not.toHaveProperty("nonsense");
  });

  it("derives a stable seed from the planet id", () => {
    expect(planetLook("abc", null, null).seed).toBe(planetLook("abc", null, null).seed);
    expect(planetLook("abc", null, null).seed).not.toBe(planetLook("abd", null, null).seed);
  });
});

describe("planet textures", () => {
  it("accepts only same-site image paths", () => {
    expect(planetLook("p", null, { texture: "/textures/vespera-prime.jpg" }).texture).toBe("/textures/vespera-prime.jpg");
    expect(planetLook("p", null, { texture: "/media/abc123.webp" }).texture).toBe("/media/abc123.webp");
    for (const bad of ["https://evil.example/x.jpg", "//evil.example/x.jpg", "/textures/../.env", "/textures/x.svg", "javascript:alert(1)"]) {
      expect(planetLook("p", null, { texture: bad }).texture).toBeUndefined();
    }
  });

  it("prefers an uploaded texture over one in genParams", () => {
    const base = { id: "p", classification: null, genParams: { texture: "/textures/a.jpg" } };
    expect(mapPlanetLook({ ...base, textureUrl: null }).texture).toBe("/textures/a.jpg");
    expect(mapPlanetLook({ ...base, textureUrl: "/media/b.png" }).texture).toBe("/media/b.png");
  });

  it("ships the texture Vespera Prime points at", () => {
    const texture = (VESPERA_PRIME.planet.genParams as { texture: string }).texture;
    expect(planetLook("v", "Hive World", VESPERA_PRIME.planet.genParams).texture).toBe(texture);
    expect(existsSync(`public${texture}`)).toBe(true);
  });
});

describe("orbits", () => {
  it("spaces orbits outward and slows outer planets", () => {
    expect(orbitRadius(1)).toBeGreaterThan(orbitRadius(0));
    expect(orbitPeriod(orbitRadius(3))).toBeGreaterThan(orbitPeriod(orbitRadius(0)));
  });

  it("sorts by orbit with unknown positions last", () => {
    const sorted = sortByOrbit([
      { name: "C", orbitIndex: 0 },
      { name: "B", orbitIndex: 2 },
      { name: "A", orbitIndex: 1 },
    ]);
    expect(sorted.map((p) => p.name)).toEqual(["A", "B", "C"]);
  });
});

describe("map state", () => {
  const data: GalaxyData = {
    worlds: [{ id: "w", slug: "cerulean", name: "Cerulean", color: "#fff" }],
    systems: [
      {
        id: "s1", slug: "cerulean", name: "Cerulean", starType: null, segmentum: null, x: 0, y: 0, z: 0, worldSlug: "cerulean",
        planets: [{ id: "p1", slug: "cerulean", name: "Cerulean", classification: null, orbitIndex: 1, population: null, genParams: null, textureUrl: null, regions: [] }],
      },
    ],
  };

  it("parses valid views and falls back for unknown ids", () => {
    expect(parseView({}, data)).toEqual({ level: "galaxy" });
    expect(parseView({ system: "s1" }, data)).toEqual({ level: "system", systemId: "s1" });
    expect(parseView({ system: "s1", planet: "p1" }, data)).toEqual({ level: "planet", systemId: "s1", planetId: "p1" });
    expect(parseView({ system: "nope", planet: "p1" }, data)).toEqual({ level: "galaxy" });
    expect(parseView({ system: "s1", planet: "nope" }, data)).toEqual({ level: "system", systemId: "s1" });
  });

  it("builds query strings that round-trip", () => {
    expect(viewQuery({ level: "galaxy" })).toBe("");
    expect(viewQuery({ level: "planet", systemId: "s1", planetId: "p1" }, "cerulean")).toBe("?world=cerulean&system=s1&planet=p1");
  });

  it("gives the first eight worlds distinct colours", () => {
    const colors = Array.from({ length: 8 }, (_, i) => worldColor(i));
    expect(new Set(colors).size).toBe(8);
  });
});
