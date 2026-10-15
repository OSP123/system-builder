"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  GREAT_RIFT_PATH,
  LANDMARKS,
  SEGMENTUM_LABEL_POSITIONS,
  SEGMENTUM_LABELS,
  segmentumAt,
  toScene,
  type Segmentum,
} from "@/lib/galaxy/coords";
import { planetLook, sortByOrbit } from "@/lib/galaxy/planets";
import { parseView, viewQuery, type GalaxyData, type MapPlanet, type MapSystem, type MapView } from "@/lib/galaxy/state";
import { starLook } from "@/lib/galaxy/stars";
import type { Shot } from "./CameraRig";
import { GalaxyScene, systemApproach } from "./GalaxyScene";
import { LabelProjector, MapLabel, useLabelBus, type LabelBus } from "./labels";
import { PlanetScene } from "./PlanetScene";
import { SystemScene } from "./SystemScene";

type Overlays = { segmenta: boolean; labels: boolean; rift: boolean };

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function GalaxyExplorer({ data }: { data: GalaxyData }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const world = params.get("world");
  const view = parseView({ system: params.get("system"), planet: params.get("planet") }, data);

  const [overlays, setOverlays] = useState<Overlays>({ segmenta: true, labels: true, rift: false });
  const [flight, setFlight] = useState<{ shot: Shot; system: MapSystem } | null>(null);
  const [fading, setFading] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [starCount, setStarCount] = useState(80_000);
  const [panelOpen, setPanelOpen] = useState(true);
  const reducedMotion = useReducedMotion();
  const bus = useLabelBus();
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    setWebgl(hasWebGL());
    if (window.innerWidth < 700) {
      setStarCount(35_000);
      setPanelOpen(false); // keep the map visible on phones; the panel opens on demand
    }
  }, []);

  const visibleSystems = useMemo(
    () => (world ? data.systems.filter((s) => s.worldSlug === world) : data.systems),
    [data.systems, world],
  );
  const system = view.level !== "galaxy" ? data.systems.find((s) => s.id === view.systemId) ?? null : null;
  const planet = view.level === "planet" && system ? system.planets.find((p) => p.id === view.planetId) ?? null : null;

  const go = useCallback(
    (next: MapView, opts: { replace?: boolean; world?: string | null } = {}) => {
      const url = `${pathname}${viewQuery(next, opts.world === undefined ? world : opts.world)}`;
      setFading(!reducedMotion);
      // Native history updates are synced into useSearchParams by Next.js without a
      // server round trip (the map's data is already on the page). Back/Forward still work.
      if (opts.replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [pathname, world, reducedMotion],
  );

  // Fade in after a scene swap.
  useEffect(() => {
    if (!fading) return;
    const t = setTimeout(() => setFading(false), 60);
    return () => clearTimeout(t);
  }, [fading, view.level, system?.id, planet?.id]);

  const selectSystem = useCallback(
    (s: MapSystem) => {
      if (view.level === "galaxy" && webgl && !reducedMotion) setFlight({ shot: systemApproach(s), system: s });
      else go({ level: "system", systemId: s.id });
    },
    [view.level, webgl, reducedMotion, go],
  );

  const arrive = useCallback(() => {
    if (!flight) return;
    const target = flight.system;
    setFlight(null);
    go({ level: "system", systemId: target.id });
  }, [flight, go]);

  const selectPlanet = useCallback(
    (p: MapPlanet) => system && go({ level: "planet", systemId: system.id, planetId: p.id }),
    [system, go],
  );

  const up = useCallback(() => {
    if (view.level === "planet") go({ level: "system", systemId: view.systemId });
    else if (view.level === "system") go({ level: "galaxy" });
  }, [view, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) up();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [up]);

  // Fixed label anchors for the galaxy level (planet anchors move, so their scene registers them).
  useEffect(() => {
    if (view.level !== "galaxy") return;
    const anchors = galaxyAnchors(data.systems);
    for (const [id, v] of anchors) bus.anchors.set(id, v);
    return () => {
      for (const id of anchors.keys()) bus.anchors.delete(id);
    };
  }, [view.level, data.systems, bus]);

  const sceneKey = view.level === "galaxy" ? "galaxy" : view.level === "system" ? `s:${view.systemId}` : `p:${view.planetId}`;
  const worldOf = (s: MapSystem) => data.worlds.find((w) => w.slug === s.worldSlug);

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden bg-[#030204]">
      {/* 3D view */}
      <div
        className="absolute inset-0"
        role="img"
        aria-label={
          view.level === "galaxy"
            ? "Three-dimensional map of the galaxy. Use the systems index to navigate without the map."
            : view.level === "system"
              ? `The ${system?.name} system and its orbiting planets.`
              : `The planet ${planet?.name}.`
        }
      >
        {webgl && (
          <Canvas camera={{ position: [6, 92, 70], fov: 50, near: 0.05, far: 2000 }} dpr={[1, 2]} gl={{ antialias: true }}>
            <Suspense fallback={null}>
              <group key={sceneKey}>
                {view.level === "galaxy" && (
                  <GalaxyScene
                    systems={visibleSystems}
                    worlds={data.worlds}
                    overlays={overlays}
                    reducedMotion={reducedMotion}
                    starCount={starCount}
                    flyTo={flight?.shot ?? null}
                    onArrive={arrive}
                    onSelectSystem={selectSystem}
                    onHoverSystem={setHovered}
                  />
                )}
                {view.level === "system" && system && (
                  <SystemScene system={system} bus={bus} reducedMotion={reducedMotion} onSelectPlanet={selectPlanet} onHoverPlanet={setHovered} />
                )}
                {view.level === "planet" && planet && <PlanetScene planet={planet} reducedMotion={reducedMotion} />}
              </group>
              <LabelProjector bus={bus} />
            </Suspense>
          </Canvas>
        )}
        {webgl && (
          <MapLabels
            bus={bus}
            view={view.level}
            systems={visibleSystems}
            planets={system?.planets ?? []}
            worlds={data.worlds}
            overlays={overlays}
            hovered={hovered}
            onSelectSystem={selectSystem}
            onSelectPlanet={selectPlanet}
          />
        )}
        {webgl === false && (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="cogitator max-w-md p-5 text-sm">
              +++ Holo-chart unavailable +++
              <br />
              This device can&apos;t display 3D graphics. Use the systems index to browse the charted worlds.
            </p>
          </div>
        )}
      </div>

      {/* Fade between levels */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${fading ? "opacity-100" : "opacity-0"}`}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Map level" className="absolute left-4 top-4 z-40 flex flex-wrap items-center gap-2 font-display text-xs uppercase tracking-[0.2em]">
        <Crumb active={view.level === "galaxy"} onClick={() => go({ level: "galaxy" })}>
          Galaxy
        </Crumb>
        {system && (
          <>
            <span className="text-blood-bright">›</span>
            <Crumb active={view.level === "system"} onClick={() => go({ level: "system", systemId: system.id })}>
              {system.name} System
            </Crumb>
          </>
        )}
        {planet && (
          <>
            <span className="text-blood-bright">›</span>
            <Crumb active>{planet.name}</Crumb>
          </>
        )}
      </nav>

      {/* Overlay switches (galaxy level) */}
      {view.level === "galaxy" && (
        <div className="absolute right-4 top-4 z-40 flex flex-col items-end gap-2">
          <fieldset className="flex flex-wrap justify-end gap-x-4 gap-y-1 border border-line bg-void/80 px-3 py-2 text-xs">
            <legend className="sr-only">Map overlays</legend>
            <Toggle label="Segmenta" checked={overlays.segmenta} onChange={(v) => setOverlays((o) => ({ ...o, segmenta: v }))} />
            <Toggle label="Labels" checked={overlays.labels} onChange={(v) => setOverlays((o) => ({ ...o, labels: v }))} />
            <Toggle label="Great Rift" checked={overlays.rift} onChange={(v) => setOverlays((o) => ({ ...o, rift: v }))} />
          </fieldset>
          {data.worlds.length > 1 && (
            <label className="flex items-center gap-2 border border-line bg-void/80 px-3 py-1.5 text-xs">
              <span className="text-ash">World</span>
              <select
                className="bg-transparent text-parchment"
                value={world ?? ""}
                onChange={(e) => go({ level: "galaxy" }, { replace: true, world: e.target.value || null })}
              >
                <option value="">All worlds</option>
                {data.worlds.map((w) => (
                  <option key={w.id} value={w.slug}>{w.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Side panel: right column on desktop, collapsible sheet on phones */}
      <aside
        aria-label="Map details"
        className="absolute inset-x-3 bottom-3 z-40 border border-line bg-void/90 backdrop-blur-sm sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-28 sm:w-80"
      >
        <button
          type="button"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-gold sm:hidden"
        >
          {view.level === "galaxy" ? "Systems index" : view.level === "system" ? `${system?.name} System` : planet?.name}
          <span aria-hidden>{panelOpen ? "▾" : "▴"}</span>
        </button>
        <div className={`max-h-[45dvh] overflow-y-auto p-4 pt-0 sm:block sm:max-h-[calc(100dvh-14rem)] sm:pt-4 ${panelOpen ? "block" : "hidden"}`}>
          {view.level === "galaxy" && (
            <GalaxyPanel systems={visibleSystems} worlds={data.worlds} onSelect={selectSystem} worldOf={worldOf} />
          )}
          {view.level === "system" && system && (
            <SystemPanel system={system} worldName={worldOf(system)?.name} onSelect={selectPlanet} onBack={up} />
          )}
          {view.level === "planet" && system && planet && (
            <PlanetPanel planet={planet} system={system} onBack={up} />
          )}
        </div>
      </aside>

      <p className="pointer-events-none absolute bottom-3 left-4 z-0 hidden font-mono text-[10px] uppercase tracking-[0.2em] text-ash/70 sm:block">
        Positions approximate · light-years from the galactic core · Esc to go back
      </p>
    </div>
  );
}

function Crumb({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return active || !onClick ? (
    <span aria-current={active ? "page" : undefined} className="border border-line bg-void/80 px-2 py-1 text-gold-bright">
      {children}
    </span>
  ) : (
    <button type="button" onClick={onClick} className="border border-line bg-void/80 px-2 py-1 text-ash hover:text-parchment">
      {children}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-parchment">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-blood-bright" />
      {label}
    </label>
  );
}

function PanelHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="rubric">{kicker}</p>
      <h1 className="gothic-title mt-1 text-3xl">{title}</h1>
    </div>
  );
}

function Fact({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.2em] text-ash">{k}</dt>
      <dd className="text-sm text-parchment">{v}</dd>
    </div>
  );
}

function GalaxyPanel({
  systems,
  worlds,
  onSelect,
  worldOf,
}: {
  systems: MapSystem[];
  worlds: GalaxyData["worlds"];
  onSelect: (s: MapSystem) => void;
  worldOf: (s: MapSystem) => GalaxyData["worlds"][number] | undefined;
}) {
  return (
    <div className="space-y-4">
      <PanelHeading kicker="Astrographica" title="The Galaxy" />
      <p className="font-serif text-sm italic text-vellum">
        The Milky Way in the 41st millennium. Drag to turn, scroll to zoom, and select a system to descend.
      </p>
      <section>
        <h2 className="mb-2 font-display text-xs uppercase tracking-[0.25em] text-gold">Systems index</h2>
        {systems.length === 0 ? (
          <p className="text-sm text-ash">No systems have been charted yet.</p>
        ) : (
          <ul className="space-y-1">
            {systems.map((s) => {
              const w = worldOf(s);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(s)}
                    className="flex w-full items-center gap-2 border border-transparent px-2 py-1.5 text-left text-sm hover:border-line hover:bg-hull"
                  >
                    <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: w?.color }} />
                    <span className="flex-1 text-parchment">{s.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-ash">{SEGMENTUM_LABELS[segmentumAt(s.x, s.z)].replace("Segmentum ", "")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {worlds.length > 1 && (
        <section>
          <h2 className="mb-2 font-display text-xs uppercase tracking-[0.25em] text-gold">Worlds</h2>
          <ul className="space-y-1 text-sm">
            {worlds.map((w) => (
              <li key={w.id} className="flex items-center gap-2">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: w.color }} />
                <Link href={`/w/${w.slug}`} className="text-parchment hover:text-gold-bright">{w.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SystemPanel({
  system,
  worldName,
  onSelect,
  onBack,
}: {
  system: MapSystem;
  worldName?: string;
  onSelect: (p: MapPlanet) => void;
  onBack: () => void;
}) {
  const planets = sortByOrbit(system.planets);
  const star = starLook(system.starType);
  return (
    <div className="space-y-4">
      <PanelHeading kicker={worldName ?? "Star system"} title={`${system.name} System`} />
      <dl className="grid grid-cols-2 gap-3">
        <Fact k="Segmentum" v={SEGMENTUM_LABELS[segmentumAt(system.x, system.z)]} />
        {system.segmentum && <Fact k="Region" v={system.segmentum} />}
        <Fact
          k="Star"
          v={
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: star.color }} />
              {system.starType || "Uncatalogued"}
            </span>
          }
        />
        <Fact k="Coordinates (ly)" v={`${system.x.toLocaleString()}, ${system.y.toLocaleString()}, ${system.z.toLocaleString()}`} />
      </dl>
      <section>
        <h2 className="mb-2 font-display text-xs uppercase tracking-[0.25em] text-gold">Planetary bodies</h2>
        {planets.length === 0 ? (
          <p className="text-sm text-ash">No worlds charted in this system.</p>
        ) : (
          <ol className="space-y-1">
            {planets.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className="flex w-full items-baseline gap-2 border border-transparent px-2 py-1.5 text-left text-sm hover:border-line hover:bg-hull"
                >
                  <span className="w-5 text-ash">{p.orbitIndex || "?"}</span>
                  <span className="flex-1 text-parchment">{p.name}</span>
                  {p.classification && <span className="text-xs italic text-ash">{p.classification}</span>}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
      <div className="flex flex-wrap gap-2">
        <Link href={`/w/${system.worldSlug}/systems/${system.slug}`} className="btn btn-primary">Open record</Link>
        <button type="button" onClick={onBack} className="btn btn-ghost">← Galaxy</button>
      </div>
    </div>
  );
}

function PlanetPanel({ planet, system, onBack }: { planet: MapPlanet; system: MapSystem; onBack: () => void }) {
  const look = planetLook(planet.id, planet.classification, planet.genParams);
  return (
    <div className="space-y-4">
      <PanelHeading kicker={`${system.name} System`} title={planet.name} />
      <dl className="grid grid-cols-2 gap-3">
        <Fact k="Classification" v={planet.classification || "Unclassified"} />
        {planet.population && <Fact k="Population" v={planet.population} />}
        <Fact k="Orbit" v={planet.orbitIndex ? `${planet.orbitIndex}` : "Unknown"} />
        <Fact k="Surface water" v={`${Math.round(look.water * 100)}%`} />
      </dl>
      <div className="flex flex-wrap gap-2">
        <Link href={`/w/${system.worldSlug}/systems/${system.slug}/${planet.slug}`} className="btn btn-primary">Open record</Link>
        <button type="button" onClick={onBack} className="btn btn-ghost">← {system.name}</button>
      </div>
    </div>
  );
}

const SEGMENTA = Object.keys(SEGMENTUM_LABEL_POSITIONS) as Segmentum[];

function galaxyAnchors(systems: MapSystem[]): Map<string, THREE.Vector3> {
  const m = new Map<string, THREE.Vector3>();
  for (const s of SEGMENTA) {
    const p = SEGMENTUM_LABEL_POSITIONS[s];
    m.set(`seg:${s}`, new THREE.Vector3(...toScene(p.x, 0, p.z)));
  }
  for (const l of LANDMARKS) m.set(`lm:${l.id}`, new THREE.Vector3(...toScene(l.x, 0, l.z)));
  const rift = new THREE.CatmullRomCurve3(GREAT_RIFT_PATH.map((p) => new THREE.Vector3(...toScene(p.x, 0, p.z))));
  m.set("rift", rift.getPoint(0.42).setY(1.5));
  for (const s of systems) m.set(`sys:${s.id}`, new THREE.Vector3(...toScene(s.x, s.y, s.z)));
  return m;
}

const LANDMARK_STYLE: Record<string, string> = {
  terra: "text-gold-bright",
  warp: "text-[#d06aff]",
  world: "text-parchment",
  region: "text-ash",
};

const labelButton =
  "pointer-events-auto border border-line bg-void/80 px-2 py-0.5 font-display text-xs tracking-[0.12em] text-parchment hover:border-gold hover:text-gold-bright";

function MapLabels({
  bus,
  view,
  systems,
  planets,
  worlds,
  overlays,
  hovered,
  onSelectSystem,
  onSelectPlanet,
}: {
  bus: LabelBus;
  view: MapView["level"];
  systems: MapSystem[];
  planets: MapPlanet[];
  worlds: GalaxyData["worlds"];
  overlays: Overlays;
  hovered: string | null;
  onSelectSystem: (s: MapSystem) => void;
  onSelectPlanet: (p: MapPlanet) => void;
}) {
  const colorOf = new Map(worlds.map((w) => [w.slug, w.color]));
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {view === "galaxy" && (
        <>
          {SEGMENTA.map((s) => (
            <MapLabel key={s} bus={bus} id={`seg:${s}`} hidden={!overlays.segmenta || !overlays.labels}>
              <span className="font-display text-[9px] uppercase tracking-[0.3em] text-gold/80 [text-shadow:0_0_6px_#000] sm:text-[11px] sm:tracking-[0.35em]">
                {SEGMENTUM_LABELS[s]}
              </span>
            </MapLabel>
          ))}
          {LANDMARKS.map((l) => (
            <MapLabel key={l.id} bus={bus} id={`lm:${l.id}`} hidden={!overlays.labels}>
              <span className={`block pb-2 font-display text-[9px] tracking-[0.1em] [text-shadow:0_0_6px_#000] sm:text-[11px] sm:tracking-[0.12em] ${LANDMARK_STYLE[l.kind]}`}>
                {l.kind === "terra" ? "✠ " : ""}
                {l.name}
              </span>
            </MapLabel>
          ))}
          <MapLabel bus={bus} id="rift" hidden={!overlays.rift || !overlays.labels}>
            <span className="font-display text-[11px] uppercase tracking-[0.3em] text-[#e06aa8] [text-shadow:0_0_6px_#000]">
              Cicatrix Maledictum
            </span>
          </MapLabel>
          {systems.map((s) => (
            <MapLabel key={s.id} bus={bus} id={`sys:${s.id}`} hidden={!overlays.labels && hovered !== s.id}>
              <span className="block pb-4">
                {/* Hidden from assistive tech: the systems index in the panel is the accessible route. */}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => onSelectSystem(s)}
                  className={labelButton}
                  style={{ borderColor: hovered === s.id ? colorOf.get(s.worldSlug) : undefined }}
                >
                  {s.name}
                </button>
              </span>
            </MapLabel>
          ))}
        </>
      )}
      {view === "system" &&
        planets.map((p) => (
          <MapLabel key={p.id} bus={bus} id={`planet:${p.id}`} hidden={!overlays.labels && hovered !== p.id}>
            <span className="block pb-1">
              <button type="button" tabIndex={-1} onClick={() => onSelectPlanet(p)} className={labelButton}>
                {p.name}
              </button>
            </span>
          </MapLabel>
        ))}
    </div>
  );
}
