import { mimeForKey, readImage, remoteImageUrl } from "@/lib/storage";

// Keys are random and never reused, so files (and redirects to them) can be cached forever.
const CACHE = "public, max-age=31536000, immutable";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const remote = remoteImageUrl(key);
  if (remote) return new Response(null, { status: 308, headers: { Location: remote, "Cache-Control": CACHE } });
  const data = await readImage(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeForKey(key),
      "Cache-Control": CACHE,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
