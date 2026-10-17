import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e suite builds into its own folder so it never collides with a
  // running `npm run dev`, which writes to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Uploads pass through the auth middleware, which caps bodies at 10 MB by
    // default; narration recordings may be up to 50 MB (MAX_AUDIO_BYTES).
    middlewareClientMaxBodySize: "52mb",
  },
};

export default nextConfig;
