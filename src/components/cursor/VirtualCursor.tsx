"use client";

import { useEffect, useRef, useState } from "react";
import { OneEuroFilter2D } from "@/lib/tracking/oneEuroFilter";
import { applyPerturbation } from "@/lib/tracking/perturbations";
import {
  collectHciTargets,
  findNearestTarget,
  pointInRect,
  triggerHciClick,
} from "@/lib/tracking/hciTargets";
import { getTelemetryEngine } from "@/lib/telemetry/telemetryEngine";
import { useAppStore } from "@/store/useAppStore";
import { useGuidedSessionStore } from "@/store/useGuidedSessionStore";

const DWELL_COOLDOWN_MS = 600;
const CURSOR_RADIUS = 14;

type CursorVisual = {
  x: number;
  y: number;
  dwellProgress: number;
  snapping: boolean;
  hoveringId: string | null;
};

/** Modals that must own the mouse — freeze gaze dwell to avoid ghost clicks. */
function isDwellPaused(): boolean {
  const s = useAppStore.getState();
  const guided = useGuidedSessionStore.getState().phase;
  if (s.studyModalOpen) return true;
  if (s.researcherDrawerOpen) return true;
  if (guided === "results") return true;
  if (document.querySelector('[data-dwell-pause="true"]')) return true;
  return false;
}

