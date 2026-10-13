export function StatusBadge({ published }: { published: boolean }) {
  return published ? (
    <span className="border border-phosphor/40 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-phosphor">Published</span>
  ) : (
    <span className="border border-blood/60 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-blood-bright">Draft</span>
  );
}
