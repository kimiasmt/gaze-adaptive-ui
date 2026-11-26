"use client";

import { useEffect, useRef } from "react";
import { ClipboardList, Activity } from "lucide-react";
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
      <div className="w-full shrink-0 rounded-xl border border-[#f59e0b]/40 bg-[var(--nl-surface-container)]/95 p-3 shadow-xl backdrop-blur">
        <div className="flex items-start gap-2.5">
          <div className="rounded-lg bg-[#f59e0b]/15 p-1.5 text-[#ffc174]">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
              Guided HCI task
            </p>
            <h2 className="font-display text-sm font-semibold text-[#dee3ea]">
              Press Start test to begin
            </h2>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-[#d8c3ad]/90">
              <li>
                Select / reset seats ({GUIDED_MIN_ROUNDS}–{GUIDED_MAX_ROUNDS}{" "}
                rounds) until metrics settle
              </li>
              <li>Confirm once for a personal GenUI</li>
              <li>Head-gaze until final Confirm</li>
            </ul>
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
              className="mt-3 w-full rounded-lg border border-[#f59e0b]/60 bg-[#f59e0b]/25 px-3 py-2 text-sm font-semibold text-[#ffc174] hover:bg-[#f59e0b]/40"
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

  const latest = metricSnaps[metricSnaps.length - 1];

  return (
    <div className="w-full shrink-0 rounded-xl border border-[#00a572]/40 bg-[var(--nl-surface)]/96 p-3 shadow-xl backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#4edea3]">
        {testLabel}
      </p>

      {stepKind === "select_seats" && (
        <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
          Select {seatTarget} seats
        </h3>
      )}

      {stepKind === "reset" && (
        <>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
            Test {completedRounds} done
          </h3>
          <p className="mt-1 text-xs text-[#d8c3ad]/90">
            Continue when you&apos;re ready for the next booking pass.
          </p>
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
            className="mt-3 w-full rounded-lg border border-[#00a572]/50 bg-[#00a572]/20 px-3 py-2 text-sm font-semibold text-[#4edea3] hover:bg-[#00a572]/30"
          >
            Run next test
          </button>
        </>
      )}

      {stepKind === "final_confirm" && (
        <>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-tight text-[#dee3ea]">
            Finish this pass
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-[#d8c3ad]/95">
            <li>Select {seatTarget} seats</li>
            <li>Press Confirm</li>
          </ul>
        </>
      )}

      {stepKind === "select_seats" && (
        <p className="mt-1 text-xs text-[#a08e7a]">
          {seats.length}/{seatTarget} selected · head-gaze
        </p>
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
              setTicketCount(useGuidedSessionStore.getState().seatTarget);
            }}
            className="mt-2 font-mono text-[10px] text-[#a08e7a] underline hover:text-[#d8c3ad]"
          >
            Metrics feel ready — skip to final Confirm
          </button>
        )}
    </div>
  );
}
