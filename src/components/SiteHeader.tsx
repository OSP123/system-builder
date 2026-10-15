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
        <nav className="scroll-fade -mx-4 flex basis-[calc(100%+2rem)] items-center gap-x-5 overflow-x-auto whitespace-nowrap px-4 font-display text-sm uppercase tracking-[0.2em] text-ash [scrollbar-width:none] sm:mx-0 sm:flex-1 sm:basis-auto sm:flex-wrap sm:overflow-visible sm:px-0 [&_a]:py-2 [&_a:hover]:text-blood-bright">
          {children}
          <Link href="/galaxy" className="sm:ml-auto">Galaxy Map</Link>
        </nav>
      </div>
      <div className="ink-rule" />
    </header>
  );
}
