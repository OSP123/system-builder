import Link from "next/link";
import { Emblem } from "./ornament/Emblem";
import { SITE } from "@/lib/site";

export function SiteHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 bg-void/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Emblem className="h-9 w-auto" />
          <span className="gothic-title text-4xl">{SITE.name}</span>
        </Link>
        <nav className="flex basis-full flex-wrap items-center gap-x-5 gap-y-1 font-display text-sm uppercase tracking-[0.2em] text-ash sm:flex-1 sm:basis-auto [&_a:hover]:text-blood-bright">
          {children}
        </nav>
      </div>
      <div className="ink-rule" />
    </header>
  );
}
