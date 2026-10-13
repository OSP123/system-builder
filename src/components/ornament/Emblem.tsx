/* eslint-disable @next/next/no-img-element -- static file of unknown dimensions */
import { findEmblem } from "@/lib/emblem";

/** Renders the owner's emblem from /public/emblem.*, or nothing if absent. */
export function Emblem({ className }: { className?: string }) {
  const src = findEmblem();
  if (!src) return null;
  return <img src={src} alt="" aria-hidden className={`emblem ${className ?? ""}`} />;
}
