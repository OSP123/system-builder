"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function WorldTabs({ worldId }: { worldId: string }) {
  const pathname = usePathname();
  const base = `/admin/worlds/${worldId}`;
  const tabs = [
    { href: base, label: "Overview", active: pathname === base },
    { href: `${base}/articles`, label: "Lore", active: pathname.startsWith(`${base}/articles`) },
    { href: `${base}/characters`, label: "Characters", active: pathname.startsWith(`${base}/characters`) },
    { href: `${base}/units`, label: "Army List", active: pathname.startsWith(`${base}/units`) },
    { href: `${base}/narratives`, label: "Narratives", active: pathname.startsWith(`${base}/narratives`) },
    { href: `${base}/systems`, label: "Star Systems", active: pathname.startsWith(`${base}/systems`) },
    { href: `${base}/media`, label: "Media", active: pathname.startsWith(`${base}/media`) },
  ];
  return (
    <nav className="scroll-fade -mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-3 font-display text-xs uppercase tracking-[0.2em] ${t.active ? "border-blood-bright text-gold-bright" : "border-transparent text-ash hover:text-parchment"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
