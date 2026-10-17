import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage for uploaded images and audio recordings: Supabase Storage when SUPABASE_URL and
 * SUPABASE_SECRET_KEY are set (production, where the disk is ephemeral),
 * otherwise local disk under UPLOAD_DIR. Pages always link /media/<key>; that
 * route serves the local file or redirects to the Supabase public URL.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
/** About an hour of speech at the bitrates browsers record at (Supabase's free plan caps files at 50 MB). */
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const ALLOWED_AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

const KEY_PATTERN = /^[a-z0-9]{24}\.(jpg|png|webp|gif|avif|webm|ogg|m4a|mp3|wav)$/;

export class UploadError extends Error {}

type Supabase = { url: string; key: string; bucket: string };

/** Supabase Storage settings, or null to use local disk. */
export function supabaseStorage(): Supabase | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  return url && key ? { url, key, bucket: process.env.SUPABASE_BUCKET?.trim() || "media" } : null;
}

const authHeaders = (s: Supabase) => ({ apikey: s.key, Authorization: `Bearer ${s.key}` });

const BUCKET_SETTINGS = {
  public: true,
  file_size_limit: MAX_AUDIO_BYTES,
  allowed_mime_types: [...Object.keys(ALLOWED_IMAGE_TYPES), ...Object.keys(ALLOWED_AUDIO_TYPES)],
};

/** Create the public bucket, or bring its limits up to date. Safe to call on every boot. */
export async function ensureBucket(s: Supabase = supabaseStorage()!): Promise<"created" | "updated" | "exists"> {
  const json = { ...authHeaders(s), "Content-Type": "application/json" };
  const found = await fetch(`${s.url}/storage/v1/bucket/${s.bucket}`, { headers: authHeaders(s) });
  if (found.ok) {
    const current = (await found.json().catch(() => ({}))) as { public?: boolean; file_size_limit?: number | null; allowed_mime_types?: string[] | null };
    const same =
      current.public === true &&
      current.file_size_limit === BUCKET_SETTINGS.file_size_limit &&
      [...(current.allowed_mime_types ?? [])].sort().join() === [...BUCKET_SETTINGS.allowed_mime_types].sort().join();
    if (same) return "exists";
    const res = await fetch(`${s.url}/storage/v1/bucket/${s.bucket}`, { method: "PUT", headers: json, body: JSON.stringify({ id: s.bucket, ...BUCKET_SETTINGS }) });
    if (!res.ok) throw new Error(`Could not update storage bucket "${s.bucket}": ${res.status} ${await res.text()}`);
    return "updated";
  }
  const res = await fetch(`${s.url}/storage/v1/bucket`, { method: "POST", headers: json, body: JSON.stringify({ id: s.bucket, name: s.bucket, ...BUCKET_SETTINGS }) });
  if (!res.ok) throw new Error(`Could not create storage bucket "${s.bucket}": ${res.status} ${await res.text()}`);
  return "created";
}

function uploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
}

/** Check the file's magic bytes, so a renamed .exe can't pose as an image. */
export function sniffImageType(buf: Uint8Array): string | null {
  const b = buf;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 6 && String.fromCharCode(...b.slice(0, 4)) === "GIF8") return "image/gif";
  if (b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP")
    return "image/webp";
  if (b.length >= 12 && String.fromCharCode(...b.slice(4, 12)).startsWith("ftypavi")) return "image/avif";
  return null;
}

/** The same check for audio: WebM/Opus (Chrome, Firefox), MP4/AAC (Safari), Ogg, MP3 and WAV. */
export function sniffAudioType(b: Uint8Array): string | null {
  const text = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "audio/webm";
  if (b.length >= 4 && text(0, 4) === "OggS") return "audio/ogg";
  if (b.length >= 12 && text(4, 8) === "ftyp" && !/^(avi|hei|mif)/.test(text(8, 11))) return "audio/mp4";
  if (b.length >= 12 && text(0, 4) === "RIFF" && text(8, 12) === "WAVE") return "audio/wav";
  if (b.length >= 3 && (text(0, 3) === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0))) return "audio/mpeg";
  return null;
}

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function mimeForKey(key: string): string {
  const ext = key.split(".").pop();
  const entry = Object.entries({ ...ALLOWED_IMAGE_TYPES, ...ALLOWED_AUDIO_TYPES }).find(([, e]) => e === ext);
  return entry ? entry[0] : "application/octet-stream";
}

export async function saveImage(data: Uint8Array): Promise<{ key: string; mimeType: string; size: number }> {
  if (data.byteLength === 0) throw new UploadError("File is empty");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("File is larger than 10 MB");
  const mimeType = sniffImageType(data);
  if (!mimeType) throw new UploadError("Only JPEG, PNG, WebP, GIF and AVIF images are allowed");

  return store(data, mimeType, ALLOWED_IMAGE_TYPES[mimeType]);
}

export async function saveAudio(data: Uint8Array): Promise<{ key: string; mimeType: string; size: number }> {
  if (data.byteLength === 0) throw new UploadError("The recording is empty");
  if (data.byteLength > MAX_AUDIO_BYTES) throw new UploadError("The recording is larger than 50 MB");
  const mimeType = sniffAudioType(data);
  if (!mimeType) throw new UploadError("Only WebM, MP4/M4A, Ogg, MP3 and WAV audio is allowed");
  return store(data, mimeType, ALLOWED_AUDIO_TYPES[mimeType]);
}

async function store(data: Uint8Array, mimeType: string, ext: string) {
  const key = `${randomBytes(12).toString("hex")}.${ext}`;
  const remote = supabaseStorage();
  if (remote) {
    const res = await fetch(`${remote.url}/storage/v1/object/${remote.bucket}/${key}`, {
      method: "POST",
      headers: { ...authHeaders(remote), "Content-Type": mimeType, "Cache-Control": "max-age=31536000", "x-upsert": "false" },
      body: new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeType }),
    });
    if (!res.ok) throw new UploadError(`File storage refused the upload (${res.status})`);
  } else {
    await mkdir(uploadDir(), { recursive: true });
    await writeFile(path.join(uploadDir(), key), data);
  }
  return { key, mimeType, size: data.byteLength };
}

/** Where a stored file lives in Supabase Storage, or null when stored locally. */
export function remoteImageUrl(key: string): string | null {
  const remote = supabaseStorage();
  return remote && isValidKey(key) ? `${remote.url}/storage/v1/object/public/${remote.bucket}/${key}` : null;
}

export async function readImage(key: string): Promise<Buffer | null> {
  if (!isValidKey(key)) return null;
  try {
    return await readFile(path.join(uploadDir(), key));
  } catch {
    return null;
  }
}

export async function deleteImage(key: string): Promise<void> {
  if (!isValidKey(key)) return;
  const remote = supabaseStorage();
  if (remote) {
    // Best effort, like the local unlink: a missing file is not an error.
    await fetch(`${remote.url}/storage/v1/object/${remote.bucket}`, {
      method: "DELETE",
      headers: { ...authHeaders(remote), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [key] }),
    }).catch(() => undefined);
    return;
  }
  await unlink(path.join(uploadDir(), key)).catch(() => undefined);
}

export function publicUrl(key: string): string {
  return `/media/${key}`;
}
