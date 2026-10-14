import { MediaGrid } from "@/components/admin/MediaGrid";
import { loadCmsWorld } from "../../../data";

export default async function MediaPage({ params }: { params: Promise<{ worldId: string }> }) {
  await loadCmsWorld((await params).worldId);
  return <MediaGrid />;
}
