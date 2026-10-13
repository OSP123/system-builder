import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PlanetForm } from "@/components/admin/forms";
import { db } from "@/lib/db";
import { deletePlanet, updatePlanet } from "../../../../../../../actions";
import { loadEditableWorld } from "../../../../../../data";

export default async function EditPlanetPage({
  params,
}: {
  params: Promise<{ worldId: string; systemId: string; planetId: string }>;
}) {
  const p = await params;
  const { world } = await loadEditableWorld(p.worldId);
  const planet = await db.planet.findFirst({
    where: { id: p.planetId, systemId: p.systemId, system: { worldId: world.id } },
    include: { system: { select: { id: true, name: true } } },
  });
  if (!planet) notFound();

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/worlds/${world.id}/systems/${planet.system.id}`} className="text-sm text-ash hover:text-parchment">← {planet.system.name}</Link>
        <h2 className="font-display text-2xl">{planet.name}</h2>
      </div>
      <PlanetForm action={updatePlanet.bind(null, planet.id)} planet={planet} />
      <div className="mt-12 border-t border-line pt-6">
        <DeleteButton action={deletePlanet.bind(null, world.id, planet.system.id, planet.id)} label="Delete planet" confirmText={`Delete "${planet.name}"?`} />
      </div>
    </div>
  );
}
