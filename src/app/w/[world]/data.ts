import { cache } from "react";
import { notFound } from "next/navigation";
import { getPublishedWorld } from "@/lib/queries";

/** Load a published world or 404; cached per request so layout + page share it. */
export const loadWorld = cache(async (slug: string) => {
  const world = await getPublishedWorld(slug);
  if (!world) notFound();
  return world;
});
