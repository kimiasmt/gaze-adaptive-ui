export type InteractionPolicy = {
  dwell_time_ms: number;
  magnetic_snap_radius_px: number;
  one_euro_min_cutoff: number;
  one_euro_beta: number;
};

export const DEFAULT_INTERACTION_POLICY: InteractionPolicy = {
  dwell_time_ms: 700,
  magnetic_snap_radius_px: 16,
  one_euro_min_cutoff: 1.0,
  one_euro_beta: 0.007,
};
