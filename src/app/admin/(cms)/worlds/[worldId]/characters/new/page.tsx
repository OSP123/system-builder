import { CharacterForm } from "@/components/admin/forms";
import { createCharacter } from "../../../../../actions";
import { loadEditableWorld } from "../../../../data";
import { systemsForSelect } from "../../articles/systemsForSelect";

export default async function NewCharacterPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
  return (
    <div className="max-w-4xl">
      <h2 className="mb-6 font-display text-2xl">New character</h2>
      <CharacterForm action={createCharacter.bind(null, world.id)} planets={await systemsForSelect(world.id)} />
    </div>
  );
}
