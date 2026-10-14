import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canContribute, canManageWorld } from "@/lib/permissions";

/**
 * Load a world the current user may work in (any published world, or one
 * they own; admins see all), or 404 so private worlds aren't revealed.
 * `canManage` says whether they may change the world's own settings.
 */
export const loadCmsWorld = cache(async (worldId: string) => {
  const user = await requireUser();
  const world = await db.world.findUnique({ where: { id: worldId } });
  if (!world || !canContribute(user, world)) notFound();
  return { user, world, canManage: canManageWorld(user, world) };
});

/** Author fields to include when listing or loading records. */
export const authorSelect = { select: { id: true, name: true, email: true } } as const;
