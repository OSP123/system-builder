/**
 * Creates the Supabase Storage bucket for uploads if it is missing. Does
 * nothing when Supabase Storage isn't configured (local disk is used then).
 * Runs on every Render boot via start:render.
 */
import "dotenv/config";
import { ensureBucket, supabaseStorage } from "../src/lib/storage";

async function main() {
  const s = supabaseStorage();
  if (!s) return console.log("Uploads: local disk (UPLOAD_DIR).");
  console.log(`Uploads: Supabase Storage, bucket "${s.bucket}" ${await ensureBucket(s)}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
