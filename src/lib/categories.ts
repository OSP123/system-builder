import type { ArticleCategory } from "@prisma/client";

export const CATEGORY_LABELS: Record<ArticleCategory, string> = {
  HISTORY: "History",
  FACTION: "Factions",
  CHAPTER: "Astartes Chapters",
  REGIMENT: "Regiments",
  CHARACTER: "Characters",
  LOCATION: "Locations",
  EVENT: "Events",
  BATTLE: "Battles & Wars",
  ARTIFACT: "Artifacts & Relics",
  XENOS: "Xenos",
  HERETIC: "Heretics & Chaos",
  RELIGION: "Faith & Cults",
  TECHNOLOGY: "Technology",
  OTHER: "Miscellany",
};

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as ArticleCategory[];
