import { db } from "../db";
import { worldColor, type GalaxyData } from "./state";

/** Everything the galaxy map shows: published systems and planets of published worlds. */
export async function getGalaxyData(): Promise<GalaxyData> {
  const worlds = await db.world.findMany({
    where: { published: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      systems: {
        where: { published: true },
        orderBy: { name: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          starType: true,
          segmentum: true,
          x: true,
          y: true,
          z: true,
          planets: {
            where: { published: true },
            select: {
              id: true,
              slug: true,
              name: true,
              classification: true,
              orbitIndex: true,
              population: true,
              genParams: true,
              textureImage: { select: { key: true } },
              regions: {
                where: { published: true },
                orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
                select: { id: true, slug: true, name: true, kind: true, summary: true, lat: true, lng: true },
              },
            },
          },
        },
      },
    },
  });

  return {
    worlds: worlds.map((w, i) => ({ id: w.id, slug: w.slug, name: w.name, color: worldColor(i) })),
    systems: worlds.flatMap((w) =>
      w.systems.map(({ planets, ...s }) => ({
        ...s,
        worldSlug: w.slug,
        planets: planets.map(({ textureImage, ...p }) => ({ ...p, textureUrl: textureImage ? `/media/${textureImage.key}` : null })),
      })),
    ),
  };
}
