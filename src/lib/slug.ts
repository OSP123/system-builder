import slugifyLib from "slugify";

export function slugify(input: string): string {
  return slugifyLib(input, { lower: true, strict: true, trim: true }).slice(0, 80);
}

/** Lowercase letters, digits and single hyphens, no leading/trailing hyphen. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
