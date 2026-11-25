"use client";

import { useEffect, useRef } from "react";
import {
  ClipboardList,
  MousePointer2,
  RotateCcw,
  Sparkles,
  Activity,
} from "lucide-react";
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
  loadSessionHistory,
  saveSessionToHistory,
} from "@/lib/study/sessionHistory";
import {
  GUIDED_MAX_ROUNDS,
  GUIDED_MIN_ROUNDS,
  isTelemetryStable,
  nextSeatTarget,
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
  const isConfirmed = useAppStore((s) => s.bookingState.isConfirmed);
  const resetBooking = useAppStore((s) => s.resetBooking);
  const setTicketCount = useAppStore((s) => s.setTicketCount);
  const setMouseFallbackMode = useAppStore((s) => s.setMouseFallbackMode);
  const setFrictionAutoPrompted = useAppStore((s) => s.setFrictionAutoPrompted);
  const setAdaptationModeBadge = useAppStore((s) => s.setAdaptationModeBadge);
  const setTelemetryProfile = useAppStore((s) => s.setTelemetryProfile);
  const setLastAdaptedSpecJson = useAppStore((s) => s.setLastAdaptedSpecJson);
  const participantId = useAppStore((s) => s.studyParticipantId);

  const completingRef = useRef(false);
  const selectArmedRef = useRef(true);

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
        setTicketCount(useGuidedSessionStore.getState().seatTarget);
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [
    phase,
    pushMetricSnap,
    setStabilityReason,
    enterFinalConfirm,
    setTicketCount,
  ]);

  // Select-seats step complete when seatTarget reached
  useEffect(() => {
    if (phase !== "running") return;
    if (stepKind !== "select_seats" && stepKind !== "final_confirm") return;
    if (!selectArmedRef.current) return;
    if (seats.length < seatTarget) return;

    if (stepKind === "select_seats") {
      selectArmedRef.current = false;
      setTicketCount(seatTarget);
      completeSelectRound();
      // re-arm after short delay so reset→select works
      window.setTimeout(() => {
        selectArmedRef.current = true;
      }, 400);
    }
  }, [
    phase,
    stepKind,
    seats.length,
    seatTarget,
    completeSelectRound,
    setTicketCount,
  ]);

  // Final confirm → Live LLM personal + crowd composer
  useEffect(() => {
    if (phase !== "running" || stepKind !== "final_confirm") return;
    if (!isConfirmed || completingRef.current) return;
    if (seats.length < seatTarget) return;
    completingRef.current = true;

    void (async () => {
      try {
        const profile = getTelemetryEngine().getProfile();
        setTelemetryProfile(profile);
        const scored = scoreSession(profile);
        const history = loadSessionHistory();

        const result = await requestAdaptation(profile);
        const personalSpec = result.spec;
        const crowdSpec = composeCrowdSpec(history.map((h) => h.telemetry));

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
    return (
      <div className="fixed bottom-4 left-1/2 z-[95] w-[min(540px,92vw)] -translate-x-1/2 rounded-xl border border-[#f59e0b]/40 bg-[var(--nl-surface-container)]/95 p-4 shadow-xl backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[#f59e0b]/15 p-2 text-[#ffc174]">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
              Guided HCI task
            </p>
            <h2 className="font-display text-sm font-semibold text-[#dee3ea]">
              Dynamic booking until metrics stabilize
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#d8c3ad]/90">
              You&apos;ll keep selecting seats / resetting ({GUIDED_MIN_ROUNDS}–
              {GUIDED_MAX_ROUNDS} rounds) until jitter &amp; overshoots settle.
              Then Confirm once — Live LLM proposes a personal GenUI; crowd
              layout uses prior measured sessions only.
            </p>
            <button
              type="button"
              data-hci-id="guided_task_start"
              data-hci-type="action"
              onClick={() => {
                resetBooking();
                resetTelemetryEngine();
                setTicketCount(nextSeatTarget(0));
                setMouseFallbackMode(false);
                setFrictionAutoPrompted(false);
                selectArmedRef.current = true;
                startGuidedTask();
              }}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#f59e0b]/50 bg-[#f59e0b]/20 px-3 py-2 text-xs font-medium text-[#ffc174] hover:bg-[#f59e0b]/30"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Start guided task (head-gaze)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title =
    stepKind === "reset"
      ? `${completedRounds} · Reset booking`
      : stepKind === "final_confirm"
        ? `Final · Select ${seatTarget} seats & Confirm`
        : `Round ${completedRounds + 1} · Select ${seatTarget} seats`;

  const hint =
    stepKind === "reset"
      ? "Clear the map (Reset) so we can run another booking pass and firm up telemetry."
      : stepKind === "final_confirm"
        ? "Metrics look stable enough for GenUI. Select the seats, then Confirm — mouse returns afterward."
        : `Dwell-select ${seatTarget} available seats on the dense baseline map.`;

  const latest = metricSnaps[metricSnaps.length - 1];

  return (
    <div className="fixed bottom-4 left-1/2 z-[95] w-[min(580px,94vw)] -translate-x-1/2 rounded-xl border border-[#00a572]/40 bg-[var(--nl-surface)]/96 p-4 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4edea3]">
          Guided task · dynamic ({completedRounds}/{GUIDED_MAX_ROUNDS} rounds)
        </p>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#a08e7a]">
          <MousePointer2 className="h-3 w-3" /> Head-gaze
        </span>
      </div>
      <h3 className="font-display text-sm font-semibold text-[#dee3ea]">
        {title}
      </h3>
      <p className="mt-1 text-xs text-[#d8c3ad]/90">{hint}</p>
      <div className="mt-2 flex items-start gap-2 rounded-lg border border-[#534434]/40 bg-[var(--nl-surface-low)] px-2.5 py-2">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ffc174]" />
        <div className="min-w-0">
          <p className="text-[11px] text-[#ffc174]/90">{stabilityReason}</p>
          {latest && (
            <p className="mt-0.5 font-mono text-[10px] text-[#a08e7a]">
              jitter {latest.jitter_px.toFixed(1)} · overshoots{" "}
              {latest.overshoot_count} · samples {latest.sample_count} · seats{" "}
              {seats.length}/{seatTarget}
            </p>
          )}
        </div>
      </div>
      {stepKind === "reset" && (
        <button
          type="button"
          data-hci-id="guided_task_reset"
          data-hci-type="action"
          onClick={() => {
            resetBooking();
            completeReset();
            setTicketCount(useGuidedSessionStore.getState().seatTarget);
            selectArmedRef.current = true;
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[#534434]/50 bg-[var(--nl-surface-container)] px-3 py-2 text-xs text-[#dee3ea] hover:border-[#a08e7a]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset now
        </button>
      )}
      {stepKind !== "final_confirm" &&
        completedRounds >= GUIDED_MIN_ROUNDS && (
          <button
            type="button"
            data-hci-id="guided_task_force_final"
            data-hci-type="action"
            onClick={() => {
              enterFinalConfirm();
              setTicketCount(useGuidedSessionStore.getState().seatTarget);
            }}
            className="mt-2 ml-0 font-mono text-[10px] text-[#a08e7a] underline hover:text-[#d8c3ad]"
          >
            Metrics feel ready — skip to final Confirm
          </button>
        )}
    </div>
  );
}
