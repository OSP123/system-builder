import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/media/[key]/route";
import { ALLOWED_AUDIO_TYPES, ALLOWED_IMAGE_TYPES, deleteImage, ensureBucket, MAX_AUDIO_BYTES, remoteImageUrl, saveImage, supabaseStorage } from "@/lib/storage";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const KEY = "0123456789abcdef01234567.png";

describe("Supabase Storage", () => {
  let calls: { url: string; init?: RequestInit }[];
  let respond: (url: string, init?: RequestInit) => Response;

  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co/");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    calls = [];
    respond = () => new Response("{}", { status: 200 });
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return respond(url, init);
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is used only when both the URL and secret key are set", () => {
    expect(supabaseStorage()).toEqual({ url: "https://abc.supabase.co", key: "sb_secret_test", bucket: "media" });
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(supabaseStorage()).toBeNull();
    expect(remoteImageUrl(KEY)).toBeNull();
  });

  it("uploads to the bucket with the secret key", async () => {
    const saved = await saveImage(PNG);
    expect(saved).toMatchObject({ mimeType: "image/png", size: PNG.byteLength });
    const [call] = calls;
    expect(call.url).toBe(`https://abc.supabase.co/storage/v1/object/media/${saved.key}`);
    expect(call.init).toMatchObject({ method: "POST", headers: { apikey: "sb_secret_test", "Content-Type": "image/png", "Cache-Control": "max-age=31536000", "x-upsert": "false" } });
  });

  it("reports a refused upload as an upload error", async () => {
    respond = () => new Response("nope", { status: 403 });
    await expect(saveImage(PNG)).rejects.toThrow(/refused the upload \(403\)/);
  });

  it("serves /media/<key> as a cached redirect to the public URL", async () => {
    const res = await GET(new Request("http://x/media/" + KEY), { params: Promise.resolve({ key: KEY }) });
    expect(res.status).toBe(308);
    expect(res.headers.get("Location")).toBe(`https://abc.supabase.co/storage/v1/object/public/media/${KEY}`);
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(remoteImageUrl("../etc/passwd")).toBeNull();
  });

  it("deletes by key and ignores bad keys", async () => {
    await deleteImage(KEY);
    await deleteImage("../nope");
    expect(calls).toHaveLength(1);
    expect(calls[0].init).toMatchObject({ method: "DELETE", body: JSON.stringify({ prefixes: [KEY] }) });
  });

  it("creates the public bucket when missing and keeps its limits current", async () => {
    const settings = { public: true, file_size_limit: MAX_AUDIO_BYTES, allowed_mime_types: [...Object.keys(ALLOWED_AUDIO_TYPES), ...Object.keys(ALLOWED_IMAGE_TYPES)] };
    respond = () => Response.json(settings);
    expect(await ensureBucket()).toBe("exists");

    // A bucket from before audio: images only, 10 MB.
    respond = (url, init) => (init?.method === "PUT" ? Response.json({}) : Response.json({ ...settings, file_size_limit: 10 * 1024 * 1024, allowed_mime_types: ["image/png"] }));
    expect(await ensureBucket()).toBe("updated");
    expect(calls.at(-1)!.init).toMatchObject({ method: "PUT" });
    expect(JSON.parse(String(calls.at(-1)!.init!.body))).toMatchObject({ file_size_limit: MAX_AUDIO_BYTES, allowed_mime_types: expect.arrayContaining(["audio/webm", "image/png"]) });

    respond = (url) => new Response("", { status: url.endsWith("/bucket/media") ? 404 : 200 });
    expect(await ensureBucket()).toBe("created");
    expect(JSON.parse(String(calls.at(-1)!.init!.body))).toMatchObject({ id: "media", public: true });
  });
});
