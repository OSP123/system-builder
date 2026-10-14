import { NarrativeForm } from "@/components/admin/forms";
import { createNarrative } from "../../../../../actions";
import { loadEditableWorld } from "../../../../data";
import { systemsForSelect } from "../../articles/systemsForSelect";
import { characterOptions } from "../characterOptions";

export default async function NewNarrativePage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
  return (
    <div className="max-w-4xl">
      <h2 className="mb-6 font-display text-2xl">New narrative</h2>
      <NarrativeForm
        action={createNarrative.bind(null, world.id)}
        planets={await systemsForSelect(world.id)}
        characters={await characterOptions(world.id)}
      />
    </div>
  );
}
