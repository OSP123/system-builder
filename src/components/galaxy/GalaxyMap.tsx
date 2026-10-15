"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import type { GalaxyData } from "@/lib/galaxy/state";

function Loading() {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-[#030204]">
      <p className="cogitator cursor-blink p-4 font-mono text-xs uppercase tracking-[0.3em]">Consecrating the holo-chart</p>
    </div>
  );
}

// three.js needs the browser; load the explorer client-side only.
const GalaxyExplorer = dynamic(() => import("./GalaxyExplorer"), { ssr: false, loading: Loading });

export function GalaxyMap({ data }: { data: GalaxyData }) {
  return (
    <Suspense fallback={<Loading />}>
      <GalaxyExplorer data={data} />
    </Suspense>
  );
}
