"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Crosshair,
  MousePointer2,
} from "lucide-react";
import {
  HeadTracker,
  openWebcamStream,
} from "@/lib/tracking/headTracker";
import { drawFaceMeshOverlay } from "@/lib/tracking/drawFaceMesh";
import {
  useAppStore,
  type PerturbationMode,
} from "@/store/useAppStore";

export function WebcamPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<HeadTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const mouseFallbackMode = useAppStore((s) => s.mouseFallbackMode);
  const setMouseFallbackMode = useAppStore((s) => s.setMouseFallbackMode);
  const perturbationMode = useAppStore((s) => s.perturbationMode);
  const setPerturbationMode = useAppStore((s) => s.setPerturbationMode);
  const setRawPointerNorm = useAppStore((s) => s.setRawPointerNorm);
  const setTrackingStatus = useAppStore((s) => s.setTrackingStatus);
  const trackingStatus = useAppStore((s) => s.trackingStatus);
  const sensitivity = useAppStore((s) => s.trackingSensitivity);

  const [collapsed, setCollapsed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paintMesh = useCallback(
    (landmarks: { x: number; y: number; z?: number }[]) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w <= 0 || h <= 0) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      drawFaceMeshOverlay(ctx, landmarks, w, h);
    },
    [],
  );

  const recenter = useCallback(() => {
    trackerRef.current?.recenter();
    setTrackingStatus({ calibrated: true });
  }, [setTrackingStatus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        recenter();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [recenter]);

  useEffect(() => {
    if (mouseFallbackMode) {
      trackerRef.current?.stop();
      setTrackingStatus({ active: false, faceDetected: false });
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setError(null);
      setTrackingStatus({ active: false, loading: true });
      try {
        const stream = await openWebcamStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tracker = new HeadTracker({
          video,
          sensitivityX: sensitivity.x,
          sensitivityY: sensitivity.y,
        });
        await tracker.initialize();
        if (cancelled) {
          tracker.dispose();
          return;
        }
        trackerRef.current = tracker;
        tracker.start((sample) => {
          setRawPointerNorm({ x: sample.x, y: sample.y });
          setTrackingStatus({
            active: true,
            loading: false,
            faceDetected: sample.faceDetected,
          });
          paintMesh(sample.landmarks);
        });
        setTrackingStatus({ active: true, loading: false });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Camera / MediaPipe failed";
        setError(
          `${message} Head-gaze needs a laptop webcam; mouse simulator stays available.`,
        );
        setTrackingStatus({ active: false, loading: false, faceDetected: false });
        setMouseFallbackMode(true);
      }
    };

    void start();

    return () => {
      cancelled = true;
      trackerRef.current?.dispose();
      trackerRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [
    mouseFallbackMode,
    sensitivity.x,
    sensitivity.y,
    paintMesh,
    setMouseFallbackMode,
    setRawPointerNorm,
    setTrackingStatus,
  ]);

  useEffect(() => {
    trackerRef.current?.setSensitivity(sensitivity.x, sensitivity.y);
  }, [sensitivity.x, sensitivity.y]);

  return (
    <div className="researcher-hud w-full shrink-0 select-none rounded-lg border border-slate-700/80 bg-[#12171d]/95 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-2.5 py-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
          <Camera className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          Head tracking
        </span>
        <button
          type="button"
          className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand webcam panel" : "Collapse webcam panel"}
          data-hci-id="webcam_panel_toggle"
          data-hci-type="action"
        >
          {collapsed ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Keep <video> mounted while collapsed so the tracker stays alive */}
      <div className={collapsed ? "hidden" : "space-y-2 p-2.5"}>
        <div className="relative aspect-video overflow-hidden rounded-md bg-black">
          <video
            ref={videoRef}
            className="h-full w-full -scale-x-100 object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full -scale-x-100 object-cover"
            aria-hidden
          />
          {!mouseFallbackMode && trackingStatus.loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] text-slate-300">
              Loading FaceLandmarker…
            </div>
          )}
          {mouseFallbackMode && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 text-[10px] text-slate-400">
              Mouse fallback active
            </div>
          )}
        </div>

        {!mouseFallbackMode && trackingStatus.faceDetected && (
          <p className="text-[9px] leading-snug text-[#a08e7a]">
            Face mesh overlay · amber oval / nose tip drives gaze pointer
          </p>
        )}

        {error && (
          <p className="text-[10px] leading-snug text-rose-400">{error}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            data-hci-id="recenter_btn"
            data-hci-type="action"
            onClick={recenter}
            disabled={mouseFallbackMode}
            className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded border border-slate-600 bg-slate-900 px-2 text-[11px] text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
          >
            <Crosshair className="h-3 w-3" aria-hidden />
            Recenter (Space)
          </button>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
          <input
            type="checkbox"
            data-hci-id="mouse_fallback_toggle"
            data-hci-type="toggle"
            checked={mouseFallbackMode}
            onChange={(e) => setMouseFallbackMode(e.target.checked)}
            className="rounded border-slate-600"
          />
          <MousePointer2 className="h-3 w-3 text-slate-500" aria-hidden />
          Mouse fallback mode
        </label>

        <label className="block text-[10px] uppercase tracking-wide text-slate-500">
          Synthetic perturbation
          <select
            data-hci-id="perturbation_select"
            data-hci-type="select"
            value={perturbationMode}
            onChange={(e) =>
              setPerturbationMode(e.target.value as PerturbationMode)
            }
            className="mt-1 h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-200"
          >
            <option value="none">None</option>
            <option value="high_jitter">Simulate High Jitter</option>
            <option value="restricted_rom">
              Simulate Restricted Neck ROM
            </option>
          </select>
        </label>

        <p className="text-[10px] leading-relaxed text-slate-500">
          Status:{" "}
          {mouseFallbackMode
            ? "Mouse"
            : trackingStatus.faceDetected
              ? "Face locked"
              : trackingStatus.active
                ? "Searching face…"
                : "Idle"}
          {trackingStatus.calibrated
            ? " · Calibrated"
            : " · Press Space to recenter"}
        </p>
      </div>
    </div>
  );
}
