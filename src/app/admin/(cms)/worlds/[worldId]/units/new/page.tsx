import { UnitForm } from "@/components/admin/forms";
import { createUnit } from "../../../../../actions";
import { loadEditableWorld } from "../../../../data";

export default async function NewUnitPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
  return (
    <div className="max-w-4xl">
      <h2 className="mb-6 font-display text-2xl">New unit</h2>
      <UnitForm action={createUnit.bind(null, world.id)} />
    </div>
  );
}
