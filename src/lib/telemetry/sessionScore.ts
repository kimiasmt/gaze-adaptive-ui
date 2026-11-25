import type { TelemetryProfile } from "@/lib/telemetry/types";

export type MetricKey =
  | "jitter_px"
  | "overshoot_count"
  | "midas_touch_errors"
  | "path_efficiency"
  | "seat_struggle_sec"
  | "edge_pressure";

export type MetricSnapshot = Record<MetricKey, number>;

export type ScoredSession = {
  metrics: MetricSnapshot;
  /** Higher is better, 0–100. */
  score_100: number;
  weights: Record<MetricKey, number>;
};

const WEIGHTS: Record<MetricKey, number> = {
  jitter_px: 0.22,
  overshoot_count: 0.22,
  midas_touch_errors: 0.18,
  path_efficiency: 0.18,
  seat_struggle_sec: 0.12,
  edge_pressure: 0.08,
};

function seatStruggle(profile: Partial<TelemetryProfile>): number {
  return (
    profile.hotspot_frictions?.find((h) => h.element_id === "seat_map_svg")
      ?.time_spent_sec ?? 0
  );
}

function edgePressure(profile: Partial<TelemetryProfile>): number {
  const edges = profile.edge_struggle_zones ?? [];
  return edges.filter((z) =>
    ["top_left", "top_right", "bottom_left", "bottom_right", "edges"].includes(
      z,
    ),
  ).length;
}

export function metricsFromProfile(
  profile: Partial<TelemetryProfile>,
): MetricSnapshot {
  return {
    jitter_px: profile.jitter_px ?? 0,
    overshoot_count: profile.overshoot_count ?? 0,
    midas_touch_errors: profile.midas_touch_errors ?? 0,
    path_efficiency: profile.path_efficiency ?? 1,
    seat_struggle_sec: seatStruggle(profile),
    edge_pressure: edgePressure(profile),
  };
}

/** Per-metric goodness 0–1 (1 = excellent). */
function goodness(key: MetricKey, value: number): number {
  switch (key) {
    case "jitter_px":
      return clamp01(1 - value / 40);
    case "overshoot_count":
      return clamp01(1 - value / 12);
    case "midas_touch_errors":
      return clamp01(1 - value / 6);
    case "path_efficiency":
      return clamp01(value);
    case "seat_struggle_sec":
      return clamp01(1 - value / 30);
    case "edge_pressure":
      return clamp01(1 - value / 5);
  }
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

export function scoreSession(
  profile: Partial<TelemetryProfile>,
): ScoredSession {
  const metrics = metricsFromProfile(profile);
  let acc = 0;
  for (const key of Object.keys(WEIGHTS) as MetricKey[]) {
    acc += WEIGHTS[key] * goodness(key, metrics[key]);
  }
  return {
    metrics,
    score_100: Math.round(acc * 1000) / 10,
    weights: { ...WEIGHTS },
  };
}

export function scoreFromMetrics(metrics: MetricSnapshot): number {
  let acc = 0;
  for (const key of Object.keys(WEIGHTS) as MetricKey[]) {
    acc += WEIGHTS[key] * goodness(key, metrics[key]);
  }
  return Math.round(acc * 1000) / 10;
}

export function metricDelta(
  before: MetricSnapshot,
  after: MetricSnapshot,
): Record<MetricKey, number> {
  const out = {} as Record<MetricKey, number>;
  for (const key of Object.keys(before) as MetricKey[]) {
    out[key] = after[key] - before[key];
  }
  return out;
}

export const METRIC_LABELS: Record<MetricKey, string> = {
  jitter_px: "Jitter (px)",
  overshoot_count: "Overshoots",
  midas_touch_errors: "Midas errors",
  path_efficiency: "Path efficiency",
  seat_struggle_sec: "Seat-map struggle (s)",
  edge_pressure: "Edge pressure",
};

/** Lower is better except path_efficiency. */
export function isLowerBetter(key: MetricKey): boolean {
  return key !== "path_efficiency";
}
