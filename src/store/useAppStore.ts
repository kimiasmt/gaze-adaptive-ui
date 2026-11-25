"use client";

import { create } from "zustand";
import type { TelemetryProfile } from "@/lib/telemetry/types";
import { EMPTY_TELEMETRY_PROFILE } from "@/lib/telemetry/types";
import type { AdaptedUISpec } from "@/lib/genui/schema";
import {
  DEFAULT_INTERACTION_POLICY,
  type InteractionPolicy,
} from "@/store/interactionPolicy";
import type {
  ConditionOrder,
  StudyCondition,
  StudyTrial,
} from "@/lib/study/types";
import { getTelemetryEngine } from "@/lib/telemetry/telemetryEngine";
import { composeSpecFromTelemetry } from "@/lib/genui/composeSpec";

export type ZoneId = "vip" | "floor" | "balcony";

export type AdaptationModeBadge = "Live LLM" | "Deterministic Fallback";

export type BookingState = {
  selectedZone: ZoneId | null;
  selectedSeats: string[];
  ticketCount: number;
  isConfirmed: boolean;
};

export type UiMode = "baseline" | "adapted";

export type PerturbationMode = "none" | "high_jitter" | "restricted_rom";

export type TrackingStatus = {
  active: boolean;
  loading: boolean;
  faceDetected: boolean;
  calibrated: boolean;
};

export type { InteractionPolicy };
export { DEFAULT_INTERACTION_POLICY };

export type AppStore = {
  bookingState: BookingState;
  interactionPolicy: InteractionPolicy;
  uiMode: UiMode;
  mouseFallbackMode: boolean;
  perturbationMode: PerturbationMode;
  trackingSensitivity: { x: number; y: number };
  trackingStatus: TrackingStatus;
  rawPointerNorm: { x: number; y: number };
  effectivePointerPx: { x: number; y: number };
  hoverTargetId: string | null;
  researcherDrawerOpen: boolean;
  telemetryProfile: TelemetryProfile;
  lastAdaptedSpecJson: Record<string, unknown> | null;
  adaptationModeBadge: AdaptationModeBadge;
  adaptedSpec: AdaptedUISpec | null;
  pendingAdaptedSpec: AdaptedUISpec | null;
  adaptationProposalOpen: boolean;
  frictionAutoPrompted: boolean;
  /** Pilot study */
  studyModalOpen: boolean;
  studyActive: boolean;
  studyParticipantId: string;
  studyConditionOrder: ConditionOrder;
  studyCurrentCondition: StudyCondition;
  studyTrialStartedAtMs: number | null;
  studyQuestionnaireOpen: boolean;
  studyTrials: StudyTrial[];
  setTicketCount: (count: number) => void;
  toggleSeat: (seatId: string, zone: ZoneId) => void;
  clearSeats: () => void;
  confirmBooking: () => void;
  resetBooking: () => void;
  setUiMode: (mode: UiMode) => void;
  setInteractionPolicy: (policy: Partial<InteractionPolicy>) => void;
  setMouseFallbackMode: (enabled: boolean) => void;
  setPerturbationMode: (mode: PerturbationMode) => void;
  setTrackingSensitivity: (s: Partial<{ x: number; y: number }>) => void;
  setTrackingStatus: (s: Partial<TrackingStatus>) => void;
  setRawPointerNorm: (p: { x: number; y: number }) => void;
  setEffectivePointerPx: (p: { x: number; y: number }) => void;
  setHoverTargetId: (id: string | null) => void;
  setResearcherDrawerOpen: (open: boolean) => void;
  setTelemetryProfile: (profile: TelemetryProfile) => void;
  setLastAdaptedSpecJson: (spec: Record<string, unknown> | null) => void;
  setAdaptationModeBadge: (badge: AdaptationModeBadge) => void;
  openAdaptationProposal: (spec: AdaptedUISpec) => void;
  applyPendingAdaptation: () => void;
  rejectPendingAdaptation: () => void;
  revertToBaseline: () => void;
  setFrictionAutoPrompted: (v: boolean) => void;
  setStudyModalOpen: (open: boolean) => void;
  setStudyParticipantId: (id: string) => void;
  setStudyConditionOrder: (order: ConditionOrder) => void;
  startStudyTrial: (condition?: StudyCondition) => void;
  stopStudySession: () => void;
  openStudyQuestionnaire: () => void;
  closeStudyQuestionnaire: () => void;
  submitStudyQuestionnaire: (
    trial: Omit<StudyTrial, "completed_at_iso"> & { completed_at_iso?: string },
  ) => void;
  advanceStudyCondition: () => void;
};

export const initialBookingState: BookingState = {
  selectedZone: null,
  selectedSeats: [],
  ticketCount: 1,
  isConfirmed: false,
};

