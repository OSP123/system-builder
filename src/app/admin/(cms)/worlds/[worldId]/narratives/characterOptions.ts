import { db } from "@/lib/db";

export function characterOptions(worldId: string) {
  return db.character.findMany({
    where: { worldId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, title: true },
  });
}
