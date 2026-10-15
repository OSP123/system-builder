"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Map labels are ordinary DOM elements in a layer above the canvas. Scenes
 * register 3D anchors (a fixed point or a moving object) under an id; the
 * projector moves the element with the same id to the anchor's screen
 * position every frame. Nothing is mounted inside the 3D scene, so swapping
 * scenes can't leave dangling DOM nodes, and labels never cover the UI.
 */
export type LabelBus = {
  anchors: Map<string, THREE.Object3D | THREE.Vector3>;
  elements: Map<string, HTMLElement>;
};

export function useLabelBus(): LabelBus {
  return useMemo(() => ({ anchors: new Map(), elements: new Map() }), []);
}

/** Register a 3D anchor for the lifetime of the calling component. */
export function useAnchor(bus: LabelBus, id: string, anchor: THREE.Object3D | THREE.Vector3 | null) {
  useEffect(() => {
    if (!anchor) return;
    bus.anchors.set(id, anchor);
    return () => {
      if (bus.anchors.get(id) === anchor) bus.anchors.delete(id);
    };
  }, [bus, id, anchor]);
}

/** Inside the Canvas: projects every registered anchor onto the screen. */
export function LabelProjector({ bus }: { bus: LabelBus }) {
  const { camera, size } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const [id, el] of bus.elements) {
      const anchor = bus.anchors.get(id);
      if (!anchor) {
        el.style.visibility = "hidden";
        continue;
      }
      if (anchor instanceof THREE.Vector3) tmp.copy(anchor);
      else anchor.getWorldPosition(tmp);
      // Level of detail: reference labels only appear once the camera is close enough.
      const maxDistance = Number(el.dataset.maxDistance) || Infinity;
      const tooFar = camera.position.distanceTo(tmp) > maxDistance;
      tmp.project(camera);
      const behind = tmp.z > 1 || tmp.z < -1;
      el.style.visibility = behind || tooFar ? "hidden" : "visible";
      if (behind || tooFar) continue;
      const x = (tmp.x * 0.5 + 0.5) * size.width;
      const y = (-tmp.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  });
  return null;
}

/** A DOM label tied to an anchor id. Starts hidden until the projector places it. */
export function MapLabel({
  bus,
  id,
  hidden,
  maxDistance,
  children,
}: {
  bus: LabelBus;
  id: string;
  hidden?: boolean;
  /** Hide the label while the camera is further than this from it (scene units). */
  maxDistance?: number;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={(el) => {
        if (el) bus.elements.set(id, el);
        else bus.elements.delete(id);
      }}
      // Starts invisible via CSS; the projector's inline visibility takes over once placed.
      className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap"
      style={{ display: hidden ? "none" : undefined }}
      data-max-distance={maxDistance}
    >
      {children}
    </div>
  );
}