export function VirtualCursor() {
  const interactionPolicy = useAppStore((s) => s.interactionPolicy);
  const mouseFallbackMode = useAppStore((s) => s.mouseFallbackMode);
  const perturbationMode = useAppStore((s) => s.perturbationMode);
  const setEffectivePointer = useAppStore((s) => s.setEffectivePointerPx);
  const setHoverTargetId = useAppStore((s) => s.setHoverTargetId);

  const [visual, setVisual] = useState<CursorVisual>({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
    dwellProgress: 0,
    snapping: false,
    hoveringId: null,
  });

  const filterRef = useRef<OneEuroFilter2D | null>(null);
  const mousePxRef = useRef({ x: 0, y: 0 });
  const dwellTargetRef = useRef<string | null>(null);
  const dwellStartRef = useRef<number | null>(null);
  const cooldownUntilRef = useRef(0);
  const policyRef = useRef(interactionPolicy);
  const mouseFallbackRef = useRef(mouseFallbackMode);
  const perturbationRef = useRef(perturbationMode);

  useEffect(() => {
    policyRef.current = interactionPolicy;
    mouseFallbackRef.current = mouseFallbackMode;
    perturbationRef.current = perturbationMode;
    filterRef.current?.setParams({
      minCutoff: interactionPolicy.one_euro_min_cutoff,
      beta: interactionPolicy.one_euro_beta,
    });
  }, [interactionPolicy, mouseFallbackMode, perturbationMode]);

  useEffect(() => {
    filterRef.current = new OneEuroFilter2D({
      minCutoff: interactionPolicy.one_euro_min_cutoff,
      beta: interactionPolicy.one_euro_beta,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once; params synced above
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mousePxRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let raf = 0;

    const frame = (nowMs: number) => {
      const policy = policyRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const tSec = nowMs / 1000;
      const useMouse = mouseFallbackRef.current;
      const mode = perturbationRef.current;
      const paused = isDwellPaused();

      let rawX: number;
      let rawY: number;

      if (useMouse) {
        rawX = mousePxRef.current.x || vw / 2;
        rawY = mousePxRef.current.y || vh / 2;
      } else {
        const raw = useAppStore.getState().rawPointerNorm;
        rawX = raw.x * vw;
        rawY = raw.y * vh;
      }

      const intentX = rawX;
      const intentY = rawY;
      const perturbed = applyPerturbation(
        { x: intentX, y: intentY },
        mode,
        tSec,
        { width: vw, height: vh },
      );

      const filter = filterRef.current;
      const smoothed = filter
        ? filter.filter(perturbed.x, perturbed.y, tSec)
        : perturbed;

      // Research/camera overlays: freeze dwell + do not sample motor telemetry.
      const proposalOpen = useAppStore.getState().adaptationProposalOpen;
      const root =
        proposalOpen
          ? document.querySelector<HTMLElement>('[data-adaptation-modal="true"]')
          : null;
      const targets = paused
        ? []
        : collectHciTargets({
            dwellableOnly: true,
            root: root ?? undefined,
          });
      const nearest = findNearestTarget(smoothed.x, smoothed.y, targets);

      let effX = smoothed.x;
      let effY = smoothed.y;
      let snapping = false;
      let hoveringId: string | null = null;
      let dwellProgress = 0;

      if (!paused && nearest) {
        const { target, distance } = nearest;
        const snapR = policy.magnetic_snap_radius_px;
        const inside = pointInRect(smoothed.x, smoothed.y, target.rect);

        if (distance <= snapR || inside) {
          const pull = inside
            ? 0.35
            : Math.max(0, 1 - distance / Math.max(1, snapR)) * 0.55;
          effX = smoothed.x + (target.centerX - smoothed.x) * pull;
          effY = smoothed.y + (target.centerY - smoothed.y) * pull;
          snapping = distance <= snapR || inside;
        }

        const hovering =
          pointInRect(effX, effY, target.rect) ||
          distance <= Math.max(2, snapR * 0.35);

        if (hovering && nowMs >= cooldownUntilRef.current) {
          hoveringId = target.id;
          if (dwellTargetRef.current !== target.id) {
            dwellTargetRef.current = target.id;
            dwellStartRef.current = nowMs;
          }
          const started = dwellStartRef.current ?? nowMs;
          const dwellMs =
            target.dwellMs != null && target.dwellMs > 0
              ? target.dwellMs
              : policy.dwell_time_ms;
          dwellProgress = Math.min(1, (nowMs - started) / dwellMs);

          if (dwellProgress >= 1) {
            triggerHciClick(target.element);
            getTelemetryEngine().recordDwellClick({
              t: nowMs,
              x: effX,
              y: effY,
              targetId: target.id,
              targetType: target.type,
            });
            cooldownUntilRef.current = nowMs + DWELL_COOLDOWN_MS;
            dwellTargetRef.current = null;
            dwellStartRef.current = null;
            dwellProgress = 0;
          }
        } else if (!hovering) {
          dwellTargetRef.current = null;
          dwellStartRef.current = null;
        }
      } else {
        dwellTargetRef.current = null;
        dwellStartRef.current = null;
      }

      if (!paused) {
        getTelemetryEngine().sample({
          t: nowMs,
          x: effX,
          y: effY,
          rawX: perturbed.x,
          rawY: perturbed.y,
          intentX,
          intentY,
          targetId: hoveringId,
          dwellProgress,
          viewportW: vw,
          viewportH: vh,
        });
      }

      setEffectivePointer({ x: effX, y: effY });
      setHoverTargetId(paused ? null : hoveringId);

      setVisual({
        x: effX,
        y: effY,
        dwellProgress,
        snapping,
        hoveringId,
      });

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [setEffectivePointer, setHoverTargetId]);

  const ringCircumference = 2 * Math.PI * CURSOR_RADIUS;
  const dashOffset = ringCircumference * (1 - visual.dwellProgress);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[150]"
      aria-hidden
    >
      {visual.snapping && (
        <div
          className="absolute rounded-full border border-amber-400/40 bg-amber-400/10"
          style={{
            width: 44,
            height: 44,
            left: visual.x - 22,
            top: visual.y - 22,
          }}
        />
      )}

      <svg
        width={CURSOR_RADIUS * 2 + 8}
        height={CURSOR_RADIUS * 2 + 8}
        className="absolute drop-shadow"
        style={{
          left: visual.x - CURSOR_RADIUS - 4,
          top: visual.y - CURSOR_RADIUS - 4,
        }}
      >
        <circle
          cx={CURSOR_RADIUS + 4}
          cy={CURSOR_RADIUS + 4}
          r={CURSOR_RADIUS}
          fill="rgba(15, 20, 25, 0.55)"
          stroke="rgba(245, 158, 11, 0.9)"
          strokeWidth={2}
        />
        <circle
          cx={CURSOR_RADIUS + 4}
          cy={CURSOR_RADIUS + 4}
          r={CURSOR_RADIUS}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={ringCircumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${CURSOR_RADIUS + 4} ${CURSOR_RADIUS + 4})`}
        />
        <circle
          cx={CURSOR_RADIUS + 4}
          cy={CURSOR_RADIUS + 4}
          r={3}
          fill="#f8fafc"
        />
      </svg>
    </div>
  );
}
