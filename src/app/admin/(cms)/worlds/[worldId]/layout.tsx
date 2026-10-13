import Link from "next/link";
import { MediaLibraryProvider } from "@/components/admin/MediaLibrary";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { WorldTabs } from "@/components/admin/WorldTabs";
import { db } from "@/lib/db";
import { loadEditableWorld } from "../../data";

export default async function WorldAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ worldId: string }>;
}) {
  const { world } = await loadEditableWorld((await params).worldId);
  const media = await db.media.findMany({
    where: { worldId: world.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, key: true, alt: true, originalName: true },
  });

  return (
    <MediaLibraryProvider worldId={world.id} initial={media}>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="gothic-title text-5xl">{world.name}</h1>
        <StatusBadge published={world.published} />
        {world.published && (
          <Link href={`/w/${world.slug}`} target="_blank" className="ml-auto text-sm text-cerulean-bright hover:underline">
            View public page ↗
          </Link>
        )}
      </div>
      <WorldTabs worldId={world.id} />
      <div className="pt-8">{children}</div>
    </MediaLibraryProvider>
  );
}
