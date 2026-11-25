"use client";

import { useState } from "react";
import { ClipboardList, Download, Play, X } from "lucide-react";
import { getTelemetryEngine } from "@/lib/telemetry/telemetryEngine";
import {
  exportTelemetryJson,
  exportTrialsCsv,
} from "@/lib/study/exportUtils";
import {
  DEFAULT_AGENCY,
  DEFAULT_NASA,
  type AgencyUsabilityScores,
  type ConditionOrder,
  type NasaTlxScores,
} from "@/lib/study/types";
import { useAppStore } from "@/store/useAppStore";

const NASA_FIELDS: { key: keyof NasaTlxScores; label: string }[] = [
  { key: "mental_demand", label: "Mental Demand" },
  { key: "physical_neck_demand", label: "Physical / Neck Demand" },
  { key: "temporal_demand", label: "Temporal Demand" },
  { key: "performance", label: "Performance (success)" },
  { key: "effort", label: "Effort" },
  { key: "frustration", label: "Frustration" },
];

const AGENCY_FIELDS: { key: keyof AgencyUsabilityScores; label: string }[] = [
  { key: "perceived_agency", label: "I felt in control of the adaptation" },
  { key: "ease_of_use", label: "The interface was easy to use hands-free" },
  { key: "would_recommend", label: "I would recommend this interaction style" },
];

