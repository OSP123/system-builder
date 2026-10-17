import { db } from "./db";
import { deleteImage } from "./storage";

/**
 * Narration recordings belong to at most one record or narrative. When one is
 * replaced, removed, or its record deleted, the recording and its file go too.
 */

/** Delete a recording (and its file) if nothing narrates with it any more. */
export async function pruneRecording(id: string | null | undefined) {
  if (!id) return;
  const r = await db.recording.findUnique({ where: { id }, select: { key: true, article: { select: { id: true } }, narrative: { select: { id: true } } } });
  if (!r || r.article || r.narrative) return;
  await db.recording.delete({ where: { id } });
  await deleteImage(r.key);
}

/** Recordings made in the CMS but never saved onto anything, after a day. */
export async function pruneAbandonedRecordings(worldId: string, olderThanMs = 24 * 60 * 60 * 1000) {
  const stale = await db.recording.findMany({
    where: { worldId, createdAt: { lt: new Date(Date.now() - olderThanMs) }, article: { is: null }, narrative: { is: null } },
    select: { id: true },
  });
  for (const r of stale) await pruneRecording(r.id);
  return stale.length;
}
