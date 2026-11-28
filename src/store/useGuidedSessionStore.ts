"use client";

import { create } from "zustand";
import type { AdaptedUISpec } from "@/lib/genui/schema";
import type { TelemetryProfile } from "@/lib/telemetry/types";
import type { MetricSnapshot } from "@/lib/telemetry/sessionScore";
import type { MetricSnap } from "@/lib/telemetry/metricStability";
import type { AdaptationModeBadge } from "@/store/useAppStore";
import {
  GUIDED_MAX_ROUNDS,
  GUIDED_MIN_ROUNDS,
  nextSeatTarget,
} from "@/lib/telemetry/metricStability";

export type GuidedPhase = "idle" | "running" | "results";

export type GuidedStepKind = "select_seats" | "reset" | "final_confirm";

/** Measured guided-session outcomes + proposed specs (no estimated deltas). */
export type ProposalBundle = {
  personalSpec: AdaptedUISpec;
  crowdSpec: AdaptedUISpec;
  sessionTelemetry: TelemetryProfile;
  sessionMetrics: MetricSnapshot;
  sessionScore: number;
  historyCount: number;
  adaptationMode: AdaptationModeBadge;
};

type GuidedStore = {
  phase: GuidedPhase;
  stepKind: GuidedStepKind;
  /** Completed select→reset (or select) cycles before final confirm. */
  completedRounds: number;
  seatTarget: number;
  stabilityReason: string;
  metricSnaps: MetricSnap[];
  proposal: ProposalBundle | null;
  /** After first guided finish, unlock free explore / Analyze. */
  guidedCompletedOnce: boolean;
  startGuidedTask: () => void;
  pushMetricSnap: (snap: MetricSnap) => void;
  setStabilityReason: (reason: string) => void;
  completeSelectRound: () => void;
  completeReset: () => void;
  enterFinalConfirm: () => void;
  completeWithProposal: (bundle: ProposalBundle) => void;
  dismissResults: (opts?: { clearProposal?: boolean }) => void;
};

export const useGuidedSessionStore = create<GuidedStore>((set, get) => ({
  phase: "idle",
  stepKind: "select_seats",
  completedRounds: 0,
  seatTarget: nextSeatTarget(0),
  stabilityReason: "Waiting to start",
  metricSnaps: [],
  proposal: null,
  guidedCompletedOnce: false,

  startGuidedTask: () =>
    set({
      phase: "running",
      stepKind: "select_seats",
      completedRounds: 0,
      seatTarget: nextSeatTarget(0),
      stabilityReason: `Need ≥${GUIDED_MIN_ROUNDS} rounds + stable metrics (max ${GUIDED_MAX_ROUNDS})`,
      metricSnaps: [],
      proposal: null,
    }),

  pushMetricSnap: (snap) =>
    set((s) => ({
      metricSnaps: [...s.metricSnaps, snap].slice(-12),
    })),

  setStabilityReason: (reason) => set({ stabilityReason: reason }),

  completeSelectRound: () => {
    const { completedRounds } = get();
    // After a select, ask for reset before next round (builds more telemetry).
    set({
      stepKind: "reset",
      completedRounds: completedRounds + 1,
    });
  },

  completeReset: () => {
    const { completedRounds } = get();
    set({
      stepKind: "select_seats",
      seatTarget: nextSeatTarget(completedRounds),
    });
  },

  enterFinalConfirm: () =>
    set({
      stepKind: "final_confirm",
      seatTarget: nextSeatTarget(get().completedRounds),
      stabilityReason: "Metrics ready — select seats and Confirm",
    }),

  completeWithProposal: (bundle) =>
    set({
      phase: "results",
      proposal: bundle,
      guidedCompletedOnce: true,
    }),

  dismissResults: (opts) =>
    set((state) => ({
      phase: "idle",
      stepKind: "select_seats",
      completedRounds: 0,
      seatTarget: nextSeatTarget(0),
      stabilityReason: "Waiting to start",
      metricSnaps: [],
      proposal: opts?.clearProposal ? null : state.proposal,
      guidedCompletedOnce: state.guidedCompletedOnce,
    })),
}));
