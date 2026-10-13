import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { db } from "@/lib/db";
import { loadEditableWorld } from "../../../data";

export default async function SystemsPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
  const systems = await db.starSystem.findMany({
    where: { worldId: world.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { planets: true } } },
  });
  const base = `/admin/worlds/${world.id}/systems`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl">Star systems</h2>
        <Link href={`${base}/new`} className="btn btn-primary">+ New system</Link>
      </div>
      {systems.length === 0 ? (
        <p className="text-ash">No systems charted yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {systems.map((s) => (
            <li key={s.id}>
              <Link href={`${base}/${s.id}`} className="gothic-frame flex items-center justify-between p-4">
                <span>
                  <span className="block font-display text-lg">{s.name}</span>
                  <span className="text-xs text-ash">{s._count.planets} planets · ({s.x}, {s.y}, {s.z})</span>
                </span>
                <StatusBadge published={s.published} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
