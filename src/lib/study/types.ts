export type StudyCondition = "baseline" | "adapted";

export type ConditionOrder = "baseline_first" | "adapted_first";

export type NasaTlxScores = {
  mental_demand: number;
  physical_neck_demand: number;
  temporal_demand: number;
  performance: number;
  effort: number;
  frustration: number;
};

export type AgencyUsabilityScores = {
  perceived_agency: number;
  ease_of_use: number;
  would_recommend: number;
};

export type StudyTrial = {
  participant_id: string;
  condition: StudyCondition;
  condition_order: ConditionOrder;
  task_completion_time_sec: number;
  overshoot_count: number;
  midas_touch_errors: number;
  path_efficiency: number;
  jitter_px: number;
  edge_struggle_zones: string;
  nasa_tlx: NasaTlxScores;
  agency_usability: AgencyUsabilityScores;
  completed_at_iso: string;
};

export const DEFAULT_NASA: NasaTlxScores = {
  mental_demand: 50,
  physical_neck_demand: 50,
  temporal_demand: 50,
  performance: 50,
  effort: 50,
  frustration: 50,
};

export const DEFAULT_AGENCY: AgencyUsabilityScores = {
  perceived_agency: 50,
  ease_of_use: 50,
  would_recommend: 50,
};
