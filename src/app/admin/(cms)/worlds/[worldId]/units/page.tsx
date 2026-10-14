import Link from "next/link";
import { AuthorTag } from "@/components/admin/Authorship";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SLOT_LABELS } from "@/lib/codex";
import { db } from "@/lib/db";
import { authorSelect, loadCmsWorld } from "../../../data";

export default async function UnitsAdminPage({ params }: { params: Promise<{ worldId: string }> }) {
  const { user, world } = await loadCmsWorld((await params).worldId);
  const units = await db.unit.findMany({
    where: { worldId: world.id },
    orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slot: true, points: true, published: true, author: authorSelect },
  });
  const base = `/admin/worlds/${world.id}/units`;
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl">Army list</h2>
        <Link href={`${base}/new`} className="btn btn-primary">+ New unit</Link>
      </div>
      {units.length === 0 ? (
        <p className="text-ash">No units yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-ash">
            <tr><th className="py-2">Unit</th><th>Slot</th><th>Points</th><th>Author</th><th>Visibility</th></tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="py-3"><Link href={`${base}/${u.id}`} className="text-parchment hover:text-gold-bright">{u.name}</Link></td>
                <td className="text-ash">{SLOT_LABELS[u.slot]}</td>
                <td className="text-ash">{u.points ?? "—"}</td>
                <td className="text-xs"><AuthorTag author={u.author} currentUserId={user.id} /></td>
                <td><StatusBadge published={u.published} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
