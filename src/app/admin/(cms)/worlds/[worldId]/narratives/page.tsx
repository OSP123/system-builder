import Link from "next/link";
import { AuthorTag } from "@/components/admin/Authorship";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { db } from "@/lib/db";
import { authorSelect, loadCmsWorld } from "../../../data";

export default async function NarrativesAdminPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { user, world } = await loadCmsWorld((await params).worldId);
  const narratives = await db.narrative.findMany({
    where: { worldId: world.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, subtitle: true, published: true, updatedAt: true, author: authorSelect },
  });
  const base = `/admin/worlds/${world.id}/narratives`;
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl">Narratives</h2>
        <Link href={`${base}/new`} className="btn btn-primary">+ New narrative</Link>
      </div>
      {narratives.length === 0 ? (
        <p className="text-ash">No narratives yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-ash">
            <tr><th className="py-2">Title</th><th>Author</th><th>Visibility</th><th>Updated</th></tr>
          </thead>
          <tbody>
            {narratives.map((n) => (
              <tr key={n.id} className="border-t border-line">
                <td className="py-3">
                  <Link href={`${base}/${n.id}`} className="text-parchment hover:text-gold-bright">{n.title}</Link>
                  {n.subtitle && <span className="block text-xs text-ash">{n.subtitle}</span>}
                </td>
                <td className="text-xs"><AuthorTag author={n.author} currentUserId={user.id} /></td>
                <td><StatusBadge published={n.published} /></td>
                <td className="text-ash">{n.updatedAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
