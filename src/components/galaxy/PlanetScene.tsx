"use client";

import { OrbitControls, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mapPlanetLook } from "@/lib/galaxy/planets";
import type { MapPlanet, MapRegion } from "@/lib/galaxy/state";
import { latLngToVector } from "@/lib/regions";
import { CameraRig, type Shot } from "./CameraRig";
import { useAnchor, type LabelBus } from "./labels";
import { ProceduralPlanet } from "./ProceduralPlanet";

const SHOT: Shot = { position: [0, 1.2, 8.5], target: [0, 0, 0] };
const RADIUS = 3;

type Props = {
  planet: MapPlanet;
  bus: LabelBus;
  reducedMotion: boolean;
  selectedRegion: string | null;
  onSelectRegion: (r: MapRegion) => void;
  onHoverRegion: (id: string | null) => void;
};

export function PlanetScene({ planet, bus, reducedMotion, selectedRegion, onSelectRegion, onHoverRegion }: Props) {
  const look = useMemo(() => mapPlanetLook(planet), [planet]);
  // Slower spin when there are regions to read and click.
  const spin = reducedMotion ? 0 : planet.regions.length ? 0.025 : 0.06;
  return (
    <>
      <color attach="background" args={["#010103"]} />
      <Stars radius={150} depth={50} count={3000} factor={4} saturation={0} fade speed={0} />
      <ProceduralPlanet look={look} radius={RADIUS} segments={128} spin={spin}>
        {planet.regions.map((r) => (
          <RegionMarker
            key={r.id}
            region={r}
            bus={bus}
            selected={selectedRegion === r.id}
            reducedMotion={reducedMotion}
            onSelect={() => onSelectRegion(r)}
            onHover={(on) => onHoverRegion(on ? r.id : null)}
          />
        ))}
      </ProceduralPlanet>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={4.2} maxDistance={18} />
      <CameraRig shot={SHOT} reducedMotion={reducedMotion} />
    </>
  );
}

function RegionMarker({
  region,
  bus,
  selected,
  reducedMotion,
  onSelect,
  onHover,
}: {
  region: MapRegion;
  bus: LabelBus;
  selected: boolean;
  reducedMotion: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
}) {
  const position = useMemo(() => latLngToVector(region.lat, region.lng, RADIUS * 1.012), [region.lat, region.lng]);
  // Lie flat on the surface: turn the marker's +Z toward the planet's centre (its local origin),
  // which stays correct however the globe tilts and spins.
  const quaternion = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...position).negate().normalize()),
    [position],
  );
  const ring = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const [anchor, setAnchor] = useState<THREE.Object3D | null>(null);
  useAnchor(bus, `region:${region.id}`, anchor);

  useFrame((state) => {
    if (!ring.current) return;
    const s = reducedMotion ? 1 : 1 + 0.3 * Math.sin(state.clock.elapsedTime * 2.4 + region.lat);
    ring.current.scale.setScalar(selected || hover ? 1.4 : s);
  });
  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    onHover(hover);
    return () => {
      document.body.style.cursor = "";
    };
    // onHover identity changes every render; only react to hover itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover]);

  const color = selected ? "#ffd27a" : "#ff6a3d";
  return (
    <group position={position} quaternion={quaternion}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.11, 0.15, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
      </mesh>
      {/* Generous invisible hit area for touch */}
      <mesh visible={false} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <sphereGeometry args={[0.28, 8, 8]} />
      </mesh>
      <object3D ref={setAnchor} position={[0, 0, -0.18]} />
    </group>
  );
}
