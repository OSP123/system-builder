import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CERULEAN_SECTIONS, parseLoreSections, type SectionSpec } from "@/lib/lore-import";

const specs: SectionSpec[] = [
  { heading: "History", title: "History", slug: "history", category: "HISTORY", published: true },
  { heading: "Other Places", title: "Other Places", slug: "other-places", category: "LOCATION", published: true },
];

describe("parseLoreSections", () => {
  it("splits on headings and keeps the preamble", () => {
    const { preamble, sections } = parseLoreSections(
      "Planet X\n\nLocation: Far\n\nHistory:\n\n- Born.  \n- Grew.\n\nOther Places:\n\\- Rust:\n\n- Iron.",
      specs,
    );
    expect(preamble).toBe("Planet X\n\nLocation: Far");
    expect(sections.map((s) => s.title)).toEqual(["History", "Other Places"]);
    expect(sections[0].body).toBe("- Born.\n- Grew.");
  });

  it("unescapes leading dashes", () => {
    const { sections } = parseLoreSections("Other Places:\n\\- Rust:\n- Iron.", specs);
    expect(sections[0].body).toBe("- Rust:\n- Iron.");
  });

  it("does not treat body text that merely contains a heading word as a heading", () => {
    const { sections } = parseLoreSections("History\n- The History of it all.", specs);
    expect(sections).toHaveLength(1);
    expect(sections[0].body).toContain("The History of it all.");
  });
});

describe("Sons-of-Cerulean-lore.md", () => {
  const text = readFileSync("Sons-of-Cerulean-lore.md", "utf8");
  const { preamble, sections } = parseLoreSections(text, CERULEAN_SECTIONS);

  it("finds every section exactly once", () => {
    expect(sections.map((s) => s.slug)).toEqual(CERULEAN_SECTIONS.map((s) => s.slug));
  });

  it("keeps all of the author's text", () => {
    const words = (s: string) => s.replace(/[\s\\*-]+/g, " ").trim();
    const recombined = [preamble, ...sections.flatMap((s) => [s.heading, s.body])].join(" ");
    for (const phrase of ["Orpheus Sector", "makil", "Angron's Rage", "Drones analyze the shield", "rusted metals"]) {
      expect(recombined).toContain(phrase);
    }
    // No section is empty.
    for (const s of sections) expect(words(s.body).length).toBeGreaterThan(20);
  });
});

describe("CERULEAN_STUBS", () => {
  it("have unique slugs that don't collide with imported sections", async () => {
    const { CERULEAN_STUBS } = await import("@/lib/lore-import");
    const slugs = [...CERULEAN_STUBS, ...CERULEAN_SECTIONS].map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("corrected spellings", () => {
  const text = readFileSync("Sons-of-Cerulean-lore.md", "utf8");
  it.each(["Hessar", "Torketh", "Nectrontyr", "22nd century"])("source no longer contains %s", (bad) => {
    expect(text).not.toContain(bad);
  });
});

describe("CERULEAN_CHARACTERS", () => {
  it("uses the corrected spellings and has no character stubs left in the article list", async () => {
    const { CERULEAN_CHARACTERS, CERULEAN_STUBS } = await import("@/lib/lore-import");
    expect(CERULEAN_CHARACTERS.map((c) => c.name)).toEqual(["Hesaar", "Strone", "Tarketh", "Versus", "Syl"]);
    expect(CERULEAN_STUBS.some((s) => s.category === "CHARACTER")).toBe(false);
  });
});
