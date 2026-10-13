import { DeleteButton } from "@/components/admin/DeleteButton";
import { WorldForm } from "@/components/admin/forms";
import { deleteWorld, updateWorld } from "../../../actions";
import { loadEditableWorld } from "../../data";

export default async function WorldOverviewPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
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
