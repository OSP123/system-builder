"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlanetLook } from "@/lib/galaxy/planets";
import { atmosphereMaterial, planetCloudsMaterial, planetSurfaceMaterial, texturedSurfaceMaterial } from "./shaders";

type Props = {
  look: PlanetLook;
  radius?: number;
  /** Sphere tessellation; lower for small planets in the system view. */
  segments?: number;
  /** Radians per second of rotation; 0 to hold still. */
  spin?: number;
  /** Light from a star at the world origin (system view) instead of a fixed key light. */
  litFromOrigin?: boolean;
  /** Things fixed to the surface (e.g. region markers); they turn with the planet. */
  children?: React.ReactNode;
};

/** A globe: noise-generated surface, drifting clouds and a glowing atmosphere rim. */
export function ProceduralPlanet({ look, radius = 1, segments = 96, spin = 0.05, litFromOrigin = false, children }: Props) {
  const surface = useMemo(() => planetSurfaceMaterial(look), [look]);
  const clouds = useMemo(() => planetCloudsMaterial(look), [look]);
  const atmosphere = useMemo(() => atmosphereMaterial(look), [look]);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  // Shared with the textured surface so both light the same way.
  const sunDir = useRef(new THREE.Vector3(1, 0.35, 0.6).normalize());
  const cloudMesh = useRef<THREE.Mesh>(null);

  useEffect(
    () => () => {
      surface.dispose();
      clouds.dispose();
      atmosphere.dispose();
    },
    [surface, clouds, atmosphere],
  );

  useFrame((state, delta) => {
    if (body.current) body.current.rotation.y += spin * delta;
    if (cloudMesh.current) cloudMesh.current.rotation.y += spin * 0.35 * delta;
    clouds.uniforms.uTime.value = spin ? state.clock.elapsedTime : 0;
    if (litFromOrigin && root.current) {
      root.current.getWorldPosition(worldPos);
      if (worldPos.lengthSq() > 0) sunDir.current.copy(worldPos).negate().normalize();
    }
    surface.uniforms.uSunDir.value.copy(sunDir.current);
    clouds.uniforms.uSunDir.value.copy(sunDir.current);
  });

  return (
    <group ref={root}>
      <group ref={body} rotation={[0.25, 0, 0.08]}>
        {look.texture ? (
          // Until the image loads, show the generated surface.
          <Suspense fallback={<Surface material={surface} radius={radius} segments={segments} />}>
            <TexturedSurface url={look.texture} radius={radius} segments={segments} sunDir={sunDir} />
          </Suspense>
        ) : (
          <Surface material={surface} radius={radius} segments={segments} />
        )}
        {/* An image map carries its own clouds. */}
        {look.clouds > 0 && !look.texture && (
          <mesh ref={cloudMesh} material={clouds}>
            <sphereGeometry args={[radius * 1.015, segments, segments]} />
          </mesh>
        )}
        {children}
      </group>
      {look.atmosphereStrength > 0 && (
        <mesh material={atmosphere}>
          <sphereGeometry args={[radius * 1.12, Math.max(32, segments / 2), Math.max(32, segments / 2)]} />
        </mesh>
      )}
    </group>
  );
}

/** Stops pointer events at the surface, so markers on the far side can't be clicked through the planet. */
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

function Surface({ material, radius, segments }: { material: THREE.Material; radius: number; segments: number }) {
  return (
    <mesh material={material} onClick={stop} onPointerOver={stop}>
      <sphereGeometry args={[radius, segments, segments]} />
    </mesh>
  );
}

/**
 * An image-mapped globe, oriented like three-globe (react-globe.gl): the
 * sphere's default UVs turned a quarter turn so longitude 0 faces +Z, which is
 * also how region markers are placed (see latLngToVector).
 */
function TexturedSurface({
  url,
  radius,
  segments,
  sunDir,
}: {
  url: string;
  radius: number;
  segments: number;
  sunDir: React.RefObject<THREE.Vector3>;
}) {
  const texture = useLoader(THREE.TextureLoader, url);
  const material = useMemo(() => {
    texture.anisotropy = 8;
    return texturedSurfaceMaterial(texture);
  }, [texture]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(() => {
    material.uniforms.uSunDir.value.copy(sunDir.current);
  });
  return (
    <mesh material={material} rotation={[0, -Math.PI / 2, 0]} onClick={stop} onPointerOver={stop}>
      <sphereGeometry args={[radius, segments, Math.max(16, segments / 2)]} />
    </mesh>
  );
}
