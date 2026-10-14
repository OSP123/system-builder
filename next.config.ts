import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The e2e suite builds into its own folder so it never collides with a
  // running `npm run dev`, which writes to .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
