export type VerificationRow = {
  id: string;
  label: string;
  kind: string;
  expected_archetype: string;
  /** Deterministic rule-composer archetype (routing accuracy). */
  composer_archetype: string;
  /** Archetype on the final AdaptedUISpec used for Fitts / layout columns. */
  final_spec_archetype: string;
  /** @deprecated alias of composer_archetype for chart helpers */
  routed_archetype: string;
  archetype_match: boolean;
  jitter_px: number;
  overshoot_count: number;
  midas_touch_errors: number;
  path_efficiency: number;
  edge_pressure: number;
  edge_struggle_zones: string;
  adapt_mode: string;
  zod_ok: boolean;
  coerced: boolean;
  fallback: boolean;
  latency_ms: number;
  baseline_id_bits: number;
  adapted_id_bits: number;
  baseline_travel_px: number;
  adapted_travel_px: number;
  baseline_neck_pct: number;
  adapted_neck_pct: number;
  baseline_w_min: number;
  adapted_w_min: number;
  layout_mode: string;
  seat_component: string;
  ticket_component: string;
  error?: string;
};
