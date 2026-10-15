import type { Metadata } from "next";
import { GalaxyMap } from "@/components/galaxy/GalaxyMap";
import { SiteHeader } from "@/components/SiteHeader";
import { getGalaxyData } from "@/lib/galaxy/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Galaxy Map",
  description: "A three-dimensional map of the galaxy in the 41st millennium and the worlds charted within it.",
};

export default async function GalaxyPage() {
  const data = await getGalaxyData();
  return (
    // Fill exactly one screen: the header takes what it needs, the map the rest.
    <div className="flex h-dvh flex-col">
      <SiteHeader />
      <main className="relative min-h-0 flex-1">
        <GalaxyMap data={data} />
      </main>
    </div>
  );
}
