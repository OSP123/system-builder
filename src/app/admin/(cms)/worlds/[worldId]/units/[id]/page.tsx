import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { UnitForm } from "@/components/admin/forms";
import { ReadOnlyRecord } from "@/components/admin/Authorship";
import { db } from "@/lib/db";
import { canEditRecord } from "@/lib/permissions";
import { deleteUnit, updateUnit } from "../../../../../actions";
import { authorSelect, loadCmsWorld } from "../../../../data";

export default async function EditUnitPage({ params }: { params: Promise<{ worldId: string; id: string }> }) {
  const p = await params;
  const { user, world } = await loadCmsWorld(p.worldId);
  const unit = await db.unit.findFirst({ where: { id: p.id, worldId: world.id }, include: { author: authorSelect } });
  if (!unit) notFound();
  if (!canEditRecord(user, unit)) {
    return (
      <ReadOnlyRecord
        title={unit.name}
        author={unit.author}
        backHref={`/admin/worlds/${world.id}/units`}
        backLabel="Army list"
        publicHref={unit.published && world.published ? `/w/${world.slug}/units/${unit.slug}` : null}
      />
    );
  }
  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/worlds/${world.id}/units`} className="tap text-sm text-ash hover:text-parchment">← Army list</Link>
        <h2 className="font-display text-2xl">{unit.name}</h2>
        {unit.published && world.published && (
          <Link href={`/w/${world.slug}/units/${unit.slug}`} target="_blank" className="tap ml-auto text-sm text-cerulean-bright hover:underline">View ↗</Link>
        )}
      </div>
      <UnitForm action={updateUnit.bind(null, unit.id)} unit={unit} />
      <div className="mt-12 border-t border-line pt-6">
        <DeleteButton action={deleteUnit.bind(null, world.id, unit.id)} label="Delete unit" confirmText={`Delete "${unit.name}"?`} />
      </div>
    </div>
  );
}
