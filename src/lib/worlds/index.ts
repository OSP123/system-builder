import type { WorldSpec } from "../world-import";
import { VESPERA_PRIME } from "./vespera-prime";

/** Worlds imported on startup (create-only; see src/lib/world-import.ts). Cerulean has its own importer. */
export const WORLDS: WorldSpec[] = [VESPERA_PRIME];
