import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingId } from "@/lib/codex";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return Children.toArray(node).map(textOf).join("");
}

/** h2/h3 get ids matching chapterHeadings(), so a table of contents can link to them. */
function anchorComponents(): Components {
  const seen = new Map<string, number>();
  const id = (children: ReactNode) => {
    const base = headingId(textOf(children));
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}-${n}` : base;
  };
  return {
    h2: ({ children }) => <h2 id={id(children)} className="scroll-mt-24">{children}</h2>,
    h3: ({ children }) => <h3 id={id(children)} className="scroll-mt-24">{children}</h3>,
  };
}

// react-markdown does not render raw HTML by default, so author content can't inject scripts.
export function Markdown({
  children,
  dropCap = false,
  variant = "lore",
  anchors = false,
  className = "",
}: {
  children: string;
  dropCap?: boolean;
  variant?: "lore" | "rulebook";
  anchors?: boolean;
  className?: string;
}) {
  const base = variant === "rulebook" ? "prose-rulebook" : "prose-lore";
  return (
    <div className={[base, dropCap && "dropcap", className].filter(Boolean).join(" ")}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={anchors ? anchorComponents() : undefined}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
