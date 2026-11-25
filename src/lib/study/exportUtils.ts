import type { StudyTrial } from "@/lib/study/types";

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

/** Flatten trials into a spreadsheet-friendly CSV. */
export function exportTrialsCsv(trials: StudyTrial[], filename?: string): void {
  const headers = [
    "participant_id",
    "condition",
    "condition_order",
    "task_completion_time_sec",
    "overshoot_count",
    "midas_touch_errors",
    "path_efficiency",
    "jitter_px",
    "edge_struggle_zones",
    "nasa_mental_demand",
    "nasa_physical_neck_demand",
    "nasa_temporal_demand",
    "nasa_performance",
    "nasa_effort",
    "nasa_frustration",
    "agency_perceived",
    "agency_ease_of_use",
    "agency_would_recommend",
    "completed_at_iso",
  ];

  const rows = trials.map((t) =>
    [
      t.participant_id,
      t.condition,
      t.condition_order,
      t.task_completion_time_sec,
      t.overshoot_count,
      t.midas_touch_errors,
      t.path_efficiency,
      t.jitter_px,
      t.edge_struggle_zones,
      t.nasa_tlx.mental_demand,
      t.nasa_tlx.physical_neck_demand,
      t.nasa_tlx.temporal_demand,
      t.nasa_tlx.performance,
      t.nasa_tlx.effort,
      t.nasa_tlx.frustration,
      t.agency_usability.perceived_agency,
      t.agency_usability.ease_of_use,
      t.agency_usability.would_recommend,
      t.completed_at_iso,
    ]
      .map(csvEscape)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  downloadBlob(
    filename ?? `pilot_trials_${Date.now()}.csv`,
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
}

export function exportTelemetryJson(
  payload: unknown,
  filename?: string,
): void {
  const text = JSON.stringify(payload, null, 2);
  downloadBlob(
    filename ?? `pilot_telemetry_${Date.now()}.json`,
    new Blob([text], { type: "application/json;charset=utf-8" }),
  );
}
