import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { editableWorldsWhere } from "@/lib/content";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const worlds = await db.world.findMany({
    where: editableWorldsWhere(user),
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { articles: true, systems: true, media: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase tracking-[0.15em]">Your worlds</h1>
        <Link href="/admin/worlds/new" className="btn btn-primary">+ New world</Link>
      </div>
      {worlds.length === 0 ? (
        <p className="mt-8 text-ash">No worlds yet. Create your first one.</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {worlds.map((w) => (
            <li key={w.id}>
              <Link href={`/admin/worlds/${w.id}`} className="gothic-frame block p-5">
                <div className="flex items-center justify-between">
                  <h2 className="gothic-title text-3xl">{w.name}</h2>
                  <StatusBadge published={w.published} />
                </div>
                <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ash">
                  {w._count.articles} records · {w._count.systems} systems · {w._count.media} images
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

