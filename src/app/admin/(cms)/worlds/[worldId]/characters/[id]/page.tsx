import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { CharacterForm } from "@/components/admin/forms";
import { db } from "@/lib/db";
import { deleteCharacter, updateCharacter } from "../../../../../actions";
import { loadEditableWorld } from "../../../../data";
import { systemsForSelect } from "../../articles/systemsForSelect";

export default async function EditCharacterPage({ params }: { params: Promise<{ worldId: string; id: string }> }) {
  const p = await params;
  const { world } = await loadEditableWorld(p.worldId);
  const character = await db.character.findFirst({ where: { id: p.id, worldId: world.id } });
  if (!character) notFound();
  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/worlds/${world.id}/characters`} className="text-sm text-ash hover:text-parchment">← Characters</Link>
        <h2 className="font-display text-2xl">{character.name}</h2>
        {character.published && world.published && (
          <Link href={`/w/${world.slug}/characters/${character.slug}`} target="_blank" className="ml-auto text-sm text-cerulean-bright hover:underline">View ↗</Link>
        )}
      </div>
      <CharacterForm action={updateCharacter.bind(null, character.id)} character={character} planets={await systemsForSelect(world.id)} />
      <div className="mt-12 border-t border-line pt-6">
        <DeleteButton action={deleteCharacter.bind(null, world.id, character.id)} label="Delete character" confirmText={`Delete "${character.name}"?`} />
      </div>
    </div>
  );
}
