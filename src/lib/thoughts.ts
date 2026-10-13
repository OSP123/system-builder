// Original lines in the grimdark style, one per day.
export const THOUGHTS = [
  "The sea keeps its secrets. So must you.",
  "Curiosity is a blade; grip it by the hilt.",
  "In silence, loyalty. In secrecy, survival.",
  "Every depth hides a deeper dark.",
  "Knowledge unearned is knowledge that devours.",
  "The Emperor's light reaches far, but not to the bottom of the sea.",
  "Ten thousand years of silence are no excuse for doubt.",
  "Faith is the hull; doubt is the leak.",
  "The archive remembers what the living forget.",
  "A sealed door is a prayer answered.",
  "What the xenos built, the xenos may yet return to claim.",
  "Ask not what lies beneath. Ask who sent you to look.",
];

export function thoughtForDate(date: Date): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return THOUGHTS[day % THOUGHTS.length];
}

/** Short archive reference code derived from a record id. */
export function archiveRef(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `CRL-${(h % 1_000_000).toString().padStart(6, "0")}`;
}
