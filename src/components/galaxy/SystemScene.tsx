"use client";

import { Line, OrbitControls, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { mapPlanetLook, orbitPeriod, orbitRadius, sortByOrbit } from "@/lib/galaxy/planets";
import { hashString } from "@/lib/galaxy/random";
import type { MapPlanet, MapSystem } from "@/lib/galaxy/state";
import { starLook } from "@/lib/galaxy/stars";
import { CameraRig, type Shot } from "./CameraRig";
import { ProceduralPlanet } from "./ProceduralPlanet";
import { useAnchor, type LabelBus } from "./labels";
import { glowTexture, starMaterial } from "./shaders";

type Props = {
  system: MapSystem;
  bus: LabelBus;
  reducedMotion: boolean;
  onSelectPlanet: (p: MapPlanet) => void;
  onHoverPlanet: (id: string | null) => void;
};

export function SystemScene({ system, bus, reducedMotion, onSelectPlanet, onHoverPlanet }: Props) {
  const planets = useMemo(() => sortByOrbit(system.planets), [system.planets]);
  const star = starLook(system.starType);
  const outer = planets.length ? orbitRadius(planets.length - 1) : 6;
  const shot: Shot = { position: [0, outer * 0.95 + 4, outer * 1.35 + 4], target: [0, 0, 0] };

  return (
    <>
      <color attach="background" args={["#020104"]} />
      <Stars radius={200} depth={60} count={2500} factor={4} saturation={0} fade speed={0} />
      <ambientLight intensity={0.08} />
      <Star color={star.color} scale={star.scale} />
      {planets.map((p, i) => (
        <OrbitingPlanet
          key={p.id}
          planet={p}
          radius={orbitRadius(i)}
          bus={bus}
          reducedMotion={reducedMotion}
          onSelect={() => onSelectPlanet(p)}
          onHover={(on) => onHoverPlanet(on ? p.id : null)}
        />
      ))}
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={3} maxDistance={outer * 4 + 20} />
      <CameraRig shot={shot} reducedMotion={reducedMotion} />
    </>
  );
}

function Star({ color, scale }: { color: string; scale: number }) {
  const texture = useMemo(() => glowTexture(), []);
  const material = useMemo(() => starMaterial(color), [color]);
  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material],
  );
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <group>
      <mesh material={material}>
        <sphereGeometry args={[1.4 * scale, 64, 64]} />
      </mesh>
      <sprite scale={[9 * scale, 9 * scale, 1]}>
        <spriteMaterial map={texture} color={color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

function OrbitingPlanet({
  planet,
  radius,
  bus,
  reducedMotion,
  onSelect,
  onHover,
}: {
  planet: MapPlanet;
  radius: number;
  bus: LabelBus;
  reducedMotion: boolean;
  onSelect: () => void;
  onHover: (on: boolean) => void;
}) {
  const look = useMemo(() => mapPlanetLook(planet), [planet]);
  const holder = useRef<THREE.Group>(null);
  // The label anchor sits just above the planet and travels with it.
  const [labelAnchor, setLabelAnchor] = useState<THREE.Object3D | null>(null);
  useAnchor(bus, `planet:${planet.id}`, labelAnchor);
  const [hover, setHover] = useState(false);
  // Start each planet at its own point on the orbit.
  const phase = useMemo(() => (hashString(planet.id) % 360) * (Math.PI / 180), [planet.id]);
  const ring = useMemo(
    () => Array.from({ length: 129 }, (_, i) => {
      const a = (i / 128) * Math.PI * 2;
      return [Math.cos(a) * radius, 0, Math.sin(a) * radius] as [number, number, number];
    }),
    [radius],
  );
  const size = 0.62 * look.size;

  useFrame((state) => {
    if (!holder.current) return;
    const a = phase + (reducedMotion ? 0 : (state.clock.elapsedTime / orbitPeriod(radius)) * Math.PI * 2);
    holder.current.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
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

  return (
    <group>
      <Line points={ring} color={hover ? "#d4af5a" : "#5a4a35"} lineWidth={1} transparent opacity={hover ? 0.9 : 0.45} />
      <group ref={holder}>
        <group
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
          <ProceduralPlanet look={look} radius={size} segments={48} spin={reducedMotion ? 0 : 0.3} litFromOrigin />
          {/* Larger invisible hit area so small planets are easy to click */}
          <mesh visible={false}>
            <sphereGeometry args={[Math.max(size * 2.2, 0.9), 12, 12]} />
          </mesh>
        </group>
        <object3D ref={setLabelAnchor} position={[0, size + 0.35, 0]} />
      </group>
    </group>
  );
}
