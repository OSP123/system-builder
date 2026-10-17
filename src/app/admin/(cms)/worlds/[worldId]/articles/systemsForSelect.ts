import { db } from "@/lib/db";

export function systemsForSelect(worldId: string) {
  return db.starSystem.findMany({
    where: { worldId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, planets: {
        orderBy: { orbitIndex: "asc" },
        select: { id: true, name: true, regions: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } } },
      }, },
  });
}
