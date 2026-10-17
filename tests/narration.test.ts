import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { GET } from "@/app/media/[key]/route";
import { createNarrative, deleteNarrative, updateNarrative } from "@/lib/codex-content";
import { createArticle, createWorld, deleteArticle, updateArticle } from "@/lib/content";
import { db } from "@/lib/db";
import { pruneAbandonedRecordings } from "@/lib/recordings";
import { MAX_AUDIO_BYTES, mimeForKey, saveAudio, sniffAudioType, UploadError } from "@/lib/storage";
import { articleSchema, narrativeSchema, worldSchema } from "@/lib/validation";
import { makeUser, resetDb } from "./helpers";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));
const WEBM = bytes([0x1a, 0x45, 0xdf, 0xa3], "....webm audio");
const onDisk = (key: string) => existsSync(path.join(path.resolve(process.env.UPLOAD_DIR ?? "./uploads"), key));

describe("audio storage", () => {
  it("recognises recorded and uploaded audio by its bytes", () => {
    expect(sniffAudioType(WEBM)).toBe("audio/webm");
    expect(sniffAudioType(bytes("OggS", [0, 2, 0, 0]))).toBe("audio/ogg");
    expect(sniffAudioType(bytes([0, 0, 0, 0x20], "ftypM4A ", [0, 0, 0, 0]))).toBe("audio/mp4");
    expect(sniffAudioType(bytes("RIFF", [0, 0, 0, 0], "WAVEfmt "))).toBe("audio/wav");
    expect(sniffAudioType(bytes("ID3", [4, 0, 0]))).toBe("audio/mpeg");
    expect(sniffAudioType(bytes([0, 0, 0, 0x1c], "ftypavif", [0, 0, 0, 0]))).toBeNull(); // an AVIF image
    expect(sniffAudioType(bytes("MZ this is not audio"))).toBeNull();
    expect(mimeForKey("0123456789abcdef01234567.m4a")).toBe("audio/mp4");
  });

  it("stores audio and refuses anything else", async () => {
    const saved = await saveAudio(WEBM);
    expect(saved).toMatchObject({ mimeType: "audio/webm", size: WEBM.byteLength });
    expect(saved.key).toMatch(/^[a-f0-9]{24}\.webm$/);
    expect(onDisk(saved.key)).toBe(true);
    await expect(saveAudio(bytes("MZ not audio at all"))).rejects.toBeInstanceOf(UploadError);
    await expect(saveAudio(new Uint8Array(0))).rejects.toThrow(/empty/);
    await expect(saveAudio(new Uint8Array(MAX_AUDIO_BYTES + 1))).rejects.toThrow(/50 MB/);
  });

  it("serves byte ranges so players can seek", async () => {
    const { key } = await saveAudio(WEBM);
    const get = (range?: string) => GET(new Request(`http://x/media/${key}`, { headers: range ? { range } : {} }), { params: Promise.resolve({ key }) });
    const whole = await get();
    expect(whole.status).toBe(200);
    expect(whole.headers.get("Accept-Ranges")).toBe("bytes");
    const part = await get("bytes=4-7");
    expect(part.status).toBe(206);
    expect(part.headers.get("Content-Range")).toBe(`bytes 4-7/${WEBM.byteLength}`);
    expect(new Uint8Array(await part.arrayBuffer())).toEqual(WEBM.slice(4, 8));
    expect((await get("bytes=-3")).headers.get("Content-Range")).toBe(`bytes ${WEBM.byteLength - 3}-${WEBM.byteLength - 1}/${WEBM.byteLength}`);
    expect((await get(`bytes=${WEBM.byteLength}-`)).status).toBe(416);
  });
});

describe("narrations", () => {
  beforeEach(resetDb);
  afterAll(() => db.$disconnect());

  async function setup() {
    const owner = await makeUser();
    const world = await createWorld(owner, worldSchema.parse({ name: "Cerulean", published: "on" }));
    const record = async (by = owner, worldId = world.id) => {
      const { key, mimeType, size } = await saveAudio(WEBM);
      return db.recording.create({ data: { key, mimeType, size, durationSec: 12, worldId, uploadedById: by.id } });
    };
    return { owner, world, record };
  }
  const article = (narrationId: string | null, title = "Battle") => articleSchema.parse({ category: "BATTLE", title, narrationId: narrationId ?? "" });

  it("attaches a recording, replaces it, and deletes the old take and its file", async () => {
    const { owner, world, record } = await setup();
    const first = await record();
    const a = await createArticle(owner, world.id, article(first.id));
    expect(a.narrationId).toBe(first.id);

    const second = await record();
    await updateArticle(owner, a.id, article(second.id));
    expect(await db.recording.findUnique({ where: { id: first.id } })).toBeNull();
    expect(onDisk(first.key)).toBe(false);

    // Saving again with the same narration keeps it.
    await updateArticle(owner, a.id, article(second.id, "Battle, revised"));
    expect(await db.recording.findUnique({ where: { id: second.id } })).not.toBeNull();

    await deleteArticle(owner, a.id);
    expect(await db.recording.findUnique({ where: { id: second.id } })).toBeNull();
    expect(onDisk(second.key)).toBe(false);
  });

  it("removing a narration deletes the recording", async () => {
    const { owner, world, record } = await setup();
    const take = await record();
    const n = await createNarrative(owner, world.id, narrativeSchema.parse({ title: "The Deep", narrationId: take.id }));
    await updateNarrative(owner, n.id, narrativeSchema.parse({ title: "The Deep", narrationId: "" }));
    expect(await db.recording.findUnique({ where: { id: take.id } })).toBeNull();

    const again = await record();
    await updateNarrative(owner, n.id, narrativeSchema.parse({ title: "The Deep", narrationId: again.id }));
    await deleteNarrative(owner, n.id);
    expect(await db.recording.findUnique({ where: { id: again.id } })).toBeNull();
  });

  it("only attaches the actor's own, unused recordings from this world", async () => {
    const { owner, world, record } = await setup();
    const other = await makeUser();
    const admin = await makeUser("ADMIN");
    const elsewhere = await createWorld(owner, worldSchema.parse({ name: "Elsewhere", published: "on" }));

    await expect(createArticle(owner, world.id, article((await record(owner, elsewhere.id)).id))).rejects.toThrow(/not found in this world/);
    const theirs = await record(other);
    await expect(createArticle(owner, world.id, article(theirs.id))).rejects.toThrow(/recordings you made/);
    expect((await createArticle(admin, world.id, article(theirs.id, "Admin's pick"))).narrationId).toBe(theirs.id);
    await expect(createNarrative(admin, world.id, narrativeSchema.parse({ title: "Twice", narrationId: theirs.id }))).rejects.toThrow(/already narrates/);
  });

  it("prunes takes that were never attached, after a day", async () => {
    const { owner, world, record } = await setup();
    const used = await record();
    await createArticle(owner, world.id, article(used.id));
    const stale = await record();
    const fresh = await record();
    await db.recording.update({ where: { id: stale.id }, data: { createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000) } });
    await db.recording.update({ where: { id: used.id }, data: { createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000) } });

    expect(await pruneAbandonedRecordings(world.id)).toBe(1);
    expect((await db.recording.findMany({ select: { id: true } })).map((r) => r.id).sort()).toEqual([used.id, fresh.id].sort());
    expect(onDisk(stale.key)).toBe(false);
  });
});
