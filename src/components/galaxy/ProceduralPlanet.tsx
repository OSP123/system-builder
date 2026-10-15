"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlanetLook } from "@/lib/galaxy/planets";
import { atmosphereMaterial, planetCloudsMaterial, planetSurfaceMaterial } from "./shaders";

type Props = {
  look: PlanetLook;
  radius?: number;
  /** Sphere tessellation; lower for small planets in the system view. */
  segments?: number;
  /** Radians per second of rotation; 0 to hold still. */
  spin?: number;
  /** Light from a star at the world origin (system view) instead of a fixed key light. */
  litFromOrigin?: boolean;
};

/** A globe: noise-generated surface, drifting clouds and a glowing atmosphere rim. */
export function ProceduralPlanet({ look, radius = 1, segments = 96, spin = 0.05, litFromOrigin = false }: Props) {
  const surface = useMemo(() => planetSurfaceMaterial(look), [look]);
  const clouds = useMemo(() => planetCloudsMaterial(look), [look]);
  const atmosphere = useMemo(() => atmosphereMaterial(look), [look]);
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
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
      if (worldPos.lengthSq() > 0) {
        const toStar = worldPos.clone().negate().normalize();
        surface.uniforms.uSunDir.value.copy(toStar);
        clouds.uniforms.uSunDir.value.copy(toStar);
      }
    }
  });

  return (
    <group ref={root}>
      <group ref={body} rotation={[0.25, 0, 0.08]}>
        <mesh material={surface}>
          <sphereGeometry args={[radius, segments, segments]} />
        </mesh>
        {look.clouds > 0 && (
          <mesh ref={cloudMesh} material={clouds}>
            <sphereGeometry args={[radius * 1.015, segments, segments]} />
          </mesh>
        )}
      </group>
      {look.atmosphereStrength > 0 && (
        <mesh material={atmosphere}>
          <sphereGeometry args={[radius * 1.12, Math.max(32, segments / 2), Math.max(32, segments / 2)]} />
        </mesh>
      )}
    </group>
  );
}
