"use client";

import { ArrowLeft } from "lucide-react";
import { useGuidedSessionStore } from "@/store/useGuidedSessionStore";

/**
 * Blocks booking / adapted UI until the guided task is started.
 * Head-gaze users must see Start test before interacting with the map.
 */
export function GuidedTutorialOverlay() {
  const phase = useGuidedSessionStore((s) => s.phase);
  const guidedCompletedOnce = useGuidedSessionStore(
    (s) => s.guidedCompletedOnce,
  );
  // Lock booking only before the first guided completion
  if (phase !== "idle" || guidedCompletedOnce) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-[#0f1419]/72 p-4 backdrop-blur-[2px]"
      role="note"
      aria-label="Start the guided test before booking"
    >
      <div className="max-w-sm rounded-xl border border-[#f59e0b]/50 bg-[var(--nl-surface-container)]/95 px-5 py-4 text-center shadow-xl">
        <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
          <ArrowLeft className="h-3.5 w-3.5 animate-pulse" aria-hidden />
          Tutorial
        </p>
        <p className="font-display mt-2 text-base font-semibold text-[#dee3ea]">
          Press <span className="text-[#ffc174]">Start test</span> on the left
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[#d8c3ad]/90">
          Booking stays locked until you begin the guided HCI task.
        </p>
      </div>
    </div>
  );
}
