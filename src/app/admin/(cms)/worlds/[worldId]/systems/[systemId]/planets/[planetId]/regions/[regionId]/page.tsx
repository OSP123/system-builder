import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadOnlyRecord } from "@/components/admin/Authorship";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { RegionForm } from "@/components/admin/forms";
import { db } from "@/lib/db";
import { canEditRecord } from "@/lib/permissions";
import { deleteRegion, updateRegion } from "../../../../../../../../../actions";
import { authorSelect, loadCmsWorld } from "../../../../../../../../data";

export default async function EditRegionPage({
  params,
}: {
  params: Promise<{ worldId: string; systemId: string; planetId: string; regionId: string }>;
}) {
  const p = await params;
  const { user, world } = await loadCmsWorld(p.worldId);
  const region = await db.region.findFirst({
    where: { id: p.regionId, planetId: p.planetId, planet: { systemId: p.systemId, system: { worldId: world.id } } },
    include: { author: authorSelect, planet: { select: { name: true, slug: true, published: true, system: { select: { slug: true } } } } },
  });
  if (!region) notFound();
  const back = `/admin/worlds/${world.id}/systems/${p.systemId}/planets/${p.planetId}`;
  const publicHref =
    region.published && region.planet.published && world.published
      ? `/w/${world.slug}/systems/${region.planet.system.slug}/${region.planet.slug}/${region.slug}`
      : null;
  if (!canEditRecord(user, region)) {
    return <ReadOnlyRecord title={region.name} author={region.author} backHref={back} backLabel={region.planet.name} publicHref={publicHref} />;
  }
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={back} className="tap text-sm text-ash hover:text-parchment">← {region.planet.name}</Link>
        <h2 className="font-display text-2xl">{region.name}</h2>
        {publicHref && (
          <Link href={publicHref} target="_blank" className="tap ml-auto text-sm text-cerulean-bright hover:underline">View ↗</Link>
        )}
      </div>
      <RegionForm action={updateRegion.bind(null, region.id)} region={region} />
      <div className="mt-12 border-t border-line pt-6">
        <DeleteButton
          action={deleteRegion.bind(null, world.id, p.systemId, p.planetId, region.id)}
          label="Delete region"
          confirmText={`Delete "${region.name}"?`}
        />
      </div>
    </div>
  );
}
