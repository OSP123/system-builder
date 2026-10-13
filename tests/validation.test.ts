import { describe, expect, it } from "vitest";
import { articleSchema, planetSchema, systemSchema, worldSchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("The Cerulean Reach")).toBe("the-cerulean-reach");
  });
  it("strips punctuation", () => {
    expect(slugify("Saint Ophelia's Light!")).toBe("saint-ophelias-light");
  });
});

describe("worldSchema", () => {
  it("derives slug from name when blank", () => {
    const r = worldSchema.parse({ name: "Cerulean", slug: "" });
    expect(r.slug).toBe("cerulean");
    expect(r.published).toBe(false);
  });

  it("treats empty optional strings as null", () => {
    const r = worldSchema.parse({ name: "X", tagline: "  ", summary: "" });
    expect(r.tagline).toBeNull();
    expect(r.summary).toBeNull();
  });

  it("parses checkbox 'on' as true", () => {
    expect(worldSchema.parse({ name: "X", published: "on" }).published).toBe(true);
  });

  it("rejects invalid slugs", () => {
    const r = worldSchema.safeParse({ name: "X", slug: "bad slug!" });
    expect(r.success).toBe(false);
  });

  it("requires a name", () => {
    expect(worldSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("articleSchema", () => {
  it("normalizes and dedupes tags", () => {
    const r = articleSchema.parse({ title: "T", category: "FACTION", tags: "Imperium, imperium , ,Navy" });
    expect(r.tags).toEqual(["imperium", "navy"]);
  });

  it("rejects unknown categories", () => {
    expect(articleSchema.safeParse({ title: "T", category: "NOPE" }).success).toBe(false);
  });

  it("empty system/planet ids become null", () => {
    const r = articleSchema.parse({ title: "T", category: "OTHER", systemId: "", planetId: "" });
    expect(r.systemId).toBeNull();
    expect(r.planetId).toBeNull();
  });
});

describe("systemSchema", () => {
  it("coerces coordinates from strings", () => {
    const r = systemSchema.parse({ name: "Sys", x: "12.5", y: "-3", z: "" });
    expect(r).toMatchObject({ x: 12.5, y: -3, z: 0 });
  });

  it("rejects non-numeric coordinates", () => {
    expect(systemSchema.safeParse({ name: "Sys", x: "abc" }).success).toBe(false);
  });
});

describe("planetSchema", () => {
  it("parses genParams JSON objects", () => {
    const r = planetSchema.parse({ name: "P", genParams: '{"seed": 42, "water": 0.3}' });
    expect(r.genParams).toEqual({ seed: 42, water: 0.3 });
  });

  it("empty genParams becomes null", () => {
    expect(planetSchema.parse({ name: "P", genParams: "" }).genParams).toBeNull();
  });

  it("rejects invalid or non-object genParams", () => {
    expect(planetSchema.safeParse({ name: "P", genParams: "{bad" }).success).toBe(false);
    expect(planetSchema.safeParse({ name: "P", genParams: "[1,2]" }).success).toBe(false);
  });
});
