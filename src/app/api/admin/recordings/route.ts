import { NextResponse } from "next/server";
import { assertCanContribute, ContentError, ForbiddenError } from "@/lib/content";
import { db } from "@/lib/db";
import { pruneAbandonedRecordings } from "@/lib/recordings";
import { currentUser } from "@/lib/request-user";
import { MAX_AUDIO_BYTES, publicUrl, saveAudio, UploadError } from "@/lib/storage";

/**
 * Upload one narration recording into a world. multipart/form-data: file,
 * worldId, durationSec? The form then attaches it to a record or narrative.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const worldId = String(form?.get("worldId") ?? "");
  if (!(file instanceof File) || !worldId) {
    return NextResponse.json({ error: "Expected a file and worldId" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "The recording is larger than 50 MB" }, { status: 413 });
  }
  const seconds = Math.round(Number(form?.get("durationSec")));
  const durationSec = Number.isFinite(seconds) && seconds > 0 && seconds < 24 * 3600 ? seconds : null;

  try {
    await assertCanContribute(user, worldId);
    const saved = await saveAudio(new Uint8Array(await file.arrayBuffer()));
    const recording = await db.recording.create({
      data: { key: saved.key, mimeType: saved.mimeType, size: saved.size, durationSec, worldId, uploadedById: user.id },
    });
    // Tidy up takes that were recorded but never saved onto anything.
    await pruneAbandonedRecordings(worldId);
    return NextResponse.json({ recording: { id: recording.id, url: publicUrl(recording.key), durationSec } }, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError || e instanceof ContentError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 });
    throw e;
  }
}
