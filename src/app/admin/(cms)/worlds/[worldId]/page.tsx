import Link from "next/link";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { WorldForm } from "@/components/admin/forms";
import { Markdown } from "@/components/Markdown";
import { db } from "@/lib/db";
import { deleteWorld, updateWorld } from "../../../actions";
import { loadCmsWorld } from "../../data";

export default async function WorldOverviewPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { user, world, canManage } = await loadCmsWorld((await params).worldId);

  if (!canManage) {
    const owner = await db.user.findUnique({ where: { id: world.ownerId }, select: { name: true, email: true } });
    const base = `/admin/worlds/${world.id}`;
    const yours = await Promise.all([
      db.article.count({ where: { worldId: world.id, authorId: user.id } }),
      db.character.count({ where: { worldId: world.id, authorId: user.id } }),
      db.unit.count({ where: { worldId: world.id, authorId: user.id } }),
      db.narrative.count({ where: { worldId: world.id, authorId: user.id } }),
    ]);
    return (
      <div className="max-w-3xl space-y-8">
        <div className="cogitator p-5 text-sm">
          <p className="text-xs uppercase tracking-[0.3em]">+++ Contributor access +++</p>
          <p className="mt-2">
            This world is kept by {owner?.name || owner?.email}. You may add records under any tab and change or delete the ones you add.
            The world&apos;s own settings belong to its keeper.
          </p>
          <p className="mt-3 text-xs uppercase tracking-widest opacity-80">
            Your records here: {yours[0]} lore · {yours[1]} characters · {yours[2]} units · {yours[3]} narratives
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`${base}/articles/new`} className="btn btn-primary">+ Lore record</Link>
          <Link href={`${base}/characters/new`} className="btn btn-ghost">+ Character</Link>
          <Link href={`${base}/units/new`} className="btn btn-ghost">+ Unit</Link>
          <Link href={`${base}/narratives/new`} className="btn btn-ghost">+ Narrative</Link>
        </div>
        {world.summary && <Markdown>{world.summary}</Markdown>}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <WorldForm action={updateWorld.bind(null, world.id)} world={world} />
      <div className="mt-16 rounded-lg border border-blood/50 p-5">
        <h2 className="font-semibold text-red-300">Danger zone</h2>
        <p className="mb-4 mt-1 text-sm text-ash">Deleting a world permanently removes all of its records, systems and planets.</p>
        <DeleteButton action={deleteWorld.bind(null, world.id)} label="Delete world" confirmText={`Delete "${world.name}" and everything in it? This cannot be undone.`} />
      </div>
    </div>
  );
}
