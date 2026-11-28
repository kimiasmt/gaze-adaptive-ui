import type { TelemetryProfile } from "@/lib/telemetry/types";
import { EMPTY_TELEMETRY_PROFILE } from "@/lib/telemetry/types";
import { composeSpecFromTelemetry } from "@/lib/genui/composeSpec";
import { scoreSession } from "@/lib/telemetry/sessionScore";
import type { StoredSession } from "@/lib/study/sessionHistory";

/** Prior synthetic crowd sessions so Personal ≠ Crowd on first local run. */
const SEED_PROFILES: {
  id: string;
  participant_id: string;
  telemetry: Partial<TelemetryProfile>;
}[] = [
  {
    id: "seed_hj_01",
    participant_id: "P_seed_hj",
    telemetry: {
      jitter_px: 14.2,
      overshoot_count: 16,
      midas_touch_errors: 2,
      path_efficiency: 0.32,
      edge_struggle_zones: ["edges", "top_right"],
      estimated_comfortable_target_px: 78,
      sample_count: 1400,
      session_duration_sec: 95,
      friction_threshold_crossed: true,
      hotspot_frictions: [
        {
          element_id: "seat_map_svg",
          overshoots: 10,
          misclicks: 3,
          time_spent_sec: 40,
          completed: true,
        },
      ],
    },
  },
  {
    id: "seed_rom_01",
    participant_id: "P_seed_rom",
    telemetry: {
      jitter_px: 1.8,
      overshoot_count: 1,
      midas_touch_errors: 0,
      path_efficiency: 0.55,
      edge_struggle_zones: ["top_left", "bottom_right", "edges"],
      estimated_comfortable_target_px: 52,
      sample_count: 1100,
      session_duration_sec: 80,
      friction_threshold_crossed: true,
      hotspot_frictions: [
        {
          element_id: "confirm_booking_btn",
          overshoots: 2,
          misclicks: 1,
          time_spent_sec: 18,
          completed: false,
        },
      ],
    },
  },
  {
    id: "seed_mixed_01",
    participant_id: "P_seed_mixed",
    telemetry: {
      jitter_px: 7.4,
      overshoot_count: 8,
      midas_touch_errors: 3,
      path_efficiency: 0.41,
      edge_struggle_zones: ["bottom_right"],
      estimated_comfortable_target_px: 68,
      sample_count: 1250,
      session_duration_sec: 88,
      friction_threshold_crossed: true,
      hotspot_frictions: [
        {
          element_id: "seat_map_svg",
          overshoots: 5,
          misclicks: 2,
          time_spent_sec: 28,
          completed: true,
        },
      ],
    },
  },
  {
    id: "seed_base_01",
    participant_id: "P_seed_base",
    telemetry: {
      jitter_px: 0.9,
      overshoot_count: 0,
      midas_touch_errors: 0,
      path_efficiency: 0.88,
      edge_struggle_zones: [],
      estimated_comfortable_target_px: 48,
      sample_count: 900,
      session_duration_sec: 55,
      friction_threshold_crossed: false,
      hotspot_frictions: [],
    },
  },
];

function toStoredSession(
  id: string,
  participant_id: string,
  partial: Partial<TelemetryProfile>,
): StoredSession {
  const telemetry: TelemetryProfile = {
    ...EMPTY_TELEMETRY_PROFILE,
    ...partial,
    computed_at_ms: Date.now(),
  };
  const scored = scoreSession(telemetry);
  return {
    id,
    saved_at_iso: new Date().toISOString(),
    participant_id,
    telemetry,
    metrics: scored.metrics,
    score_100: scored.score_100,
    personal_spec: composeSpecFromTelemetry(telemetry),
  };
}

export function buildCrowdSeedSessions(): StoredSession[] {
  return SEED_PROFILES.map((s) =>
    toStoredSession(s.id, s.participant_id, s.telemetry),
  );
}
