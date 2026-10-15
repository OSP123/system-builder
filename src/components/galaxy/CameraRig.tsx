"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

export type Shot = { position: [number, number, number]; target: [number, number, number] };

/**
 * Sets the camera to `shot` when a scene mounts, and flies to `flyTo` when
 * given (calling `onArrive` at the end). With reduced motion, jumps instantly.
 */
export function CameraRig({
  shot,
  flyTo,
  onArrive,
  reducedMotion,
  duration = 1.4,
}: {
  shot: Shot;
  flyTo?: Shot | null;
  onArrive?: () => void;
  reducedMotion: boolean;
  duration?: number;
}) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null };
  const flight = useRef<{ from: Shot; to: Shot; t: number } | null>(null);
  const arrived = useRef(onArrive);
  arrived.current = onArrive;

  // Initial framing for this scene.
  useEffect(() => {
    camera.position.set(...shot.position);
    controls?.target.set(...shot.target);
    controls?.update();
    // Only on mount / when the shot itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot.position.join(","), shot.target.join(","), controls]);

  useEffect(() => {
    if (!flyTo) return;
    if (reducedMotion) {
      arrived.current?.();
      return;
    }
    const target = controls?.target ?? new THREE.Vector3();
    flight.current = {
      from: { position: camera.position.toArray() as Shot["position"], target: target.toArray() as Shot["target"] },
      to: flyTo,
      t: 0,
    };
  }, [flyTo, reducedMotion, camera, controls]);

  useFrame((_, delta) => {
    const f = flight.current;
    if (!f) return;
    f.t = Math.min(1, f.t + delta / duration);
    const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2; // easeInOutCubic
    const lerp = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] - v) * e) as [number, number, number];
    camera.position.set(...lerp(f.from.position, f.to.position));
    controls?.target.set(...lerp(f.from.target, f.to.target));
    controls?.update();
    if (f.t >= 1) {
      flight.current = null;
      arrived.current?.();
    }
  });

  return null;
}
