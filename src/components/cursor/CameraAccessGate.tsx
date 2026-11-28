"use client";

import { useEffect, useState } from "react";
import { Camera, Laptop, MousePointer2, AlertTriangle } from "lucide-react";
import { openWebcamStream } from "@/lib/tracking/headTracker";
import { useAppStore } from "@/store/useAppStore";

const STORAGE_KEY = "gaze_camera_gate_v1";

type GateChoice = "undecided" | "camera" | "mouse";

function classifyMediaError(err: unknown): {
  title: string;
  detail: string;
} {
  const name =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: string }).name)
      : "";
  const message = err instanceof Error ? err.message : String(err);

  if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
    return {
      title: "Camera permission blocked",
      detail:
        "The browser blocked webcam access. For the real head-gaze study, allow the camera on a laptop (HTTPS / localhost), then retry. You can still explore the prototype with the mouse pointer simulator.",
    };
  }
  if (
    name === "NotFoundError" ||
    name === "DevicesNotFoundError" ||
    /not found|no device/i.test(message)
  ) {
    return {
      title: "No webcam detected",
      detail:
        "This device has no usable camera. Head-gaze needs a laptop webcam. Continue with the mouse simulator for a limited test, or open this site on a laptop with a camera.",
    };
  }
  if (name === "NotReadableError" || /in use|busy/i.test(message)) {
    return {
      title: "Camera is busy",
      detail:
        "Another app may be using the webcam. Close Zoom/Meet/etc., then retry — or use mouse fallback for now.",
    };
  }
  return {
    title: "Could not start camera",
    detail: `${message || "Unknown media error"}. Use a laptop with a webcam for the intended study, or continue with the mouse pointer simulator.`,
  };
}

export function CameraAccessGate() {
  const setMouseFallbackMode = useAppStore((s) => s.setMouseFallbackMode);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY) as GateChoice | null;
      if (saved === "camera" || saved === "mouse") {
        setMouseFallbackMode(saved !== "camera");
        setOpen(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setOpen(true);
  }, [setMouseFallbackMode]);

  const dismiss = (choice: Exclude<GateChoice, "undecided">) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const enableCamera = async () => {
    setBusy(true);
    setFailure(null);
    let stream: MediaStream | null = null;
    try {
      stream = await openWebcamStream();
      stream.getTracks().forEach((t) => t.stop());
      setMouseFallbackMode(false);
      dismiss("camera");
    } catch (err) {
      setFailure(classifyMediaError(err));
      setMouseFallbackMode(true);
    } finally {
      setBusy(false);
    }
  };

  const useMouse = () => {
    setMouseFallbackMode(true);
    dismiss("mouse");
  };

  if (!open) return null;

  return (
    <div
      className="researcher-hud fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      data-dwell-pause="true"
      aria-labelledby="camera-gate-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#534434]/50 bg-[var(--nl-surface-container)] p-5 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
          Setup · input mode
        </p>
        <h2
          id="camera-gate-title"
          className="font-display mt-1 text-lg font-semibold text-[#dee3ea]"
        >
          Webcam for head-gaze tracking
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#d8c3ad]">
          This prototype is designed for{" "}
          <strong className="text-[#dee3ea]">laptop webcam</strong> head
          tracking. Your browser will show a permission popup. If you don&apos;t
          have a camera (or deny access), you can still run a limited test with
          the on-screen mouse pointer simulator.
        </p>

        <ul className="mt-4 space-y-2 text-xs text-[#a08e7a]">
          <li className="flex gap-2">
            <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ffc174]" />
            <span className="font-semibold text-[#ffc174]">
              Webcam is used only for local head-gaze tracking in your browser.
              Frames stay on this device — nothing is uploaded, recorded, or
              sent to a server.
            </span>
          </li>
          <li className="flex gap-2">
            <Laptop className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4edea3]" />
            Camera stays local: FaceLandmarker runs on-device; we never store or
            stream your video.
          </li>
        </ul>

        {failure && (
          <div className="mt-4 flex gap-2 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
            <div>
              <p className="text-sm font-medium text-rose-200">
                {failure.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-rose-200/80">
                {failure.detail}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-hci-id="camera_gate_enable"
            data-hci-type="action"
            disabled={busy}
            onClick={() => void enableCamera()}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#f59e0b] font-display text-sm font-semibold text-[#613b00] enabled:hover:brightness-110 disabled:opacity-60"
          >
            <Camera className="h-4 w-4" />
            {busy ? "Requesting…" : "Enable webcam"}
          </button>
          <button
            type="button"
            data-hci-id="camera_gate_mouse"
            data-hci-type="action"
            disabled={busy}
            onClick={useMouse}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#534434]/60 bg-[var(--nl-surface-high)] font-display text-sm font-semibold text-[#dee3ea] hover:border-[#a08e7a]"
          >
            <MousePointer2 className="h-4 w-4" />
            {failure ? "Continue with mouse" : "Use mouse simulator"}
          </button>
        </div>
      </div>
    </div>
  );
}
