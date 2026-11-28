"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { LayoutGrid, RotateCcw, Sparkles } from "lucide-react";
import { BaselineConcertApp } from "@/components/booking/BaselineConcertApp";
import { GenUIRenderer } from "@/components/booking/GenUIRenderer";
import { AdaptationProposalModal } from "@/components/adaptation/AdaptationProposalModal";
import { StudyLeftDock } from "@/components/study/StudyLeftDock";
import { GuidedTutorialOverlay } from "@/components/study/GuidedTutorialOverlay";
import { getTelemetryEngine } from "@/lib/telemetry/telemetryEngine";
import {
  isAdaptationRequestInFlight,
  requestAdaptation,
} from "@/lib/genui/adaptClient";
import { useAppStore } from "@/store/useAppStore";
import { useGuidedSessionStore } from "@/store/useGuidedSessionStore";
import { ensureCrowdHistorySeed } from "@/lib/study/sessionHistory";

export function BookingWorkspace() {
  const uiMode = useAppStore((s) => s.uiMode);
  const adaptedSpec = useAppStore((s) => s.adaptedSpec);
  const resetBooking = useAppStore((s) => s.resetBooking);
  const revertToBaseline = useAppStore((s) => s.revertToBaseline);
  const openAdaptationProposal = useAppStore((s) => s.openAdaptationProposal);
  const setTelemetryProfile = useAppStore((s) => s.setTelemetryProfile);
  const setLastAdaptedSpecJson = useAppStore((s) => s.setLastAdaptedSpecJson);
  const setAdaptationModeBadge = useAppStore((s) => s.setAdaptationModeBadge);
  const frictionAutoPrompted = useAppStore((s) => s.frictionAutoPrompted);
  const setFrictionAutoPrompted = useAppStore((s) => s.setFrictionAutoPrompted);
  const guidedPhase = useGuidedSessionStore((s) => s.phase);
  const guidedCompletedOnce = useGuidedSessionStore(
    (s) => s.guidedCompletedOnce,
  );
  const analyzeLocked =
    guidedPhase === "running" ||
    (guidedPhase === "idle" && !guidedCompletedOnce);

  const analyzingRef = useRef(false);

  useEffect(() => {
    ensureCrowdHistorySeed();
  }, []);

  const analyze = useCallback(async () => {
    if (analyzeLocked) return;
    if (analyzingRef.current || isAdaptationRequestInFlight()) return;
    analyzingRef.current = true;
    try {
      const profile = getTelemetryEngine().getProfile();
      setTelemetryProfile(profile);
      const result = await requestAdaptation(profile);
      setAdaptationModeBadge(result.mode);
      setLastAdaptedSpecJson(result.spec as unknown as Record<string, unknown>);
      openAdaptationProposal(result.spec);
    } catch {
      setAdaptationModeBadge("Deterministic Fallback");
    } finally {
      analyzingRef.current = false;
    }
  }, [
    analyzeLocked,
    openAdaptationProposal,
    setAdaptationModeBadge,
    setLastAdaptedSpecJson,
    setTelemetryProfile,
  ]);

  // Auto-trigger only after guided study unlocked free explore
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!guidedCompletedOnce || guidedPhase === "running") return;
      if (frictionAutoPrompted) return;
      if (isAdaptationRequestInFlight()) return;
      if (useAppStore.getState().adaptationProposalOpen) return;
      if (useAppStore.getState().uiMode === "adapted") return;
      const profile = getTelemetryEngine().getProfile();
      setTelemetryProfile(profile);
      if (profile.friction_threshold_crossed) {
        setFrictionAutoPrompted(true);
        void analyze();
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [
    analyze,
    frictionAutoPrompted,
    guidedCompletedOnce,
    guidedPhase,
    setFrictionAutoPrompted,
    setTelemetryProfile,
  ]);

  return (
    <div className="relative h-screen overflow-hidden bg-[var(--nl-surface)]">
      <header className="relative z-[100] flex h-[var(--nl-header-height)] shrink-0 items-center justify-between border-b border-[#534434]/35 bg-[var(--nl-surface)]/90 px-5 py-3 backdrop-blur-xl">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-wider text-[#ffc174]">
            Northlight{" "}
            <span className="font-normal tracking-tight text-[#dee3ea]">
              Concert Hall
            </span>
          </h1>
        </div>
        <div className="mr-28 flex items-center gap-2">
          <Link
            href="/gallery"
            data-hci-id="variant_gallery_link"
            data-hci-type="action"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#534434]/50 bg-[var(--nl-surface-container)] px-2.5 text-xs text-[#d8c3ad] hover:border-[#a08e7a]"
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Adaptation Catalog
          </Link>
          <button
            type="button"
            data-hci-id="analyze_telemetry_btn"
            data-hci-type="action"
            disabled={analyzeLocked}
            onClick={() => void analyze()}
            title={
              analyzeLocked
                ? "Complete the guided Start test first"
                : undefined
            }
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#f59e0b]/50 bg-[#f59e0b]/15 px-2.5 text-xs font-medium text-[#ffc174] hover:bg-[#f59e0b]/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Analyze Telemetry & Suggest Adaptation
          </button>
          <button
            type="button"
            data-hci-id="reset_booking_btn"
            data-hci-type="action"
            onClick={resetBooking}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#534434]/50 bg-[var(--nl-surface-container)] px-2.5 text-xs text-[#d8c3ad] hover:border-[#a08e7a]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </button>
        </div>
      </header>

      <div className="nl-study-row">
        <StudyLeftDock />
        <div className="nl-study-main relative">
          {uiMode === "adapted" && adaptedSpec ? (
            <>
              <div className="mb-1 flex shrink-0 justify-center">
                <button
                  type="button"
                  data-hci-id="revert_baseline_btn"
                  data-hci-type="action"
                  onClick={revertToBaseline}
                  className="rounded-lg border border-[#534434]/60 bg-[var(--nl-surface-container)]/90 px-3 py-1.5 font-mono text-[11px] text-[#d8c3ad] shadow backdrop-blur hover:border-[#ffc174]/50"
                >
                  Revert to Baseline
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <GenUIRenderer
                  key={`${adaptedSpec.detected_profile_archetype}-${adaptedSpec.layout_config.mode}-${adaptedSpec.nodes.map((n) => n.component).join("-")}`}
                  spec={adaptedSpec}
                />
              </div>
            </>
          ) : (
            <BaselineConcertApp embedInWorkspace />
          )}
          <GuidedTutorialOverlay />
        </div>
      </div>

      <AdaptationProposalModal />
    </div>
  );
}
