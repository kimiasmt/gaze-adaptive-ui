"use client";

import { GuidedTaskCoach } from "@/components/study/GuidedTaskCoach";
import { WebcamPreview } from "@/components/cursor/WebcamPreview";

/** Left column under the header: guided task above the head-tracking preview. */
export function StudyLeftDock() {
  return (
    <aside
      className="relative z-[90] flex h-full w-[var(--nl-study-dock-width)] shrink-0 flex-col gap-2 overflow-hidden"
      aria-label="Study controls"
    >
      {/* Gaze-dwellable coach (Start test) — not researcher-hud so dwell works */}
      <GuidedTaskCoach />
      <WebcamPreview />
    </aside>
  );
}
