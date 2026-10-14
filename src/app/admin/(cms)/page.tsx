import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { requireUser } from "@/lib/auth";
import { accessibleWorldsWhere } from "@/lib/content";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/permissions";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const user = await requireUser();
  const worlds = await db.world.findMany({
    where: accessibleWorldsWhere(user),
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: { name: true, email: true } },
      _count: { select: { articles: true, systems: true, characters: true, units: true, narratives: true } },
    },
  });
  const admin = isAdmin(user);
  const mine = admin ? worlds : worlds.filter((w) => w.ownerId === user.id);
  const open = admin ? [] : worlds.filter((w) => w.ownerId !== user.id);

  return (
    <div className="space-y-12">
      <section>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl uppercase tracking-[0.15em]">{admin ? "All worlds" : "Your worlds"}</h1>
          <Link href="/admin/worlds/new" className="btn btn-primary">+ New world</Link>
        </div>
        <WorldGrid worlds={mine} empty={admin ? "No worlds yet. Create the first one." : "You haven't founded a world of your own."} showOwner={admin} />
      </section>

      {!admin && (
        <section>
          <h2 className="font-display text-2xl uppercase tracking-[0.15em]">Open to contributors</h2>
          <p className="mt-1 text-sm text-ash">
            Add your own records to these worlds. You can edit and delete what you add; everything else is read-only to you.
          </p>
          <WorldGrid worlds={open} empty="No other worlds are open yet." showOwner />
        </section>
      )}
    </div>
  );
}

type Row = {
  id: string;
  name: string;
  published: boolean;
  owner: { name: string | null; email: string };
  _count: { articles: number; systems: number; characters: number; units: number; narratives: number };
};

function WorldGrid({ worlds, empty, showOwner }: { worlds: Row[]; empty: string; showOwner: boolean }) {
  if (worlds.length === 0) return <p className="mt-6 text-ash">{empty}</p>;
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2">
      {worlds.map((w) => (
        <li key={w.id}>
          <Link href={`/admin/worlds/${w.id}`} className="gothic-frame block p-5">
            <div className="flex items-center justify-between">
              <h3 className="gothic-title text-3xl">{w.name}</h3>
              <StatusBadge published={w.published} />
            </div>
            <p className="mt-3 font-mono text-xs uppercase tracking-widest text-ash">
              {w._count.articles} lore · {w._count.characters} characters · {w._count.units} units · {w._count.narratives} narratives ·{" "}
              {w._count.systems} systems
            </p>
            {showOwner && <p className="mt-2 text-xs text-ash">Owner: {w.owner.name || w.owner.email}</p>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
