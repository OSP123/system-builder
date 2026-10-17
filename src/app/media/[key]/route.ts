import { mimeForKey, readImage, remoteImageUrl } from "@/lib/storage";

// Keys are random and never reused, so files (and redirects to them) can be cached forever.
const CACHE = "public, max-age=31536000, immutable";

export async function GET(req: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const remote = remoteImageUrl(key);
  if (remote) return new Response(null, { status: 308, headers: { Location: remote, "Cache-Control": CACHE } });
  const data = await readImage(key);
  if (!data) return new Response("Not found", { status: 404 });
  const headers = {
    "Content-Type": mimeForKey(key),
    "Cache-Control": CACHE,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  };

  // Audio players fetch byte ranges to seek; answer a single "bytes=a-b" range.
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    const size = data.byteLength;
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(data), { headers });
}
