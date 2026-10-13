import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ArticleForm } from "@/components/admin/forms";
import { db } from "@/lib/db";
import { deleteArticle, updateArticle } from "../../../../../actions";
import { loadEditableWorld } from "../../../../data";
import { systemsForSelect } from "../systemsForSelect";

export default async function EditArticlePage({ params }: { params: Promise<{ worldId: string; articleId: string }> }) {
  const p = await params;
  const { world } = await loadEditableWorld(p.worldId);
  const article = await db.article.findFirst({ where: { id: p.articleId, worldId: world.id } });
  if (!article) notFound();

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/worlds/${world.id}/articles`} className="text-sm text-ash hover:text-parchment">← Lore</Link>
        <h2 className="font-display text-2xl">{article.title}</h2>
        {article.published && world.published && (
          <Link href={`/w/${world.slug}/lore/${article.slug}`} target="_blank" className="ml-auto text-sm text-cerulean-bright hover:underline">View ↗</Link>
        )}
      </div>
      <ArticleForm action={updateArticle.bind(null, article.id)} article={article} systems={await systemsForSelect(world.id)} />
      <div className="mt-12 border-t border-line pt-6">
        <DeleteButton action={deleteArticle.bind(null, world.id, article.id)} label="Delete record" confirmText={`Delete "${article.title}"?`} />
      </div>
    </div>
  );
}
