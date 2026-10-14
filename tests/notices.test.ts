import { describe, expect, it } from "vitest";
import { failureNotice, successLine } from "@/lib/notices";

describe("failureNotice", () => {
  it("counts invalid fields", () => {
    expect(failureNotice({ name: "Name is required" })).toMatchObject({ kind: "invalid", detail: expect.stringContaining("One field requires") });
    expect(failureNotice({ name: "x", slug: "y", _form: "z" }).detail).toContain("2 fields require");
  });

  it("recognises permission failures", () => {
    expect(failureNotice({ _form: "You do not have permission to edit this world" }).kind).toBe("forbidden");
  });

  it("treats a form-level error with no fields as a server failure", () => {
    const n = failureNotice({ _form: "The cogitator faltered." });
    expect(n.kind).toBe("crashed");
    expect(n.detail).toContain("still here");
  });
});

describe("successLine", () => {
  it("picks from the right pool and never returns undefined", () => {
    expect(successLine("saved", () => 0)).toContain("Archivum");
    expect(successLine("created", () => 0.999)).toBeTruthy();
    expect(successLine("saved", () => 0.9999)).toBeTruthy();
  });
});
