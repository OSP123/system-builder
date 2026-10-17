import Link from "next/link";
import { AuthorTag } from "@/components/admin/Authorship";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { STATUS_LABELS } from "@/lib/codex";
import { db } from "@/lib/db";
import { authorSelect, loadCmsWorld } from "../../../data";

export default async function CharactersAdminPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { user, world } = await loadCmsWorld((await params).worldId);
  const characters = await db.character.findMany({
    where: { worldId: world.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, title: true, playedBy: true, status: true, sortOrder: true, published: true, author: authorSelect },
  });
  const base = `/admin/worlds/${world.id}/characters`;
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl">Characters</h2>
        <Link href={`${base}/new`} className="btn btn-primary">+ New character</Link>
      </div>
      {characters.length === 0 ? (
        <p className="text-ash">No characters yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-ash">
            <tr><th className="hidden sm:table-cell py-2">#</th><th className="py-2">Name</th><th className="hidden sm:table-cell">Status</th><th>Author</th><th>Visibility</th></tr>
          </thead>
          <tbody>
            {characters.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="hidden sm:table-cell py-3 text-ash">{c.sortOrder}</td>
                <td className="py-3">
                  <Link href={`${base}/${c.id}`} className="tap text-parchment hover:text-gold-bright">{c.name}</Link>
                  {(c.title || c.playedBy) && <span className="block text-xs text-ash">{[c.title, c.playedBy && `commander: ${c.playedBy}`].filter(Boolean).join(" · ")}</span>}
                </td>
                <td className="hidden sm:table-cell text-ash">{STATUS_LABELS[c.status]}</td>
                <td className="text-xs"><AuthorTag author={c.author} currentUserId={user.id} /></td>
                <td><StatusBadge published={c.published} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
