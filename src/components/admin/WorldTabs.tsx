"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorldTabs({ worldId }: { worldId: string }) {
  const pathname = usePathname();
  const base = `/admin/worlds/${worldId}`;
  const tabs = [
    { href: base, label: "Overview", active: pathname === base },
    { href: `${base}/articles`, label: "Lore", active: pathname.startsWith(`${base}/articles`) },
    { href: `${base}/systems`, label: "Star Systems", active: pathname.startsWith(`${base}/systems`) },
    { href: `${base}/media`, label: "Media", active: pathname.startsWith(`${base}/media`) },
  ];
  return (
    <nav className="flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px border-b-2 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] ${t.active ? "border-blood-bright text-gold-bright" : "border-transparent text-ash hover:text-parchment"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
