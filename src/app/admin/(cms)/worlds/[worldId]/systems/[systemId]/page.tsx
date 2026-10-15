import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { SystemForm } from "@/components/admin/forms";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AuthorTag, ReadOnlyRecord } from "@/components/admin/Authorship";
import { db } from "@/lib/db";
import { canEditRecord } from "@/lib/permissions";
import { deleteSystem, updateSystem } from "../../../../../actions";
import { authorSelect, loadCmsWorld } from "../../../../data";

export default async function EditSystemPage({ params }: { params: Promise<{ worldId: string; systemId: string }> }) {
  const p = await params;
  const { user, world } = await loadCmsWorld(p.worldId);
  const system = await db.starSystem.findFirst({
    where: { id: p.systemId, worldId: world.id },
    include: { planets: { orderBy: { orbitIndex: "asc" }, include: { author: authorSelect } }, author: authorSelect },
  });
  if (!system) notFound();
  // Contributors who didn't chart this system can't edit it, but may still add planets to it.
  const editable = canEditRecord(user, system);
  const base = `/admin/worlds/${world.id}/systems/${system.id}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
      {editable ? (
        <div>
          <div className="mb-6 flex items-center gap-4">
            <Link href={`/admin/worlds/${world.id}/systems`} className="tap text-sm text-ash hover:text-parchment">← Systems</Link>
            <h2 className="font-display text-2xl">{system.name}</h2>
          </div>
          <SystemForm action={updateSystem.bind(null, system.id)} system={system} />
          <div className="mt-12 border-t border-line pt-6">
            <DeleteButton action={deleteSystem.bind(null, world.id, system.id)} label="Delete system" confirmText={`Delete "${system.name}" and all its planets?`} />
          </div>
        </div>
      ) : (
        <ReadOnlyRecord
          title={system.name}
          author={system.author}
          backHref={`/admin/worlds/${world.id}/systems`}
          backLabel="Star systems"
          publicHref={system.published && world.published ? `/w/${world.slug}/systems/${system.slug}` : null}
        />
      )}
      <aside>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-gold">Planets</h3>
          <Link href={`${base}/planets/new`} className="btn btn-ghost">+ Add</Link>
        </div>
        <ol className="mt-4 space-y-2">
          {system.planets.length === 0 && <li className="text-sm text-ash">No planets yet.</li>}
          {system.planets.map((pl) => (
            <li key={pl.id}>
              <Link href={`${base}/planets/${pl.id}`} className="flex items-center justify-between rounded-md border border-line bg-panel px-3 py-2 hover:border-cerulean">
                <span>
                  <span className="mr-2 text-ash">{pl.orbitIndex}.</span>
                  {pl.name}
                  {pl.classification && <span className="block text-xs text-ash">{pl.classification}</span>}
                  <span className="mt-1 block text-xs"><AuthorTag author={pl.author} currentUserId={user.id} /></span>
                </span>
                <StatusBadge published={pl.published} />
              </Link>
            </li>
          ))}
        </ol>
      </aside>
    </div>
  );
}
