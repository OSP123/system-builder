import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findEmblem } from "@/lib/emblem";

describe("findEmblem", () => {
  const dirs: string[] = [];
  const dir = () => {
    const d = mkdtempSync(path.join(tmpdir(), "emblem-"));
    dirs.push(d);
    return d;
  };
  afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })));

  it("returns null when no emblem exists", () => {
    expect(findEmblem(dir())).toBeNull();
  });

  it("finds a png emblem", () => {
    const d = dir();
    writeFileSync(path.join(d, "emblem.png"), "x");
    expect(findEmblem(d)).toBe("/emblem.png");
  });

  it("prefers svg over raster formats", () => {
    const d = dir();
    writeFileSync(path.join(d, "emblem.png"), "x");
    writeFileSync(path.join(d, "emblem.svg"), "x");
    expect(findEmblem(d)).toBe("/emblem.svg");
  });
});
