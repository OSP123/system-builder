import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanetForm } from "@/components/admin/forms";
import { db } from "@/lib/db";
import { createPlanet } from "../../../../../../../actions";
import { loadCmsWorld } from "../../../../../../data";

export default async function NewPlanetPage({ params }: { params: Promise<{ worldId: string; systemId: string }> }) {
  const p = await params;
  const { world } = await loadCmsWorld(p.worldId);
  const system = await db.starSystem.findFirst({ where: { id: p.systemId, worldId: world.id } });
  if (!system) notFound();
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/worlds/${world.id}/systems/${system.id}`} className="text-sm text-ash hover:text-parchment">← {system.name}</Link>
        <h2 className="font-display text-2xl">New planet</h2>
      </div>
      <PlanetForm action={createPlanet.bind(null, world.id, system.id)} />
    </div>
  );
}
