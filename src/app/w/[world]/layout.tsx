import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { loadWorld } from "./data";

export const dynamic = "force-dynamic";

export default async function WorldLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ world: string }>;
}) {
  const world = await loadWorld((await params).world);
  return (
    <div className="min-h-screen">
      <SiteHeader>
        <span className="text-blood-bright">✠</span>
        <Link href={`/w/${world.slug}`} className="text-parchment">{world.name}</Link>
        <Link href={`/w/${world.slug}`}>Lore</Link>
        <Link href={`/w/${world.slug}/characters`}>Characters</Link>
        <Link href={`/w/${world.slug}/units`}>Army List</Link>
        <Link href={`/w/${world.slug}/narratives`}>Narratives</Link>
        <Link href={`/w/${world.slug}/systems`}>Star Systems</Link>
      </SiteHeader>
      <main className="mx-auto max-w-6xl px-4 pt-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
