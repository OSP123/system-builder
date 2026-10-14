import Link from "next/link";

type Author = { id: string; name: string | null; email: string } | null;

/** "You", the author's name, or "Unknown" for records whose author was removed. */
export function AuthorTag({ author, currentUserId }: { author: Author; currentUserId: string }) {
  if (!author) return <span className="text-ash">Unknown</span>;
  if (author.id === currentUserId) {
    return <span className="border border-phosphor/40 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-widest text-phosphor">You</span>;
  }
  return <span className="text-ash">{author.name || author.email}</span>;
}

/** Shown instead of an editor when the user may view but not change a record. */
export function ReadOnlyRecord({
  title,
  author,
  backHref,
  backLabel,
  publicHref,
}: {
  title: string;
  author: Author;
  backHref: string;
  backLabel: string;
  publicHref?: string | null;
}) {
  return (
    <div className="max-w-2xl">
      <Link href={backHref} className="text-sm text-ash hover:text-parchment">← {backLabel}</Link>
      <div className="mt-6 border-2 border-blood bg-[#1a0806] p-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-blood-bright">+++ Sealed record +++</p>
        <h2 className="gothic-title mt-3 text-4xl">{title}</h2>
        <p className="mt-4 font-serif text-lg text-parchment">
          This record was set down by <strong>{author ? author.name || author.email : "an unknown hand"}</strong>.
          Only its author or an admin may alter or destroy it.
        </p>
        {publicHref && (
          <Link href={publicHref} target="_blank" className="btn btn-ghost mt-6">
            Read the public record ↗
          </Link>
        )}
      </div>
    </div>
  );
}
