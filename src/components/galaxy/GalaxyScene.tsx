"use client";

import { Line, OrbitControls, Stars } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  ASTRONOMICAN_RADIUS_LY,
  GREAT_RIFT_PATH,
  LANDMARKS,
  SEGMENTUM_WEDGES,
  SOLAR_RADIUS_LY,
  TERRA,
  toScene,
  wedgeBoundaryLine,
} from "@/lib/galaxy/coords";
import { generateGalaxy } from "@/lib/galaxy/generate";
import { rng } from "@/lib/galaxy/random";
import type { MapSystem, MapWorld } from "@/lib/galaxy/state";
import { CameraRig, type Shot } from "./CameraRig";
import { galaxyPointsMaterial, glowTexture } from "./shaders";

export const GALAXY_SHOT: Shot = { position: [6, 92, 70], target: [6, 0, 8] };

/** Close-up framing on a system marker, used for the fly-in before switching scenes. */
export function systemApproach(s: MapSystem): Shot {
  const [x, y, z] = toScene(s.x, s.y, s.z);
  return { position: [x, y + 2.2, z + 2.6], target: [x, y, z] };
}

type Props = {
  systems: MapSystem[];
  worlds: MapWorld[];
  overlays: { segmenta: boolean; labels: boolean; rift: boolean };
  reducedMotion: boolean;
  starCount: number;
  flyTo: Shot | null;
  onArrive: () => void;
  onSelectSystem: (s: MapSystem) => void;
  onHoverSystem: (id: string | null) => void;
};

export function GalaxyScene({ systems, worlds, overlays, reducedMotion, starCount, flyTo, onArrive, onSelectSystem, onHoverSystem }: Props) {
  const [interacted, setInteracted] = useState(false);
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const shot = useMemo<Shot>(() => {
    // The default framing fits a landscape screen; widen it for portrait ones.
    if (aspect >= 1) return GALAXY_SHOT;
    // Portrait: no side panel to make room for, so centre on the core and pull back to fit the disc.
    const k = Math.min(1.9, 1.0 / aspect);
    const [, y, z] = GALAXY_SHOT.position;
    return { position: [0, y * k, z * k], target: [0, 0, 4] };
  }, [aspect]);
  const colorOf = useMemo(() => new Map(worlds.map((w) => [w.slug, w.color])), [worlds]);

  return (
    <>
      <color attach="background" args={["#030204"]} />
      <Stars radius={260} depth={80} count={3500} factor={5} saturation={0} fade speed={reducedMotion ? 0 : 0.3} />
      <StarCloud count={starCount} />
      <CoreGlow />
      {/* Labels for all of these live in the DOM layer (see labels.tsx). */}
      <Segmenta visible={overlays.segmenta} />
      <Landmarks />
      <GreatRift visible={overlays.rift} />
      {systems.map((s) => (
        <SystemMarker
          key={s.id}
          system={s}
          color={colorOf.get(s.worldSlug) ?? "#d4af5a"}
          onSelect={() => onSelectSystem(s)}
          onHover={(on) => onHoverSystem(on ? s.id : null)}
        />
      ))}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={240}
        maxPolarAngle={Math.PI * 0.49}
        autoRotate={!reducedMotion && !interacted && !flyTo}
        autoRotateSpeed={0.12}
        onStart={() => setInteracted(true)}
      />
      <CameraRig shot={shot} flyTo={flyTo} onArrive={onArrive} reducedMotion={reducedMotion} />
    </>
  );
}

