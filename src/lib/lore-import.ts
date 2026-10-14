import type { ArticleCategory } from "@prisma/client";

/**
 * Splits a plain-text lore document into CMS articles along known section
 * headings. The author's text is kept verbatim; only light Markdown cleanup
 * is applied (escaped dashes, trimming).
 */

export type SectionSpec = {
  /** Heading line as it appears in the source, matched case-insensitively, trailing ":" optional. */
  heading: string;
  title: string;
  slug: string;
  category: ArticleCategory;
  summary?: string;
  published: boolean;
};

export type ParsedSection = SectionSpec & { body: string };

function normalizeHeading(line: string): string {
  return line.trim().replace(/^\\?-\s*/, "").replace(/:$/, "").trim().toLowerCase();
}

function cleanBody(lines: string[]): string {
  return lines
    .map((l) => l.replace(/^\\-/, "-").replace(/\t/g, " ").replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Returns the preamble (text before the first known heading) and one parsed
 * section per spec found in the document, in document order.
 */
export function parseLoreSections(text: string, specs: SectionSpec[]): { preamble: string; sections: ParsedSection[] } {
  const byHeading = new Map(specs.map((s) => [normalizeHeading(s.heading), s]));
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  const preamble: string[] = [];
  const sections: ParsedSection[] = [];
  let current: { spec: SectionSpec; lines: string[] } | null = null;

  const flush = () => {
    if (current) sections.push({ ...current.spec, body: cleanBody(current.lines) });
  };

  for (const line of lines) {
    const spec = byHeading.get(normalizeHeading(line));
    if (spec && line.trim().length > 0) {
      flush();
      current = { spec, lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  flush();

  return { preamble: cleanBody(preamble), sections };
}

/** Section layout of Sons-of-Cerulean-lore.md. */
export const CERULEAN_SECTIONS: SectionSpec[] = [
  {
    heading: "The Old Ones and the Aeldari",
    title: "The Old Ones and the Aeldari",
    slug: "the-old-ones-and-the-aeldari",
    category: "HISTORY",
    summary: "Makil: a research world forged by the Old Ones and the Aeldari to defeat the Necrontyr.",
    published: true,
  },
  {
    heading: "The Golden Age of Mankind",
    title: "The Golden Age of Mankind",
    slug: "the-golden-age-of-mankind",
    category: "HISTORY",
    summary: "Human colonists name the world Cerulean, survive the Men of Iron, and are rediscovered in the Great Crusade.",
    published: true,
  },
  {
    heading: "The Horus Heresy",
    title: "The Horus Heresy",
    slug: "the-horus-heresy",
    category: "HISTORY",
    summary: "A world kept in silence while the galaxy burned.",
    published: true,
  },
  {
    heading: "Post Heresy",
    title: "Post Heresy",
    slug: "post-heresy",
    category: "HISTORY",
    summary: "Cerulean becomes a thriving research hub and the Sons of Cerulean are formed.",
    published: true,
  },
  {
    heading: "Old Humans",
    title: "The Old Humans",
    slug: "the-old-humans",
    category: "HISTORY",
    summary: "The ancient cryogenic sleepers are awakened, and Syl recalls the horrors of the Men of Iron.",
    published: true,
  },
  {
    heading: "Current Day",
    title: "Current Day",
    slug: "current-day",
    category: "HISTORY",
    summary: "Cerulean Command moves to breach the core and meets the Leviathan of the deep.",
    published: true,
  },
  {
    heading: "Story",
    title: "Story Perspectives",
    slug: "story-perspectives",
    category: "OTHER",
    summary: "Author notes: candidate narrators for Cerulean stories.",
    // Working notes rather than in-world lore, so kept as a draft.
    published: false,
  },
  {
    heading: "Additional details",
    title: "Additional Details",
    slug: "additional-details",
    category: "OTHER",
    summary: "The island continents, their bioforms, and the culture of 10,000 years of isolation.",
    published: true,
  },
  {
    heading: "Eldar Science and Lore",
    title: "Eldar Science and Lore",
    slug: "eldar-science-and-lore",
    category: "XENOS",
    summary: "Mimic creatures and the endless old labs beneath the floating islands.",
    published: true,
  },
  {
    heading: "Other Islands",
    title: "Other Islands",
    slug: "other-islands",
    category: "LOCATION",
    summary: "Rust, and the other island continents of Cerulean.",
    published: true,
  },
];

export type StubSpec = { title: string; slug: string; category: ArticleCategory; summary: string };

/**
 * Empty draft pages for people and places named in the lore, for the author
 * to fill in via the CMS. Created once and never overwritten by the importer.
 */
export const CERULEAN_STUBS: StubSpec[] = [
  { title: "Sons of Cerulean", slug: "sons-of-cerulean", category: "CHAPTER", summary: "The Space Marine legion forged from the companies of the original 18 chapters." },
  { title: "The Citadel", slug: "the-citadel", category: "LOCATION", summary: "Fortress bastion at the heart of the Imperium-held continent, seat of the Cerulean Council." },
  { title: "Rust", slug: "rust", category: "LOCATION", summary: "An island whose shores are fused with millennia of rusted shipwrecks." },
];

export type CharacterStub = { name: string; title: string | null; faction: string; slug: string; summary: string; sortOrder: number };

/**
 * Characters named in the lore, created once as empty drafts in the
 * Characters section. (Earlier versions stored these as CHARACTER articles.)
 */
export const CERULEAN_CHARACTERS: CharacterStub[] = [
  { name: "Hesaar", title: "Custodian Captain", faction: "Adeptus Custodes", slug: "hesaar", sortOrder: 1, summary: "Custodian Captain of Cerulean, at the head of the Cerulean Council." },
  { name: "Strone", title: "Legion Master", faction: "Sons of Cerulean", slug: "strone", sortOrder: 2, summary: "Legion Master of the Sons of Cerulean." },
  { name: "Tarketh", title: "Arch Magos", faction: "Adeptus Mechanicus", slug: "tarketh", sortOrder: 3, summary: "Arch Magos of the Cult of Mars on Cerulean." },
  { name: "Versus", title: "Imperial Commander", faction: "Imperium of Man", slug: "versus", sortOrder: 4, summary: "Imperial Commander of Cerulean." },
  { name: "Syl", title: null, faction: "Old Humans", slug: "syl", sortOrder: 5, summary: "The first of the ancient humans awakened from cryogenic stasis." },
];
