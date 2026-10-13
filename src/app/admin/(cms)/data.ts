import { cache } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Load a world the current user may edit, or 404 (don't reveal others' worlds). */
export const loadEditableWorld = cache(async (worldId: string) => {
  const user = await requireUser();
  const world = await db.world.findUnique({ where: { id: worldId } });
  if (!world || (user.role !== "ADMIN" && world.ownerId !== user.id)) notFound();
  return { user, world };
});
