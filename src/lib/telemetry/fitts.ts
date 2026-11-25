import type { AdaptedUISpec } from "@/lib/genui/schema";

export type FittsTarget = {
  id: string;
  x: number;
  y: number;
  /** Effective width / diameter for Fitts W (px). */
  w: number;
};

export type FittsMotorCost = {
  /** Shannon Index of Difficulty sum: Σ log2(D/W + 1) bits */
  total_id_bits: number;
  /** Sum of straight-line pointer travel between sequential targets (px). */
  total_travel_px: number;
  /** Max distance from viewport center among targets (% of half-diagonal). */
  peak_neck_excursion_pct: number;
  /** Smallest interactive target width in the path (px). */
  w_min_px: number;
  steps: Array<{ from: string; to: string; d_px: number; w_px: number; id_bits: number }>;
};

export const VERIFY_VIEWPORT = { width: 1440, height: 900 } as const;

/** Shannon formulation ID = log2(D/W + 1). */
export function fittsId(distancePx: number, widthPx: number): number {
  const w = Math.max(1, widthPx);
  const d = Math.max(0, distancePx);
  return Math.log2(d / w + 1);
}

function centerDistPct(x: number, y: number, vw: number, vh: number): number {
  const cx = vw / 2;
  const cy = vh / 2;
  const halfDiag = Math.hypot(vw / 2, vh / 2);
  return (Math.hypot(x - cx, y - cy) / halfDiag) * 100;
}

export function costForPath(
  targets: FittsTarget[],
  viewport = VERIFY_VIEWPORT,
): FittsMotorCost {
  const steps: FittsMotorCost["steps"] = [];
  let totalId = 0;
  let travel = 0;
  let peak = 0;
  let wMin = Infinity;

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    peak = Math.max(peak, centerDistPct(t.x, t.y, viewport.width, viewport.height));
    wMin = Math.min(wMin, t.w);
    if (i === 0) continue;
    const prev = targets[i - 1]!;
    const d = Math.hypot(t.x - prev.x, t.y - prev.y);
    const id = fittsId(d, t.w);
    totalId += id;
    travel += d;
    steps.push({
      from: prev.id,
      to: t.id,
      d_px: Number(d.toFixed(1)),
      w_px: t.w,
      id_bits: Number(id.toFixed(3)),
    });
  }

  return {
    total_id_bits: Number(totalId.toFixed(3)),
    total_travel_px: Number(travel.toFixed(1)),
    peak_neck_excursion_pct: Number(peak.toFixed(1)),
    w_min_px: wMin === Infinity ? 0 : wMin,
    steps,
  };
}

/**
 * Hostile baseline geometry for a 3-step booking on 1440×900:
 * dense 16px seat → 32px sidebar ticket control → 120×36 Confirm (bottom-right).
 */
export function baselineBookingTargets(
  viewport = VERIFY_VIEWPORT,
): FittsTarget[] {
  const { width: vw, height: vh } = viewport;
  // Seat map roughly left-center; pick a mid-floor seat away from center.
  const seat = { id: "seat_E4", x: vw * 0.38, y: vh * 0.48, w: 16 };
  const tickets = {
    id: "ticket_count",
    x: vw * 0.88,
    y: vh * 0.42,
    w: 32,
  };
  const confirm = {
    id: "confirm",
    x: vw - 80,
    y: vh - 40,
    w: Math.min(120, 36), // Fitts W ≈ smaller dimension of 120×36 button
  };
  // Start from viewport center (rest pose).
  const start = { id: "rest", x: vw / 2, y: vh / 2, w: 44 };
  return [start, seat, tickets, confirm];
}

/**
 * Theoretical adapted geometry from an AdaptedUISpec layout (not live DOM).
 * Compact hubs stay near center; wizards use large central targets.
 */
export function adaptedBookingTargets(
  spec: AdaptedUISpec,
  viewport = VERIFY_VIEWPORT,
): FittsTarget[] {
  const { width: vw, height: vh } = viewport;
  const w = Math.max(44, spec.layout_config.min_target_size_px);
  const mode = spec.layout_config.mode;
  const safe = spec.layout_config.safe_zone_width_percent / 100;
  const cx = vw / 2;
  const cy = vh / 2;
  const colW = vw * safe;

  const start = { id: "rest", x: cx, y: cy, w: 44 };

  if (mode === "compact_center_hub") {
    return [
      start,
      { id: "zone_hub", x: cx, y: cy - 40, w: Math.max(48, w) },
      { id: "ticket_stepper", x: cx, y: cy + 40, w: Math.max(48, w) },
      { id: "confirm", x: cx, y: cy + 140, w: Math.max(56, w) },
    ];
  }

  // step_wizard / single_column_large: stacked large targets in safe column.
  const x = cx;
  const top = mode === "step_wizard" ? vh * 0.28 : vh * 0.22;
  const gap = Math.max(spec.layout_config.element_gap_px, 24) + w;
  void colW;
  return [
    start,
    { id: "seat_or_zone", x, y: top, w },
    { id: "tickets", x, y: top + gap, w },
    { id: "confirm", x, y: top + gap * 2, w: Math.max(w, 56) },
  ];
}

export function compareBaselineVsAdapted(spec: AdaptedUISpec) {
  const baseline = costForPath(baselineBookingTargets());
  const adapted = costForPath(adaptedBookingTargets(spec));
  return { baseline, adapted };
}
