"use client";

import fixWebmDuration from "fix-webm-duration";
import { useEffect, useRef, useState } from "react";
import { useMediaLibrary } from "./MediaLibrary";

export type Narration = { id: string; url: string; durationSec: number | null };

/** Recordings stop on their own after an hour (about the 50 MB storage limit). */
const MAX_SECONDS = 60 * 60;

/** AAC in MP4 plays everywhere; otherwise Opus in WebM (Chrome, Firefox) or whatever the browser offers. */
const PREFERRED_TYPES = ["audio/mp4;codecs=mp4a.40.2", "audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"];

export const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type State =
  | { kind: "idle" }
  | { kind: "recording"; paused: boolean }
  | { kind: "review"; blob: Blob; url: string; seconds: number }
  | { kind: "uploading" };

/**
 * Record a narration with the microphone (or upload an audio file), listen
 * back, and attach it. Submits the recording's id as a hidden input; the
 * recording is stored as soon as a take is kept, and attached when the form is saved.
 */
export function NarrationField({ name, initial }: { name: string; initial?: Narration | null }) {
  const { worldId } = useMediaLibrary();
  const [narration, setNarration] = useState<Narration | null>(initial ?? null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [changed, setChanged] = useState(false);

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const clock = useRef({ startedAt: 0, banked: 0 });
  const teardown = useRef<() => void>(() => undefined);
  const fileInput = useRef<HTMLInputElement>(null);

  // Stop the microphone and timers if the page goes away mid-take.
  useEffect(() => () => teardown.current(), []);
  useEffect(() => () => {
    if (state.kind === "review") URL.revokeObjectURL(state.url);
  }, [state]);

  const seconds = () => clock.current.banked + (clock.current.startedAt ? (performance.now() - clock.current.startedAt) / 1000 : 0);

  async function start() {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't record audio here. Use a current Chrome, Firefox or Safari over https, or upload a file instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      setError("Microphone access was refused. Allow it in the browser's site settings, then try again.");
      return;
    }
    const mimeType = PREFERRED_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 64_000 });
    chunks.current = [];
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = async () => {
      teardown.current();
      const total = seconds();
      clock.current = { startedAt: 0, banked: 0 };
      let blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      // Chrome's WebM recordings carry no duration, so players can't seek them; write it in.
      if (blob.type.includes("webm")) blob = await fixWebmDuration(blob, total * 1000, { logger: false });
      setState({ kind: "review", blob, url: URL.createObjectURL(blob), seconds: Math.round(total) });
    };

    // A simple input meter, so it's obvious the microphone is live.
    const audio = new AudioContext();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 512;
    audio.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(samples);
      let peak = 0;
      for (const v of samples) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(peak / 128);
      const now = seconds();
      setElapsed(now);
      if (now >= MAX_SECONDS && rec.state === "recording") rec.stop();
      frame = requestAnimationFrame(tick);
    };
    teardown.current = () => {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((t) => t.stop());
      audio.close().catch(() => undefined);
      setLevel(0);
    };

    recorder.current = rec;
    clock.current = { startedAt: performance.now(), banked: 0 };
    rec.start(1000);
    tick();
    setElapsed(0);
    setState({ kind: "recording", paused: false });
  }

  function togglePause() {
    const rec = recorder.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      clock.current = { startedAt: 0, banked: seconds() };
      setState({ kind: "recording", paused: true });
    } else if (rec.state === "paused") {
      rec.resume();
      clock.current.startedAt = performance.now();
      setState({ kind: "recording", paused: false });
    }
  }

  async function upload(file: Blob, durationSec: number | null, filename: string) {
    setError(null);
    setState({ kind: "uploading" });
    try {
      const body = new FormData();
      body.set("file", file, filename);
      body.set("worldId", worldId);
      if (durationSec) body.set("durationSec", String(durationSec));
      const res = await fetch("/api/admin/recordings", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
      setNarration(json.recording);
      setChanged(true);
      setState({ kind: "idle" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setState({ kind: "idle" });
    }
  }

  async function uploadFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    // Measure the file's length the same way a listener's player will.
    const duration = await new Promise<number | null>((resolve) => {
      const probe = new Audio();
      const url = URL.createObjectURL(file);
      const done = (v: number | null) => {
        URL.revokeObjectURL(url);
        resolve(v);
      };
      probe.preload = "metadata";
      probe.onloadedmetadata = () => done(Number.isFinite(probe.duration) ? Math.round(probe.duration) : null);
      probe.onerror = () => done(null);
      probe.src = url;
    });
    await upload(file, duration, file.name);
  }

  const ext = (type: string) => (type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm");

  return (
    <div className="space-y-3 border border-line bg-black/30 p-3">
      <input type="hidden" name={name} value={narration?.id ?? ""} />

      {state.kind === "idle" && narration && (
        <div className="space-y-2">
          <audio controls preload="metadata" src={narration.url} className="w-full" />
          <p className="text-xs text-ash">
            {narration.durationSec ? `${formatDuration(narration.durationSec)} · ` : ""}
            {changed ? "New narration. Save to keep it." : "Current narration."}
          </p>
        </div>
      )}
      {state.kind === "idle" && !narration && <p className="text-sm text-ash">No narration. Record one, or upload an audio file.</p>}

      {state.kind === "recording" && (
        <div className="flex flex-wrap items-center gap-3" role="status" aria-live="polite">
          <span className={`inline-block h-3 w-3 rounded-full ${state.paused ? "bg-ash" : "animate-pulse bg-blood-bright"}`} aria-hidden />
          <span className="font-mono text-lg text-parchment">{formatDuration(elapsed)}</span>
          <span className="text-xs uppercase tracking-widest text-ash">{state.paused ? "Paused" : "Recording"}</span>
          <span className="h-2 w-32 overflow-hidden border border-line" aria-hidden>
            <span className="block h-full bg-gold transition-[width] duration-75" style={{ width: `${Math.min(100, level * 180)}%` }} />
          </span>
        </div>
      )}

      {state.kind === "review" && (
        <div className="space-y-2">
          <audio controls src={state.url} className="w-full" />
          <p className="text-xs text-ash">Take of {formatDuration(state.seconds)}. Listen back, then keep it or try again.</p>
        </div>
      )}

      {state.kind === "uploading" && <p className="text-sm text-ash" role="status">Storing the recording…</p>}

      <div className="flex flex-wrap gap-2">
        {state.kind === "idle" && (
          <>
            <button type="button" className="btn btn-ghost" onClick={start}>
              ● {narration ? "Record a new narration" : "Record"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => fileInput.current?.click()}>
              Upload audio file
            </button>
            {narration && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setNarration(null);
                  setChanged(true);
                }}
              >
                Remove narration
              </button>
            )}
          </>
        )}
        {state.kind === "recording" && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => recorder.current?.stop()}>
              ■ Stop
            </button>
            <button type="button" className="btn btn-ghost" onClick={togglePause}>
              {state.paused ? "Resume" : "Pause"}
            </button>
          </>
        )}
        {state.kind === "review" && (
          <>
            <button type="button" className="btn btn-primary" onClick={() => upload(state.blob, state.seconds, `narration.${ext(state.blob.type)}`)}>
              Keep this take
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setState({ kind: "idle" })}>
              Discard
            </button>
          </>
        )}
      </div>
      <input ref={fileInput} type="file" accept="audio/*" hidden onChange={(e) => uploadFile(e.target.files?.[0])} />
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {changed && state.kind === "idle" && !narration && <p className="text-xs text-ash">Narration removed. Save to confirm.</p>}
    </div>
  );
}
