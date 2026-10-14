import { afterAll, describe, expect, it } from "vitest";
import { rm } from "node:fs/promises";
import { isSessionStale, signSession, verifySession } from "@/lib/session";
import { deleteImage, isValidKey, readImage, saveImage, sniffImageType, UploadError } from "@/lib/storage";

describe("isSessionStale", () => {
  it("rejects sessions issued before a password change, accepts later ones", () => {
    const change = new Date("2026-10-14T12:00:00.500Z");
    const at = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
    expect(isSessionStale(at("2026-10-14T11:59:59Z"), change)).toBe(true);
    expect(isSessionStale(at("2026-10-14T12:00:00Z"), change)).toBe(false); // same second
    expect(isSessionStale(at("2026-10-14T12:05:00Z"), change)).toBe(false);
    expect(isSessionStale(at("2020-01-01T00:00:00Z"), null)).toBe(false);
  });
});

describe("session tokens", () => {
  it("round-trips a signed session", async () => {
    const token = await signSession({ userId: "u1", role: "ADMIN" });
    expect(await verifySession(token)).toMatchObject({ userId: "u1", role: "ADMIN", issuedAt: expect.any(Number) });
  });

  it("rejects tampered tokens", async () => {
    const token = await signSession({ userId: "u1", role: "EDITOR" });
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ userId: "u1", role: "ADMIN" })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${s}`)).toBeNull();
  });

  it("rejects missing and garbage tokens", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("not.a.jwt")).toBeNull();
  });
});

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe("image storage", () => {
  afterAll(async () => {
    await rm(process.env.UPLOAD_DIR!, { recursive: true, force: true });
  });

  it("sniffs image types from magic bytes", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });

  it("saves, reads and deletes an image", async () => {
    const saved = await saveImage(PNG);
    expect(saved.mimeType).toBe("image/png");
    expect(isValidKey(saved.key)).toBe(true);
    expect(await readImage(saved.key)).toEqual(Buffer.from(PNG));
    await deleteImage(saved.key);
    expect(await readImage(saved.key)).toBeNull();
  });

  it("rejects non-images and empty files", async () => {
    await expect(saveImage(new TextEncoder().encode("hello"))).rejects.toBeInstanceOf(UploadError);
    await expect(saveImage(new Uint8Array())).rejects.toBeInstanceOf(UploadError);
  });

  it("refuses path traversal keys", async () => {
    expect(isValidKey("../../etc/passwd")).toBe(false);
    expect(await readImage("../.env")).toBeNull();
  });
});
