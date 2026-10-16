import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PlanetForm } from "@/components/admin/forms";
import { AuthorTag, ReadOnlyRecord } from "@/components/admin/Authorship";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatLatLng } from "@/lib/regions";
import { db } from "@/lib/db";
import { canEditRecord } from "@/lib/permissions";
import { deletePlanet, updatePlanet } from "../../../../../../../actions";
import { authorSelect, loadCmsWorld } from "../../../../../../data";

export default async function EditPlanetPage({
  params,
}: {
  params: Promise<{ worldId: string; systemId: string; planetId: string }>;
}) {
  const p = await params;
  const { user, world } = await loadCmsWorld(p.worldId);
  const planet = await db.planet.findFirst({
    where: { id: p.planetId, systemId: p.systemId, system: { worldId: world.id } },
    include: {
      system: { select: { id: true, name: true, slug: true } },
      author: authorSelect,
      regions: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { author: authorSelect } },
    },
  });
  if (!planet) notFound();
  // Contributors who didn't create this planet can't edit it, but may still add regions to it.
  const editable = canEditRecord(user, planet);
  const base = `/admin/worlds/${world.id}/systems/${planet.system.id}/planets/${planet.id}`;

  return (
    <div className="max-w-3xl space-y-12">
      {editable ? (
        <div>
          <div className="mb-6 flex items-center gap-4">
            <Link href={`/admin/worlds/${world.id}/systems/${planet.system.id}`} className="tap text-sm text-ash hover:text-parchment">← {planet.system.name}</Link>
            <h2 className="font-display text-2xl">{planet.name}</h2>
          </div>
          <PlanetForm action={updatePlanet.bind(null, planet.id)} planet={planet} />
          <div className="mt-12 border-t border-line pt-6">
            <DeleteButton action={deletePlanet.bind(null, world.id, planet.system.id, planet.id)} label="Delete planet" confirmText={`Delete "${planet.name}" and its regions?`} />
          </div>
        </div>
      ) : (
        <ReadOnlyRecord
          title={planet.name}
          author={planet.author}
          backHref={`/admin/worlds/${world.id}/systems/${planet.system.id}`}
          backLabel={planet.system.name}
          publicHref={planet.published && world.published ? `/w/${world.slug}/systems/${planet.system.slug}/${planet.slug}` : null}
        />
      )}

      <section aria-labelledby="regions-heading">
        <div className="flex items-center justify-between">
          <h3 id="regions-heading" className="font-display text-lg text-gold">Regions</h3>
          <Link href={`${base}/regions/new`} className="btn btn-ghost">+ Add region</Link>
        </div>
        <p className="mt-1 text-xs text-ash">Places on this planet, such as theatres of war, shown as markers on the galaxy map&apos;s globe.</p>
        <ul className="mt-4 space-y-2">
          {planet.regions.length === 0 && <li className="text-sm text-ash">No regions yet.</li>}
          {planet.regions.map((r) => (
            <li key={r.id}>
              <Link href={`${base}/regions/${r.id}`} className="flex items-center justify-between gap-3 border border-line bg-panel px-3 py-2 hover:border-gold">
                <span className="min-w-0">
                  <span className="block text-parchment">{r.name}</span>
                  <span className="block text-xs text-ash">
                    {[r.kind, formatLatLng(r.lat, r.lng)].filter(Boolean).join(" · ")} · <AuthorTag author={r.author} currentUserId={user.id} />
                  </span>
                </span>
                <StatusBadge published={r.published} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
