import { existsSync } from "node:fs";
import path from "node:path";

export const EMBLEM_EXTENSIONS = ["svg", "png", "webp", "jpg", "jpeg", "avif"] as const;

/**
 * Site emblem: drop a file named `emblem.<ext>` into /public and it is used
 * across the site. Returns its public URL, or null when none is present.
 */
export function findEmblem(publicDir = path.join(process.cwd(), "public")): string | null {
  for (const ext of EMBLEM_EXTENSIONS) {
    if (existsSync(path.join(publicDir, `emblem.${ext}`))) return `/emblem.${ext}`;
  }
  return null;
}