export function PilotStudyModal() {
  const open = useAppStore((s) => s.studyModalOpen);
  const setOpen = useAppStore((s) => s.setStudyModalOpen);
  const active = useAppStore((s) => s.studyActive);
  const questionnaireOpen = useAppStore((s) => s.studyQuestionnaireOpen);
  const participantId = useAppStore((s) => s.studyParticipantId);
  const setParticipantId = useAppStore((s) => s.setStudyParticipantId);
  const order = useAppStore((s) => s.studyConditionOrder);
  const setOrder = useAppStore((s) => s.setStudyConditionOrder);
  const current = useAppStore((s) => s.studyCurrentCondition);
  const startedAt = useAppStore((s) => s.studyTrialStartedAtMs);
  const trials = useAppStore((s) => s.studyTrials);
  const adaptedSpec = useAppStore((s) => s.adaptedSpec);
  const startStudyTrial = useAppStore((s) => s.startStudyTrial);
  const stopStudySession = useAppStore((s) => s.stopStudySession);
  const submitStudyQuestionnaire = useAppStore((s) => s.submitStudyQuestionnaire);
  const advanceStudyCondition = useAppStore((s) => s.advanceStudyCondition);
  const closeStudyQuestionnaire = useAppStore((s) => s.closeStudyQuestionnaire);
  const telemetryProfile = useAppStore((s) => s.telemetryProfile);

  const [nasa, setNasa] = useState<NasaTlxScores>({ ...DEFAULT_NASA });
  const [agency, setAgency] = useState<AgencyUsabilityScores>({
    ...DEFAULT_AGENCY,
  });

  const elapsedSec = startedAt
    ? Math.max(0, (performance.now() - startedAt) / 1000)
    : 0;

  if (!open) return null;

  const bothDone =
    trials.some((t) => t.condition === "baseline") &&
    trials.some((t) => t.condition === "adapted");

  const onSubmitQuestionnaire = () => {
    const profile = getTelemetryEngine().getProfile();
    const timeSec = startedAt
      ? Number(((performance.now() - startedAt) / 1000).toFixed(2))
      : 0;
    submitStudyQuestionnaire({
      participant_id: participantId,
      condition: current,
      condition_order: order,
      task_completion_time_sec: timeSec,
      overshoot_count: profile.overshoot_count,
      midas_touch_errors: profile.midas_touch_errors,
      path_efficiency: profile.path_efficiency,
      jitter_px: profile.jitter_px,
      edge_struggle_zones: profile.edge_struggle_zones.join("|"),
      nasa_tlx: nasa,
      agency_usability: agency,
    });
    setNasa({ ...DEFAULT_NASA });
    setAgency({ ...DEFAULT_AGENCY });
  };

  const exportTelemetry = () => {
    exportTelemetryJson({
      exported_at: new Date().toISOString(),
      participant_id: participantId,
      trials,
      latest_telemetry_profile: getTelemetryEngine().getProfile(),
      store_telemetry_snapshot: telemetryProfile,
      adapted_spec: adaptedSpec,
    });
  };

  return (
    <div
      className="researcher-hud fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      data-dwell-pause="true"
      aria-labelledby="pilot-study-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#0f1419] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-amber-500/80">
              Pilot study · Phase 5
            </p>
            <h2
              id="pilot-study-title"
              className="inline-flex items-center gap-2 text-base font-semibold text-white"
            >
              <ClipboardList className="h-4 w-4 text-amber-500" aria-hidden />
              A/B runner + NASA-TLX
            </h2>
          </div>
          <button
            type="button"
            data-hci-id="pilot_study_close"
            data-hci-type="action"
            onClick={() => {
              if (!questionnaireOpen) setOpen(false);
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close pilot study"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm text-slate-200">
          {!questionnaireOpen && (
            <>
              <label className="block text-[11px] uppercase tracking-wide text-slate-500">
                Participant ID
                <input
                  data-hci-id="pilot_participant_id"
                  data-hci-type="input"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  className="mt-1 h-9 w-full rounded border border-slate-700 bg-slate-900 px-3 text-sm text-white"
                />
              </label>

              <label className="block text-[11px] uppercase tracking-wide text-slate-500">
                Condition order (counterbalancing)
                <select
                  data-hci-id="pilot_condition_order"
                  data-hci-type="select"
                  value={order}
                  onChange={(e) =>
                    setOrder(e.target.value as ConditionOrder)
                  }
                  className="mt-1 h-9 w-full rounded border border-slate-700 bg-slate-900 px-2 text-sm"
                >
                  <option value="baseline_first">
                    Baseline → Adapted
                  </option>
                  <option value="adapted_first">
                    Adapted → Baseline
                  </option>
                </select>
              </label>

              {order === "adapted_first" && !adaptedSpec && (
                <p className="rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
                  Adapted UI not applied yet. Run Analyze/Apply first, or start
                  with Baseline → Adapted.
                </p>
              )}

              {active && (
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-3 py-2 text-[12px] text-emerald-100">
                  Running · condition <strong>{current}</strong>
                  {startedAt != null && (
                    <span className="text-emerald-300/80">
                      {" "}
                      · timer ~{elapsedSec.toFixed(0)}s
                    </span>
                  )}
                  <p className="mt-1 text-[11px] text-emerald-200/70">
                    Complete the booking task, then Confirm opens NASA-TLX
                    automatically.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-hci-id="pilot_start_trial"
                  data-hci-type="action"
                  onClick={() => startStudyTrial()}
                  disabled={
                    order === "adapted_first" && !adaptedSpec && !active
                  }
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 text-sm font-semibold text-slate-950 enabled:hover:bg-amber-500 disabled:opacity-40"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  {active ? "Restart current trial" : "Start first trial"}
                </button>
                {active && (
                  <button
                    type="button"
                    data-hci-id="pilot_stop_session"
                    data-hci-type="action"
                    onClick={stopStudySession}
                    className="h-10 rounded-lg border border-slate-600 px-3 text-sm text-slate-300 hover:bg-slate-800"
                  >
                    Stop
                  </button>
                )}
              </div>

              {trials.length > 0 && !bothDone && active && (
                <button
                  type="button"
                  data-hci-id="pilot_advance_condition"
                  data-hci-type="action"
                  onClick={advanceStudyCondition}
                  disabled={
                    (current === "baseline" ? "adapted" : "baseline") ===
                      "adapted" && !adaptedSpec
                  }
                  className="h-10 w-full rounded-lg border border-slate-600 text-sm text-slate-200 enabled:hover:bg-slate-800 disabled:opacity-40"
                >
                  Start second condition (
                  {current === "baseline" ? "adapted" : "baseline"})
                </button>
              )}
              {current === "baseline" &&
                trials.some((t) => t.condition === "baseline") &&
                !adaptedSpec &&
                active && (
                  <p className="text-[11px] text-amber-200/90">
                    Apply an Adapted UI first (Analyze / guided task) before
                    starting the adapted condition — otherwise CSV would
                    mislabel baseline as adapted.
                  </p>
                )}
            </>
          )}

          {questionnaireOpen && (
            <div className="space-y-4">
              <p className="text-[12px] text-slate-400">
                Condition <strong className="text-white">{current}</strong> ·
                rate the trial you just completed (0–100).
              </p>

              <section>
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  NASA-TLX
                </h3>
                <div className="space-y-3">
                  {NASA_FIELDS.map(({ key, label }) => (
                    <label key={key} className="block text-[12px]">
                      <span className="flex justify-between text-slate-300">
                        {label}
                        <span className="font-mono text-amber-300">
                          {nasa[key]}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={nasa[key]}
                        data-hci-id={`nasa_${key}`}
                        data-hci-type="slider"
                        onChange={(e) =>
                          setNasa((s) => ({
                            ...s,
                            [key]: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-amber-500"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Agency / usability (3 items)
                </h3>
                <div className="space-y-3">
                  {AGENCY_FIELDS.map(({ key, label }) => (
                    <label key={key} className="block text-[12px]">
                      <span className="flex justify-between gap-3 text-slate-300">
                        <span>{label}</span>
                        <span className="shrink-0 font-mono text-amber-300">
                          {agency[key]}
                        </span>
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={agency[key]}
                        data-hci-id={`agency_${key}`}
                        data-hci-type="slider"
                        onChange={(e) =>
                          setAgency((s) => ({
                            ...s,
                            [key]: Number(e.target.value),
                          }))
                        }
                        className="mt-1 w-full accent-amber-500"
                      />
                    </label>
                  ))}
                </div>
              </section>

              <div className="flex gap-2">
                <button
                  type="button"
                  data-hci-id="pilot_submit_tlx"
                  data-hci-type="action"
                  onClick={onSubmitQuestionnaire}
                  className="h-11 flex-1 rounded-lg bg-amber-600 text-sm font-semibold text-slate-950 hover:bg-amber-500"
                >
                  Submit ratings
                </button>
                <button
                  type="button"
                  data-hci-id="pilot_skip_tlx"
                  data-hci-type="action"
                  onClick={closeStudyQuestionnaire}
                  className="h-11 rounded-lg border border-slate-600 px-3 text-sm text-slate-300"
                >
                  Later
                </button>
              </div>
            </div>
          )}

          {trials.length > 0 && (
            <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
              <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Recorded trials ({trials.length})
              </h3>
              <ul className="space-y-1 text-[11px] text-slate-400">
                {trials.map((t, i) => (
                  <li key={`${t.condition}-${t.completed_at_iso}-${i}`}>
                    {t.participant_id} · {t.condition} ·{" "}
                    {t.task_completion_time_sec}s · o{t.overshoot_count} · m
                    {t.midas_touch_errors} · eff {t.path_efficiency}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-hci-id="pilot_export_csv"
                  data-hci-type="action"
                  onClick={() => exportTrialsCsv(trials)}
                  className="inline-flex h-9 items-center gap-1.5 rounded border border-slate-600 px-2.5 text-[11px] text-slate-200 hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Export All Trials (CSV)
                </button>
                <button
                  type="button"
                  data-hci-id="pilot_export_json"
                  data-hci-type="action"
                  onClick={exportTelemetry}
                  className="inline-flex h-9 items-center gap-1.5 rounded border border-slate-600 px-2.5 text-[11px] text-slate-200 hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  Export Full Telemetry (JSON)
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
