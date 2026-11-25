import type { TelemetryProfile } from "@/lib/telemetry/types";

/** Guided-task bounds: keep collecting until metrics look stable enough for GenUI. */
export const GUIDED_MIN_ROUNDS = 2;
export const GUIDED_MAX_ROUNDS = 6;
export const GUIDED_MIN_DURATION_SEC = 35;
export const GUIDED_MIN_SAMPLES = 700;

export type MetricSnap = {
  t: number;
  jitter_px: number;
  overshoot_count: number;
  midas_touch_errors: number;
  path_efficiency: number;
  sample_count: number;
};

export function snapshotMetrics(profile: TelemetryProfile): MetricSnap {
  return {
    t: Date.now(),
    jitter_px: profile.jitter_px,
    overshoot_count: profile.overshoot_count,
    midas_touch_errors: profile.midas_touch_errors,
    path_efficiency: profile.path_efficiency,
    sample_count: profile.sample_count,
  };
}

/**
 * Stable when we have enough signal AND recent snapshots stopped swinging hard.
 * Always false before min duration/samples; always true at max rounds (caller).
 */
export function isTelemetryStable(
  profile: TelemetryProfile,
  history: MetricSnap[],
  completedRounds: number,
): { stable: boolean; reason: string } {
  if (completedRounds >= GUIDED_MAX_ROUNDS) {
    return { stable: true, reason: "Reached max task rounds" };
  }
  if (profile.session_duration_sec < GUIDED_MIN_DURATION_SEC) {
    return {
      stable: false,
      reason: `Need ≥${GUIDED_MIN_DURATION_SEC}s (now ${profile.session_duration_sec.toFixed(0)}s)`,
    };
  }
  if (profile.sample_count < GUIDED_MIN_SAMPLES) {
    return {
      stable: false,
      reason: `Need ≥${GUIDED_MIN_SAMPLES} samples (now ${profile.sample_count})`,
    };
  }
  if (completedRounds < GUIDED_MIN_ROUNDS) {
    return {
      stable: false,
      reason: `Need ≥${GUIDED_MIN_ROUNDS} booking rounds (now ${completedRounds})`,
    };
  }

  const recent = history.slice(-4);
  if (recent.length < 3) {
    return { stable: false, reason: "Collecting stability window…" };
  }

  const jitters = recent.map((r) => r.jitter_px);
  const meanJ = jitters.reduce((a, b) => a + b, 0) / jitters.length;
  const maxDev = Math.max(...jitters.map((j) => Math.abs(j - meanJ)));
  const jitterOk = meanJ < 1 ? maxDev < 1.5 : maxDev / Math.max(meanJ, 1) < 0.28;

  const o0 = recent[0]!.overshoot_count;
  const o1 = recent[recent.length - 1]!.overshoot_count;
  const overshootOk = o1 - o0 <= 2;

  const hasFrictionSignal =
    profile.overshoot_count >= 2 ||
    profile.midas_touch_errors >= 1 ||
    profile.friction_threshold_crossed ||
    profile.session_duration_sec >= 70;

  if (!hasFrictionSignal) {
    return {
      stable: false,
      reason: "Need clearer motor friction signal (or longer session)",
    };
  }
  if (!jitterOk) {
    return { stable: false, reason: "Jitter still swinging — keep interacting" };
  }
  if (!overshootOk) {
    return {
      stable: false,
      reason: "Overshoots still rising fast — one more round",
    };
  }

  return { stable: true, reason: "Metrics stabilized" };
}

export function nextSeatTarget(roundIndex: number): number {
  // Alternate 3 → 2 → 3 → 2 … so map + ticket friction both appear.
  return roundIndex % 2 === 0 ? 3 : 2;
}
