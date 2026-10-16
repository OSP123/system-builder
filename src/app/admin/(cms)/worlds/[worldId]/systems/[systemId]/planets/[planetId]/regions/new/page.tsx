import Link from "next/link";
import { notFound } from "next/navigation";
import { RegionForm } from "@/components/admin/forms";
import { db } from "@/lib/db";
import { createRegion } from "../../../../../../../../../actions";
import { loadCmsWorld } from "../../../../../../../../data";

export default async function NewRegionPage({
  params,
}: {
  params: Promise<{ worldId: string; systemId: string; planetId: string }>;
}) {
  const p = await params;
  const { world } = await loadCmsWorld(p.worldId);
  const planet = await db.planet.findFirst({ where: { id: p.planetId, systemId: p.systemId, system: { worldId: world.id } } });
  if (!planet) notFound();
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={`/admin/worlds/${world.id}/systems/${p.systemId}/planets/${planet.id}`} className="tap text-sm text-ash hover:text-parchment">
          ← {planet.name}
        </Link>
        <h2 className="font-display text-2xl">New region</h2>
      </div>
      <RegionForm action={createRegion.bind(null, world.id, p.systemId, planet.id)} />
    </div>
  );
}