function StarCloud({ count }: { count: number }) {
  const { gl } = useThree();
  const geometry = useMemo(() => {
    const g = generateGalaxy({ seed: 41, count });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(g.positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(g.colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(g.sizes, 1));
    return geo;
  }, [count]);
  const material = useMemo(() => galaxyPointsMaterial(gl.getPixelRatio()), [gl]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return <points geometry={geometry} material={material} />;
}

function CoreGlow() {
  const texture = useMemo(() => glowTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite scale={[34, 34, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.75} />
    </sprite>
  );
}

function circle(centerX: number, centerZ: number, radiusLy: number, steps = 128): [number, number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return toScene(centerX + Math.cos(a) * radiusLy, 0, centerZ + Math.sin(a) * radiusLy);
  });
}

function Segmenta({ visible }: { visible: boolean }) {
  const solar = useMemo(() => circle(TERRA.x, TERRA.z, SOLAR_RADIUS_LY), []);
  const astronomican = useMemo(() => circle(TERRA.x, TERRA.z, ASTRONOMICAN_RADIUS_LY, 160), []);
  const wedges = useMemo(
    () =>
      SEGMENTUM_WEDGES.map((w) => {
        const [a, b] = wedgeBoundaryLine(w.from);
        return [toScene(a.x, 0, a.z), toScene(b.x, 0, b.z)] as [number, number, number][];
      }),
    [],
  );
  return (
    <group visible={visible}>
      <Line points={solar} color="#c9a45c" lineWidth={1.2} transparent opacity={0.55} />
      <Line points={astronomican} color="#c9a45c" lineWidth={1} transparent opacity={0.18} dashed dashSize={1.2} gapSize={1} />
      {wedges.map((pts, i) => (
        <Line key={i} points={pts} color="#c9a45c" lineWidth={1} transparent opacity={0.3} dashed dashSize={0.8} gapSize={0.6} />
      ))}
    </group>
  );
}

function Landmarks() {
  return (
    <group>
      {LANDMARKS.map((l) => {
        const pos = toScene(l.x, 0, l.z);
        const isTerra = l.kind === "terra";
        const isWarp = l.kind === "warp";
        return (
          <group key={l.id} position={pos}>
            {isWarp ? (
              <WarpStorm />
            ) : (
              l.kind !== "region" && (
                <mesh>
                  <sphereGeometry args={[isTerra ? 0.45 : 0.25, 16, 16]} />
                  <meshBasicMaterial color={isTerra ? "#ffd27a" : "#cfc0a0"} />
                </mesh>
              )
            )}
          </group>
        );
      })}
    </group>
  );
}

/** A swirling violet glow for warp storms (Eye of Terror, Maelstrom). */
function WarpStorm() {
  const ref = useRef<THREE.Group>(null);
  const texture = useMemo(() => glowTexture("rgba(220,120,255,0.9)", "rgba(140,40,200,0.35)"), []);
  useEffect(() => () => texture.dispose(), [texture]);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.15;
  });
  return (
    <group ref={ref}>
      <sprite scale={[5.5, 5.5, 1]}>
        <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.9} />
      </sprite>
    </group>
  );
}

function GreatRift({ visible }: { visible: boolean }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(GREAT_RIFT_PATH.map((p) => new THREE.Vector3(...toScene(p.x, 0, p.z))));
    const rand = rng(999);
    const n = 9000;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = rand();
      const p = curve.getPoint(t);
      const width = 1.6 + Math.sin(t * Math.PI) * 2.4;
      pos.set([p.x + (rand() - 0.5) * width, (rand() - 0.5) * 0.6, p.z + (rand() - 0.5) * width], i * 3);
      const hot = rand();
      col.set(hot < 0.5 ? [0.85, 0.15, 0.55] : [0.55, 0.12, 0.85], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group visible={visible}>
      <points geometry={geometry}>
        <pointsMaterial size={0.35} vertexColors transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function SystemMarker({ system, color, onSelect, onHover }: { system: MapSystem; color: string; onSelect: () => void; onHover: (on: boolean) => void }) {
  const [hover, setHover] = useState(false);
  const ring = useRef<THREE.Mesh>(null);
  const pos = toScene(system.x, system.y, system.z);
  useFrame((state) => {
    if (ring.current) {
      const s = 1 + 0.25 * Math.sin(state.clock.elapsedTime * 2 + system.x);
      ring.current.scale.set(s, s, s);
    }
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
    <group position={pos}>
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
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={hover ? 1 : 0.85} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1.0, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
