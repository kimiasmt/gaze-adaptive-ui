/** Raw pointer sample (~30–60Hz). */
export type PointerSample = {
  t: number;
  /** Effective / display cursor (post filter + magnetic snap). */
  x: number;
  y: number;
  /**
   * Pre-filter motor coords (after synthetic perturbation, before One-Euro /
   * magnetic snap). Used for jitter_px so smoothing does not hide tremor.
   */
  rawX: number;
  rawY: number;
  /** Unperturbed intent (pre-ROM / pre-tremor) for reach-attenuation stalls. */
  intentX: number;
  intentY: number;
  targetId: string | null;
  dwellProgress: number;
  viewportW: number;
  viewportH: number;
};

export type DwellClickEvent = {
  t: number;
  x: number;
  y: number;
  targetId: string;
  targetType: string;
  /** Logical group for Midas-touch detection (e.g. seat / ticket_count). */
  group: string;
};

export type HotspotFriction = {
  element_id: string;
  overshoots: number;
  misclicks: number;
  time_spent_sec: number;
  completed: boolean;
};

export type EdgeZoneId =
  | "top_left"
  | "top_center"
  | "top_right"
  | "middle_left"
  | "center"
  | "middle_right"
  | "bottom_left"
  | "bottom_center"
  | "bottom_right";

/** Outer / edge labels used in the LLM profile (SPEC Module B). */
export type EdgeStruggleLabel =
  | "top_left"
  | "top_right"
  | "bottom_left"
  | "bottom_right"
  | "edges";

export type TelemetryProfile = {
  jitter_px: number;
  overshoot_count: number;
  midas_touch_errors: number;
  path_efficiency: number;
  edge_struggle_zones: EdgeStruggleLabel[];
  estimated_comfortable_target_px: number;
  hotspot_frictions: HotspotFriction[];
  /** Extra context for researcher / Phase 4 prompts */
  sample_count: number;
  session_duration_sec: number;
  friction_threshold_crossed: boolean;
  computed_at_ms: number;
};

export const EMPTY_TELEMETRY_PROFILE: TelemetryProfile = {
  jitter_px: 0,
  overshoot_count: 0,
  midas_touch_errors: 0,
  path_efficiency: 1,
  edge_struggle_zones: [],
  estimated_comfortable_target_px: 44,
  hotspot_frictions: [],
  sample_count: 0,
  session_duration_sec: 0,
  friction_threshold_crossed: false,
  computed_at_ms: 0,
};