const initialTrackingStatus: TrackingStatus = {
  active: false,
  loading: false,
  faceDetected: false,
  calibrated: false,
};

export const useAppStore = create<AppStore>((set, get) => ({
  bookingState: { ...initialBookingState },
  interactionPolicy: { ...DEFAULT_INTERACTION_POLICY },
  uiMode: "baseline",
  mouseFallbackMode: true,
  perturbationMode: "none",
  trackingSensitivity: { x: 2.4, y: 2.4 },
  trackingStatus: { ...initialTrackingStatus },
  rawPointerNorm: { x: 0.5, y: 0.5 },
  effectivePointerPx: { x: 0, y: 0 },
  hoverTargetId: null,
  researcherDrawerOpen: false,
  telemetryProfile: { ...EMPTY_TELEMETRY_PROFILE },
  lastAdaptedSpecJson: null,
  adaptationModeBadge: "Deterministic Fallback",
  adaptedSpec: null,
  pendingAdaptedSpec: null,
  adaptationProposalOpen: false,
  frictionAutoPrompted: false,
  studyModalOpen: false,
  studyActive: false,
  studyParticipantId: "P01",
  studyConditionOrder: "baseline_first",
  studyCurrentCondition: "baseline",
  studyTrialStartedAtMs: null,
  studyQuestionnaireOpen: false,
  studyTrials: [],

  setTicketCount: (count) =>
    set((state) => {
      const ticketCount = Math.min(4, Math.max(1, count));
      return {
        bookingState: {
          ...state.bookingState,
          ticketCount,
          selectedSeats: state.bookingState.selectedSeats.slice(0, ticketCount),
          isConfirmed: false,
        },
      };
    }),

  toggleSeat: (seatId, zone) => {
    const { bookingState } = get();
    const alreadySelected = bookingState.selectedSeats.includes(seatId);

    if (alreadySelected) {
      const nextSeats = bookingState.selectedSeats.filter((id) => id !== seatId);
      set({
        bookingState: {
          ...bookingState,
          selectedSeats: nextSeats,
          selectedZone: nextSeats.length === 0 ? null : bookingState.selectedZone,
          isConfirmed: false,
        },
      });
      return;
    }

    if (bookingState.selectedSeats.length >= bookingState.ticketCount) {
      return;
    }

    if (
      bookingState.selectedZone !== null &&
      bookingState.selectedZone !== zone
    ) {
      set({
        bookingState: {
          ...bookingState,
          selectedZone: zone,
          selectedSeats: [seatId],
          isConfirmed: false,
        },
      });
      return;
    }

    set({
      bookingState: {
        ...bookingState,
        selectedZone: zone,
        selectedSeats: [...bookingState.selectedSeats, seatId],
        isConfirmed: false,
      },
    });
  },

  clearSeats: () =>
    set((state) => ({
      bookingState: {
        ...state.bookingState,
        selectedZone: null,
        selectedSeats: [],
        isConfirmed: false,
      },
    })),

  confirmBooking: () => {
    const { bookingState, studyActive } = get();
    if (bookingState.selectedSeats.length !== bookingState.ticketCount) {
      return;
    }
    set({
      bookingState: {
        ...bookingState,
        isConfirmed: true,
      },
    });
    if (studyActive) {
      get().openStudyQuestionnaire();
    }
  },

  resetBooking: () =>
    set({
      bookingState: { ...initialBookingState },
    }),

  setUiMode: (mode) => set({ uiMode: mode }),

  setInteractionPolicy: (policy) =>
    set((state) => ({
      interactionPolicy: { ...state.interactionPolicy, ...policy },
    })),

  setMouseFallbackMode: (enabled) => set({ mouseFallbackMode: enabled }),

  setPerturbationMode: (mode) => set({ perturbationMode: mode }),

  setTrackingSensitivity: (s) =>
    set((state) => ({
      trackingSensitivity: { ...state.trackingSensitivity, ...s },
    })),

  setTrackingStatus: (s) =>
    set((state) => ({
      trackingStatus: { ...state.trackingStatus, ...s },
    })),

  setRawPointerNorm: (p) => set({ rawPointerNorm: p }),

  setEffectivePointerPx: (p) => set({ effectivePointerPx: p }),

  setHoverTargetId: (id) => set({ hoverTargetId: id }),

  setResearcherDrawerOpen: (open) => set({ researcherDrawerOpen: open }),

  setTelemetryProfile: (profile) => set({ telemetryProfile: profile }),

  setLastAdaptedSpecJson: (spec) => set({ lastAdaptedSpecJson: spec }),

  setAdaptationModeBadge: (badge) => set({ adaptationModeBadge: badge }),

  openAdaptationProposal: (spec) =>
    set({
      pendingAdaptedSpec: spec,
      adaptationProposalOpen: true,
      lastAdaptedSpecJson: spec as unknown as Record<string, unknown>,
    }),

  applyPendingAdaptation: () => {
    const pending = get().pendingAdaptedSpec;
    if (!pending) return;
    set({
      adaptedSpec: pending,
      uiMode: "adapted",
      interactionPolicy: { ...pending.interaction_policy },
      adaptationProposalOpen: false,
      pendingAdaptedSpec: null,
      bookingState: { ...initialBookingState },
    });
  },

  rejectPendingAdaptation: () =>
    set({
      adaptationProposalOpen: false,
      pendingAdaptedSpec: null,
    }),

  revertToBaseline: () =>
    set({
      uiMode: "baseline",
      adaptedSpec: null,
      interactionPolicy: { ...DEFAULT_INTERACTION_POLICY },
      bookingState: { ...initialBookingState },
    }),

  setFrictionAutoPrompted: (v) => set({ frictionAutoPrompted: v }),

  setStudyModalOpen: (open) => set({ studyModalOpen: open }),

  setStudyParticipantId: (id) => set({ studyParticipantId: id }),

  setStudyConditionOrder: (order) => set({ studyConditionOrder: order }),

  startStudyTrial: (condition) => {
    const state = get();
    const first: StudyCondition =
      condition ??
      (state.studyConditionOrder === "baseline_first"
        ? "baseline"
        : "adapted");
    let adaptedSpec = state.adaptedSpec;
    // Auto-compose from latest telemetry so CSV never mislabels baseline as adapted.
    if (first === "adapted" && !adaptedSpec) {
      adaptedSpec = composeSpecFromTelemetry(
        state.telemetryProfile.sample_count > 0
          ? state.telemetryProfile
          : getTelemetryEngine().getProfile(),
      );
    }
    getTelemetryEngine().reset();
    set({
      studyActive: true,
      studyModalOpen: false,
      adaptedSpec,
      studyCurrentCondition: first,
      studyTrialStartedAtMs: performance.now(),
      studyQuestionnaireOpen: false,
      bookingState: { ...initialBookingState },
      uiMode: first === "adapted" && adaptedSpec ? "adapted" : "baseline",
      interactionPolicy:
        first === "adapted" && adaptedSpec
          ? { ...adaptedSpec.interaction_policy }
          : { ...DEFAULT_INTERACTION_POLICY },
    });
  },

  stopStudySession: () =>
    set({
      studyActive: false,
      studyTrialStartedAtMs: null,
      studyQuestionnaireOpen: false,
      studyModalOpen: false,
    }),

  openStudyQuestionnaire: () =>
    set({
      studyQuestionnaireOpen: true,
      studyModalOpen: true,
    }),

  closeStudyQuestionnaire: () => set({ studyQuestionnaireOpen: false }),

  submitStudyQuestionnaire: (trial) => {
    const full: StudyTrial = {
      ...trial,
      completed_at_iso: trial.completed_at_iso ?? new Date().toISOString(),
    };
    set((state) => ({
      studyTrials: [...state.studyTrials, full],
      studyQuestionnaireOpen: false,
      studyTrialStartedAtMs: null,
      bookingState: { ...initialBookingState },
    }));
  },

  advanceStudyCondition: () => {
    const state = get();
    const { studyConditionOrder, studyCurrentCondition } = state;
    let adaptedSpec = state.adaptedSpec;
    const next: StudyCondition =
      studyCurrentCondition === "baseline" ? "adapted" : "baseline";
    // Only advance if order still has the other condition pending
    const expectedSecond =
      studyConditionOrder === "baseline_first" ? "adapted" : "baseline";
    if (studyCurrentCondition !== expectedSecond && next === expectedSecond) {
      if (next === "adapted" && !adaptedSpec) {
        adaptedSpec = composeSpecFromTelemetry(
          state.telemetryProfile.sample_count > 0
            ? state.telemetryProfile
            : getTelemetryEngine().getProfile(),
        );
      }
      getTelemetryEngine().reset();
      set({
        adaptedSpec,
        studyCurrentCondition: next,
        studyTrialStartedAtMs: performance.now(),
        studyQuestionnaireOpen: false,
        studyModalOpen: false,
        bookingState: { ...initialBookingState },
        uiMode: next === "adapted" && adaptedSpec ? "adapted" : "baseline",
        interactionPolicy:
          next === "adapted" && adaptedSpec
            ? { ...adaptedSpec.interaction_policy }
            : { ...DEFAULT_INTERACTION_POLICY },
      });
    }
  },
}));
