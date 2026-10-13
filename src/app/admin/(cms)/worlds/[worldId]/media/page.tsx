import { MediaGrid } from "@/components/admin/MediaGrid";
import { loadEditableWorld } from "../../../data";

export default async function MediaPage({ params }: { params: Promise<{ worldId: string }> }) {
  await loadEditableWorld((await params).worldId);
  return <MediaGrid />;
}
