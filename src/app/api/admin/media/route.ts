import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertCanContribute, ContentError, ForbiddenError } from "@/lib/content";
import { db } from "@/lib/db";
import { MAX_UPLOAD_BYTES, publicUrl, saveImage, UploadError } from "@/lib/storage";

/** Upload one image into a world's media library. multipart/form-data: file, worldId, alt? */
export async function POST(req: Request) {
  const session = await getSession();
  // Re-read the user: the cookie's role may be stale, and the account may be disabled.
  const user = session
    ? await db.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, disabled: true } })
    : null;
  if (!user || user.disabled) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const worldId = String(form?.get("worldId") ?? "");
  if (!(file instanceof File) || !worldId) {
    return NextResponse.json({ error: "Expected a file and worldId" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is larger than 10 MB" }, { status: 413 });
  }

  try {
    await assertCanContribute(user, worldId);
    const saved = await saveImage(new Uint8Array(await file.arrayBuffer()));
    const alt = String(form?.get("alt") ?? "").trim().slice(0, 300) || null;
    const media = await db.media.create({
      data: {
        key: saved.key,
        mimeType: saved.mimeType,
        size: saved.size,
        originalName: file.name.slice(0, 200),
        alt,
        worldId,
        uploadedById: user.id,
      },
    });
    return NextResponse.json({ media: { ...media, url: publicUrl(media.key) } }, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError || e instanceof ContentError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
