import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { listUsersWithCounts } from "@/lib/users";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await listUsersWithCounts();
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl uppercase tracking-[0.15em]">Users</h1>
        <Link href="/admin/users/new" className="btn btn-primary">+ New user</Link>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-widest text-ash">
          <tr><th className="py-2">User</th><th>Role</th><th>Status</th><th className="hidden sm:table-cell">Records</th></tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const c = u._count;
            const records = c.articles + c.characters + c.units + c.narratives + c.systems + c.planets + c.regions;
            return (
              <tr key={u.id} className="border-t border-line">
                <td className="py-3">
                  <Link href={`/admin/users/${u.id}`} className="tap text-parchment hover:text-gold-bright">{u.name || u.email}</Link>
                  {u.name && <span className="block text-xs text-ash">{u.email}</span>}
                  {u.id === me.id && <span className="text-xs text-phosphor">(you)</span>}
                </td>
                <td className={u.role === "ADMIN" ? "text-gold-bright" : "text-ash"}>{ROLE_LABELS[u.role]}</td>
                <td>
                  {u.disabled ? (
                    <span className="border border-blood/60 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-blood-bright">Disabled</span>
                  ) : (
                    <span className="font-mono text-[11px] uppercase tracking-widest text-phosphor">Active</span>
                  )}
                </td>
                <td className="hidden sm:table-cell text-ash">
                  {records}
                  {c.worlds > 0 && ` · ${c.worlds} world${c.worlds === 1 ? "" : "s"}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
