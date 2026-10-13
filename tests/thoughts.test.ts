import { describe, expect, it } from "vitest";
import { archiveRef, THOUGHTS, thoughtForDate } from "@/lib/thoughts";

describe("thoughtForDate", () => {
  it("is stable within a day and changes between days", () => {
    const a = thoughtForDate(new Date("2026-10-13T01:00:00Z"));
    expect(thoughtForDate(new Date("2026-10-13T23:00:00Z"))).toBe(a);
    expect(thoughtForDate(new Date("2026-10-14T01:00:00Z"))).not.toBe(a);
    expect(THOUGHTS).toContain(a);
  });
});

describe("archiveRef", () => {
  it("is deterministic and well-formed", () => {
    expect(archiveRef("cmabc123")).toBe(archiveRef("cmabc123"));
    expect(archiveRef("cmabc123")).toMatch(/^CRL-\d{6}$/);
    expect(archiveRef("cmabc124")).not.toBe(archiveRef("cmabc123"));
  });
});
