import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { NarrativeForm } from "@/components/admin/forms";
import { ReadOnlyRecord } from "@/components/admin/Authorship";
import { db } from "@/lib/db";
import { canEditRecord } from "@/lib/permissions";
import { deleteNarrative, updateNarrative } from "../../../../../actions";
import { authorSelect, loadCmsWorld } from "../../../../data";
import { systemsForSelect } from "../../articles/systemsForSelect";
import { characterOptions } from "../characterOptions";

export default async function EditNarrativePage({ params }: { params: Promise<{ worldId: string; id: string }> }) {
  const p = await params;
  const { user, world } = await loadCmsWorld(p.worldId);
  const narrative = await db.narrative.findFirst({
    where: { id: p.id, worldId: world.id },
    include: { characters: { select: { id: true } }, author: authorSelect },
  });
  if (!narrative) notFound();
  if (!canEditRecord(user, narrative)) {
    return (
      <ReadOnlyRecord
        title={narrative.title}
        author={narrative.author}
        backHref={`/admin/worlds/${world.id}/narratives`}
        backLabel="Narratives"
        publicHref={narrative.published && world.published ? `/w/${world.slug}/narratives/${narrative.slug}` : null}
      />
    );
  }
  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/worlds/${world.id}/narratives`} className="tap text-sm text-ash hover:text-parchment">← Narratives</Link>
        <h2 className="font-display text-2xl">{narrative.title}</h2>
        {narrative.published && world.published && (
          <Link href={`/w/${world.slug}/narratives/${narrative.slug}`} target="_blank" className="tap ml-auto text-sm text-cerulean-bright hover:underline">View ↗</Link>
        )}
      </div>
      <NarrativeForm
        action={updateNarrative.bind(null, narrative.id)}
        narrative={narrative}
        planets={await systemsForSelect(world.id)}
        characters={await characterOptions(world.id)}
      />
      <div className="mt-12 border-t border-line pt-6">
        <DeleteButton action={deleteNarrative.bind(null, world.id, narrative.id)} label="Delete narrative" confirmText={`Delete "${narrative.title}"?`} />
      </div>
    </div>
  );
}
