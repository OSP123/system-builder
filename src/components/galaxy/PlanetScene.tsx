"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { useMemo } from "react";
import { planetLook } from "@/lib/galaxy/planets";
import type { MapPlanet } from "@/lib/galaxy/state";
import { CameraRig, type Shot } from "./CameraRig";
import { ProceduralPlanet } from "./ProceduralPlanet";

const SHOT: Shot = { position: [0, 1.2, 8.5], target: [0, 0, 0] };

export function PlanetScene({ planet, reducedMotion }: { planet: MapPlanet; reducedMotion: boolean }) {
  const look = useMemo(() => planetLook(planet.id, planet.classification, planet.genParams), [planet]);
  return (
    <>
      <color attach="background" args={["#010103"]} />
      <Stars radius={150} depth={50} count={3000} factor={4} saturation={0} fade speed={0} />
      <ProceduralPlanet look={look} radius={3} segments={128} spin={reducedMotion ? 0 : 0.06} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={4.2} maxDistance={18} />
      <CameraRig shot={SHOT} reducedMotion={reducedMotion} />
    </>
  );
}
