import Link from "next/link";
import { Emblem } from "@/components/ornament/Emblem";
import { requireUser } from "@/lib/auth";
import { logout } from "../actions";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-void/95">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:py-3">
          <Link href="/admin" className="flex items-center gap-3 py-1">
            <Emblem className="h-7 w-auto" />
            <span className="gothic-title text-3xl">{SITE.name}</span>
            <span className="hidden font-mono text-xs uppercase tracking-[0.3em] text-phosphor/80 sm:inline">{"// Administratum"}</span>
          </Link>
          <Link href="/" className="py-2 text-sm text-ash hover:text-gold-bright" target="_blank">View site ↗</Link>
          {/* Second row on phones */}
          <div className="flex w-full min-w-0 items-center gap-4 font-mono text-xs uppercase tracking-widest text-ash sm:ml-auto sm:w-auto">
            {user.role === "ADMIN" && (
              <Link href="/admin/users" className="py-2 hover:text-gold-bright">Users</Link>
            )}
            <Link href="/admin/account" className="min-w-0 truncate py-2 hover:text-gold-bright" title={user.email}>
              {user.name || user.email}
            </Link>
            <form action={logout} className="ml-auto sm:ml-0">
              <button type="submit" className="whitespace-nowrap py-2 uppercase hover:text-blood-bright">Sign out</button>
            </form>
          </div>
        </div>
        <div className="ink-rule" />
      </header>
      {process.env.UPLOADS_EPHEMERAL === "true" && (
        <p role="note" className="border-b border-blood bg-blood/30 px-4 py-2 text-center text-sm text-parchment">
          Image uploads are temporary on this host and will be lost on the next deploy or restart. Text content is safe.
        </p>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
