import { Skull } from "@/components/ornament/Skull";

/** An off-white printed page with heavy black rules, sitting on the dark site. */
export function RulebookPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rulebook-page ${className}`}>
      {/* skull clasp over the top rule */}
      <span className="absolute left-1/2 top-0 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#15110d] bg-[#e6dcc3]">
        <Skull className="h-5 w-5 text-[#15110d]" />
      </span>
      <div className="relative">{children}</div>
    </div>
  );
}

export function Banner({ children, large = false, as: Tag = "h2" }: { children: React.ReactNode; large?: boolean; as?: "h1" | "h2" | "h3" | "p" }) {
  return <Tag className={`rulebook-banner ${large ? "rulebook-banner-lg" : "text-base"}`}>{children}</Tag>;
}

export function Sidebar({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <aside className={`rulebook-sidebar ${className}`}>
      <p className="head">{title}</p>
      <div className="p-3 text-[0.95rem] leading-snug">{children}</div>
    </aside>
  );
}

export function RulebookQuote({ text, source }: { text: string; source?: string | null }) {
  return (
    <blockquote className="rulebook-quote mx-auto max-w-2xl">
      “{text}”{source && <cite>{source}</cite>}
    </blockquote>
  );
}
