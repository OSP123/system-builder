import { publicUrl } from "./storage";

/** A stored recording as the CMS narration field and public player need it. */
export function narrationFor(r: { id: string; key: string; durationSec: number | null } | null | undefined) {
  return r ? { id: r.id, url: publicUrl(r.key), durationSec: r.durationSec } : null;
}

export const narrationSelect = { select: { id: true, key: true, durationSec: true } } as const;
