import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * File storage for uploaded images. Local disk for now; swap the
 * implementation for S3/R2 when deploying somewhere without a persistent disk.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const KEY_PATTERN = /^[a-z0-9]{24}\.(jpg|png|webp|gif|avif)$/;

export class UploadError extends Error {}

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

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

export function mimeForKey(key: string): string {
  const ext = key.split(".").pop();
  const entry = Object.entries(ALLOWED_IMAGE_TYPES).find(([, e]) => e === ext);
  return entry ? entry[0] : "application/octet-stream";
}

export async function saveImage(data: Uint8Array): Promise<{ key: string; mimeType: string; size: number }> {
  if (data.byteLength === 0) throw new UploadError("File is empty");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("File is larger than 10 MB");
  const mimeType = sniffImageType(data);
  if (!mimeType) throw new UploadError("Only JPEG, PNG, WebP, GIF and AVIF images are allowed");

  const key = `${randomBytes(12).toString("hex")}.${ALLOWED_IMAGE_TYPES[mimeType]}`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), key), data);
  return { key, mimeType, size: data.byteLength };
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
  await unlink(path.join(uploadDir(), key)).catch(() => undefined);
}

export function publicUrl(key: string): string {
  return `/media/${key}`;
}
