"use client";

import { useEffect, useRef } from "react";
import { ClipboardList, Activity, ArrowRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useGuidedSessionStore } from "@/store/useGuidedSessionStore";
import {
  getTelemetryEngine,
  resetTelemetryEngine,
} from "@/lib/telemetry/telemetryEngine";
import { composeCrowdSpec } from "@/lib/genui/composeSpec";
import { requestAdaptation } from "@/lib/genui/adaptClient";
import { scoreSession } from "@/lib/telemetry/sessionScore";
import {
  ensureCrowdHistorySeed,
  loadSessionHistory,
  saveSessionToHistory,
} from "@/lib/study/sessionHistory";
import {
  GUIDED_MAX_ROUNDS,
  GUIDED_MIN_ROUNDS,
  isTelemetryStable,
  snapshotMetrics,
} from "@/lib/telemetry/metricStability";

export function GuidedTaskCoach() {
  const phase = useGuidedSessionStore((s) => s.phase);
  const stepKind = useGuidedSessionStore((s) => s.stepKind);
  const completedRounds = useGuidedSessionStore((s) => s.completedRounds);
  const seatTarget = useGuidedSessionStore((s) => s.seatTarget);
  const stabilityReason = useGuidedSessionStore((s) => s.stabilityReason);
  const metricSnaps = useGuidedSessionStore((s) => s.metricSnaps);
  const startGuidedTask = useGuidedSessionStore((s) => s.startGuidedTask);
  const completeSelectRound = useGuidedSessionStore((s) => s.completeSelectRound);
  const completeReset = useGuidedSessionStore((s) => s.completeReset);
  const enterFinalConfirm = useGuidedSessionStore((s) => s.enterFinalConfirm);
  const pushMetricSnap = useGuidedSessionStore((s) => s.pushMetricSnap);
  const setStabilityReason = useGuidedSessionStore((s) => s.setStabilityReason);
  const completeWithProposal = useGuidedSessionStore(
    (s) => s.completeWithProposal,
  );

  const seats = useAppStore((s) => s.bookingState.selectedSeats);
  const ticketCount = useAppStore((s) => s.bookingState.ticketCount);
  const isConfirmed = useAppStore((s) => s.bookingState.isConfirmed);
  const resetBooking = useAppStore((s) => s.resetBooking);
  const revertToBaseline = useAppStore((s) => s.revertToBaseline);
  const setMouseFallbackMode = useAppStore((s) => s.setMouseFallbackMode);
  const setFrictionAutoPrompted = useAppStore((s) => s.setFrictionAutoPrompted);
  const setAdaptationModeBadge = useAppStore((s) => s.setAdaptationModeBadge);
  const setTelemetryProfile = useAppStore((s) => s.setTelemetryProfile);
  const setLastAdaptedSpecJson = useAppStore((s) => s.setLastAdaptedSpecJson);
  const participantId = useAppStore((s) => s.studyParticipantId);
  const uiMode = useAppStore((s) => s.uiMode);
  const guidedCompletedOnce = useGuidedSessionStore(
    (s) => s.guidedCompletedOnce,
  );

  const completingRef = useRef(false);
  const selectArmedRef = useRef(true);

  const beginGuidedFromBaseline = () => {
    revertToBaseline();
    resetBooking();
    resetTelemetryEngine();
    setMouseFallbackMode(false);
    setFrictionAutoPrompted(false);
    selectArmedRef.current = true;
    startGuidedTask();
  };

  useEffect(() => {
    ensureCrowdHistorySeed();
  }, []);

  // Poll metrics for stability while running
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => {
      const profile = getTelemetryEngine().getProfile();
      pushMetricSnap(snapshotMetrics(profile));
      const snaps = useGuidedSessionStore.getState().metricSnaps;
      const rounds = useGuidedSessionStore.getState().completedRounds;
      const kind = useGuidedSessionStore.getState().stepKind;
      const { stable, reason } = isTelemetryStable(profile, snaps, rounds);
      setStabilityReason(reason);

      if (
        stable &&
        kind !== "final_confirm" &&
        kind !== "reset" &&
        rounds >= GUIDED_MIN_ROUNDS
      ) {
        enterFinalConfirm();
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, pushMetricSnap, setStabilityReason, enterFinalConfirm]);

  // Select-seats step: user must pick seats AND ticket count (no auto-fill)
  useEffect(() => {
    if (phase !== "running") return;
    if (stepKind !== "select_seats") return;
    if (!selectArmedRef.current) return;
    if (seats.length !== seatTarget) return;
    if (ticketCount !== seatTarget) return;

    selectArmedRef.current = false;
    completeSelectRound();
    window.setTimeout(() => {
      selectArmedRef.current = true;
    }, 400);
  }, [
    phase,
    stepKind,
    seats.length,
    ticketCount,
    seatTarget,
    completeSelectRound,
  ]);

  // Final confirm → Live LLM personal + crowd composer
  useEffect(() => {
    if (phase !== "running" || stepKind !== "final_confirm") return;
    if (!isConfirmed || completingRef.current) return;
    if (seats.length < seatTarget) return;
    if (ticketCount !== seats.length) return;
    completingRef.current = true;

    void (async () => {
      try {
        ensureCrowdHistorySeed();
        const profile = getTelemetryEngine().getProfile();
        setTelemetryProfile(profile);
        const scored = scoreSession(profile);
        const history = loadSessionHistory();
        // Crowd from prior sessions only (includes seeds; excludes this run)
        const crowdSpec = composeCrowdSpec(history.map((h) => h.telemetry));

        const result = await requestAdaptation(profile);
        const personalSpec = result.spec;

        saveSessionToHistory({
          telemetry: profile,
          personal_spec: personalSpec,
          participant_id: participantId || "P_local",
        });

        setMouseFallbackMode(true);
        setFrictionAutoPrompted(true);
        setAdaptationModeBadge(result.mode);
        setLastAdaptedSpecJson(
          personalSpec as unknown as Record<string, unknown>,
        );

        completeWithProposal({
          personalSpec,
          crowdSpec,
          sessionTelemetry: profile,
          sessionMetrics: scored.metrics,
          sessionScore: scored.score_100,
          historyCount: history.length + 1,
          adaptationMode: result.mode,
        });
      } finally {
        completingRef.current = false;
      }
    })();
  }, [
    phase,
    stepKind,
    isConfirmed,
    seats.length,
    ticketCount,
    seatTarget,
    completeWithProposal,
    participantId,
    setMouseFallbackMode,
    setFrictionAutoPrompted,
    setAdaptationModeBadge,
    setTelemetryProfile,
    setLastAdaptedSpecJson,
  ]);

  if (phase === "results") return null;

  if (phase === "idle") {
    // After Apply: stay on adapted UI — do not offer Start (that would yank to baseline)
    if (guidedCompletedOnce && uiMode === "adapted") {
      return (
        <div className="w-full shrink-0 rounded-xl border border-[#00a572]/40 bg-[var(--nl-surface)]/96 p-3 shadow-xl backdrop-blur">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4edea3]">
            Guided task complete
          </p>
          <h2 className="font-display mt-1 text-sm font-semibold text-[#dee3ea]">
            Adapted UI is active
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#d8c3ad]/95">
            Explore your custom layout here. Use{" "}
            <span className="text-[#dee3ea]">Revert to Baseline</span> above if
            you want the original booking map.
          </p>
        </div>
      );
    }

    // Completed once, back on baseline — optional quiet retake
    if (guidedCompletedOnce) {
      return (
        <div className="w-full shrink-0 rounded-xl border border-[#534434]/40 bg-[var(--nl-surface-container)]/95 p-3 shadow-xl backdrop-blur">
          <div className="flex items-start gap-2.5">
            <div className="rounded-lg bg-[#00a572]/15 p-1.5 text-[#4edea3]">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4edea3]">
                Guided task complete
              </p>
              <h2 className="font-display text-sm font-semibold text-[#dee3ea]">
                Study finished
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#d8c3ad]/95">
                You can explore freely, or retake the guided task from the
                baseline map.
              </p>
              <button
                type="button"
                data-hci-id="guided_task_retake"
                data-hci-type="action"
                onClick={beginGuidedFromBaseline}
                className="mt-3 w-full rounded-lg border border-[#534434]/50 bg-[var(--nl-surface-high)] px-3 py-2 text-sm font-semibold text-[#dee3ea] hover:border-[#a08e7a]"
              >
                Retake guided test
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full shrink-0 rounded-xl border-2 border-[#f59e0b]/60 bg-[var(--nl-surface-container)]/95 p-3 shadow-xl backdrop-blur ring-2 ring-[#f59e0b]/25">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-[#f59e0b]/15 p-1.5 text-[#ffc174]">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
              Tutorial · Guided HCI task
            </p>
            <h2 className="font-display text-sm font-semibold text-[#dee3ea]">
              Start here first
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-[#d8c3ad]/95">
              <li>
                Select seats + ticket count ({GUIDED_MIN_ROUNDS}–
                {GUIDED_MAX_ROUNDS} rounds)
              </li>
              <li>Confirm once for a personal GenUI</li>
              <li>Booking stays locked until you press Start</li>
            </ul>
            <button
              type="button"
              data-hci-id="guided_task_start"
              data-hci-type="action"
              onClick={beginGuidedFromBaseline}
              className="mt-3 w-full animate-pulse rounded-lg border border-[#f59e0b]/70 bg-[#f59e0b] px-3 py-2.5 text-sm font-semibold text-[#613b00] hover:brightness-110"
              style={{ minHeight: 52 }}
            >
              Start test
            </button>
          </div>
        </div>
      </div>
    );
  }

  const testNumber =
    stepKind === "reset" ? completedRounds : completedRounds + 1;
  const testLabel =
    stepKind === "final_confirm" ? "Final test" : `Test ${testNumber}`;
  const nextTestNumber = completedRounds + 1;

  const latest = metricSnaps[metricSnaps.length - 1];
  const seatsOk = seats.length === seatTarget;
  const ticketsOk = ticketCount === seatTarget;

  return (
    <div className="w-full shrink-0 rounded-xl border border-[#00a572]/40 bg-[var(--nl-surface)]/96 p-3 shadow-xl backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4edea3]">
        {testLabel}
      </p>

      {stepKind === "select_seats" && (
        <>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
            {ticketsOk
              ? `Select ${seatTarget} seats`
              : `Set ticket count to ${seatTarget}`}
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-[#d8c3ad]/95">
            <li className={ticketsOk ? undefined : "font-bold text-[#ffc174]"}>
              Set Ticket count to {seatTarget}
            </li>
            <li>
              Select {seatTarget} seats on the map
              {!ticketsOk ? " (locked until ticket count is set)" : ""}
            </li>
          </ul>
          <p className="mt-1 text-xs text-[#a08e7a]">
            Tickets {ticketCount}/{seatTarget}
            {ticketsOk ? " ✓" : ""} · Seats {seats.length}/{seatTarget}
            {seatsOk ? " ✓" : ""}
          </p>
        </>
      )}

      {stepKind === "reset" && (
        <>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
            Test {completedRounds} complete
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#d8c3ad]/95">
            Ready for the next booking pass when you are.
          </p>
          <button
            type="button"
            data-hci-id="guided_task_reset"
            data-hci-type="action"
            onClick={() => {
              resetBooking();
              completeReset();
              selectArmedRef.current = true;
            }}
            className="mt-3 flex w-full animate-pulse items-center justify-center gap-2 rounded-lg border border-[#00a572]/60 bg-[#00a572] px-3 py-3 text-sm font-semibold text-[#0f1419] hover:brightness-110"
          >
            Start test {nextTestNumber}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </>
      )}

      {stepKind === "final_confirm" && (
        <>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
            Finish this pass
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-[#d8c3ad]/95">
            <li className="font-bold text-[#ffc174]">
              Set Ticket count to {seatTarget}
            </li>
            <li>Select {seatTarget} seats on the map</li>
            <li>Press Confirm</li>
          </ul>
          <p className="mt-1 text-xs text-[#a08e7a]">
            Tickets {ticketCount}/{seatTarget} · Seats {seats.length}/
            {seatTarget}
          </p>
        </>
      )}

      <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#534434]/40 bg-[var(--nl-surface-low)] px-2 py-1.5">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ffc174]" />
        <div className="min-w-0">
          <p className="text-[11px] leading-snug text-[#ffc174]/90">
            {stabilityReason}
          </p>
          {latest && (
            <p className="mt-0.5 font-mono text-[10px] text-[#a08e7a]">
              jitter {latest.jitter_px.toFixed(1)} · overshoots{" "}
              {latest.overshoot_count}
            </p>
          )}
        </div>
      </div>

      {stepKind !== "final_confirm" &&
        completedRounds >= GUIDED_MIN_ROUNDS && (
          <button
            type="button"
            data-hci-id="guided_task_force_final"
            data-hci-type="action"
            onClick={() => {
              enterFinalConfirm();
            }}
            className="mt-2 font-mono text-[10px] text-[#a08e7a] underline hover:text-[#d8c3ad]"
          >
            Metrics feel ready — skip to final Confirm
          </button>
        )}
    </div>
  );
}
