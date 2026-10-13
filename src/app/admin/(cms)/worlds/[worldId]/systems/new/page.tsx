import { SystemForm } from "@/components/admin/forms";
import { createSystem } from "../../../../../actions";
import { loadEditableWorld } from "../../../../data";

export default async function NewSystemPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
  return (
    <div className="max-w-3xl">
      <h2 className="mb-6 font-display text-2xl">New star system</h2>
      <SystemForm action={createSystem.bind(null, world.id)} />
    </div>
  );
}
