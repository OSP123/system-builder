/** Star appearance from a free-text star type ("Blue giant", "Red dwarf", "G-class"...). */

export type StarLook = { color: string; scale: number };

const COLORS: [RegExp, string][] = [
  [/\b(blue|o[- ]?class|b[- ]?class|o-type|b-type)\b/i, "#9bb4ff"],
  [/\b(white|a[- ]?class|a-type|f[- ]?class)\b/i, "#e6ecff"],
  [/\b(yellow|g[- ]?class|g-type)\b/i, "#fff1c9"],
  [/\b(orange|k[- ]?class|k-type)\b/i, "#ffc27a"],
  [/\b(red|m[- ]?class|m-type)\b/i, "#ff7a52"],
  [/\b(black hole|singularity)\b/i, "#3a2b52"],
  [/\b(neutron|pulsar)\b/i, "#c7e4ff"],
];

export function starLook(starType: string | null | undefined): StarLook {
  const t = starType ?? "";
  const color = COLORS.find(([re]) => re.test(t))?.[1] ?? "#fff1c9";
  let scale = 1;
  if (/super\s*giant|hypergiant/i.test(t)) scale = 2.2;
  else if (/giant/i.test(t)) scale = 1.6;
  else if (/dwarf|neutron|pulsar/i.test(t)) scale = 0.6;
  return { color, scale };
}
