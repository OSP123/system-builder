import { ArticleForm } from "@/components/admin/forms";
import { createArticle } from "../../../../../actions";
import { loadEditableWorld } from "../../../../data";
import { systemsForSelect } from "../systemsForSelect";

export default async function NewArticlePage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
  return (
    <div className="max-w-4xl">
      <h2 className="mb-6 font-display text-2xl">New record</h2>
      <ArticleForm action={createArticle.bind(null, world.id)} systems={await systemsForSelect(world.id)} />
    </div>
  );
}
