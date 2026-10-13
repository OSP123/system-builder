import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// react-markdown does not render raw HTML by default, so author content can't inject scripts.
export function Markdown({ children, dropCap = false }: { children: string; dropCap?: boolean }) {
  return (
    <div className={dropCap ? "prose-lore dropcap" : "prose-lore"}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
