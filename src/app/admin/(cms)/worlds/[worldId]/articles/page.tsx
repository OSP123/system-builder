import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CATEGORY_LABELS } from "@/lib/categories";
import { db } from "@/lib/db";
import { loadEditableWorld } from "../../../data";

export default async function ArticlesPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { world } = await loadEditableWorld((await params).worldId);
  const articles = await db.article.findMany({
    where: { worldId: world.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, category: true, published: true, updatedAt: true },
  });
  const base = `/admin/worlds/${world.id}/articles`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl">Lore records</h2>
        <Link href={`${base}/new`} className="btn btn-primary">+ New record</Link>
      </div>
      {articles.length === 0 ? (
        <p className="text-ash">No records yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-ash">
            <tr><th className="py-2">Title</th><th>Category</th><th>Status</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-t border-line">
                <td className="py-3"><Link href={`${base}/${a.id}`} className="text-parchment hover:text-gold-bright">{a.title}</Link></td>
                <td className="text-ash">{CATEGORY_LABELS[a.category]}</td>
                <td><StatusBadge published={a.published} /></td>
                <td className="text-ash">{a.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
