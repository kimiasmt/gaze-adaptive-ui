"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Braces,
  ClipboardList,
  FlaskConical,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  getTelemetryEngine,
  resetTelemetryEngine,
} from "@/lib/telemetry/telemetryEngine";
import type { TelemetryProfile } from "@/lib/telemetry/types";
import { EMPTY_TELEMETRY_PROFILE } from "@/lib/telemetry/types";
import {
  isAdaptationRequestInFlight,
  requestAdaptation,
} from "@/lib/genui/adaptClient";
import {
  useAppStore,
  type PerturbationMode,
} from "@/store/useAppStore";

type InspectorTab = "telemetry" | "adapted";

export function ResearcherDrawer() {
  const open = useAppStore((s) => s.researcherDrawerOpen);
  const setOpen = useAppStore((s) => s.setResearcherDrawerOpen);
  const perturbationMode = useAppStore((s) => s.perturbationMode);
  const setPerturbationMode = useAppStore((s) => s.setPerturbationMode);
  const telemetryProfile = useAppStore((s) => s.telemetryProfile);
  const setTelemetryProfile = useAppStore((s) => s.setTelemetryProfile);
  const lastAdaptedSpecJson = useAppStore((s) => s.lastAdaptedSpecJson);
  const adaptationModeBadge = useAppStore((s) => s.adaptationModeBadge);
  const setAdaptationModeBadge = useAppStore((s) => s.setAdaptationModeBadge);
  const setLastAdaptedSpecJson = useAppStore((s) => s.setLastAdaptedSpecJson);
  const openAdaptationProposal = useAppStore((s) => s.openAdaptationProposal);
  const setStudyModalOpen = useAppStore((s) => s.setStudyModalOpen);

  const [tab, setTab] = useState<InspectorTab>("telemetry");
  const [adaptNote, setAdaptNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "D" && e.metaKey && e.shiftKey) {
        e.preventDefault();
        setOpen(!useAppStore.getState().researcherDrawerOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  // Live refresh while drawer is open
  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setTelemetryProfile(getTelemetryEngine().getProfile());
    }, 250);
    return () => window.clearInterval(id);
  }, [open, setTelemetryProfile]);

  const profile: TelemetryProfile = telemetryProfile ?? EMPTY_TELEMETRY_PROFILE;

  const telemetryJson = useMemo(
    () => JSON.stringify(profile, null, 2),
    [profile],
  );

  const adaptedJson = useMemo(
    () =>
      lastAdaptedSpecJson
        ? JSON.stringify(lastAdaptedSpecJson, null, 2)
        : "// No AdaptedUISpec yet — run Analyze / Run LLM Adaptation",
    [lastAdaptedSpecJson],
  );

  const runLlmAdaptation = async () => {
    if (busy || isAdaptationRequestInFlight()) {
      setAdaptNote("Adaptation already running — waiting (no parallel LLM).");
      return;
    }
    setBusy(true);
    setAdaptNote("Calling Gemini API (single-flight)…");
    try {
      const snap = getTelemetryEngine().getProfile();
      setTelemetryProfile(snap);
      const result = await requestAdaptation(snap);
      setAdaptationModeBadge(result.mode);
      setLastAdaptedSpecJson(result.spec as unknown as Record<string, unknown>);
      openAdaptationProposal(result.spec);
      setTab("adapted");
      setAdaptNote(
        result.error
          ? `${result.mode}: ${result.error}`
          : `${result.mode}: custom proposal ready — accept or reject in the modal.`,
      );
    } catch (err) {
      setAdaptNote(err instanceof Error ? err.message : "Adapt request failed");
      setAdaptationModeBadge("Deterministic Fallback");
    } finally {
      setBusy(false);
    }
  };

  const resetMetrics = () => {
    resetTelemetryEngine();
    setTelemetryProfile(getTelemetryEngine().getProfile());
    setAdaptNote(null);
  };

  return (
    <>
      <button
        type="button"
        data-hci-id="researcher_drawer_toggle"
        data-hci-type="action"
        data-hci-telemetry="exclude"
        onClick={() => setOpen(!open)}
        className="researcher-hud fixed right-3 top-3 z-[110] inline-flex h-8 items-center gap-1.5 rounded border border-slate-700 bg-[#12171d]/95 px-2.5 text-[11px] text-slate-300 shadow-lg backdrop-blur hover:bg-slate-800"
        aria-label="Toggle researcher drawer"
        title="Researcher HUD (⌘⇧D)"
      >
        <FlaskConical className="h-3.5 w-3.5 text-amber-500" aria-hidden />
        Research
      </button>

      {open && (
        <aside
          className="researcher-hud fixed right-0 top-0 z-[120] flex h-full w-[min(100vw,380px)] flex-col border-l border-slate-700 bg-[#0c1015]/98 shadow-2xl backdrop-blur"
          role="dialog"
          data-dwell-pause="true"
          aria-label="Researcher drawer"
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-amber-500/80">
                Researcher HUD · Phase 5
              </p>
              <h2 className="text-sm font-semibold text-white">
                Live HCI Telemetry
              </h2>
            </div>
            <button
              type="button"
              data-hci-id="researcher_drawer_close"
              data-hci-type="action"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Close researcher drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3 text-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-medium ${
                  adaptationModeBadge === "Live LLM"
                    ? "bg-emerald-900/50 text-emerald-300"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                Mode: {adaptationModeBadge}
              </span>
              <button
                type="button"
                data-hci-id="telemetry_reset_btn"
                data-hci-type="action"
                onClick={resetMetrics}
                className="inline-flex h-7 items-center gap-1 rounded border border-slate-700 px-2 text-[10px] text-slate-300 hover:bg-slate-800"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                Reset metrics
              </button>
            </div>

            {/* Live metrics */}
            <section>
              <h3 className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <Activity className="h-3.5 w-3.5" aria-hidden />
                Live metrics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <Metric
                  label="jitter_px"
                  value={profile.jitter_px.toFixed(1)}
                />
                <Metric
                  label="overshoots"
                  value={String(profile.overshoot_count)}
                />
                <Metric
                  label="midas_errors"
                  value={String(profile.midas_touch_errors)}
                />
                <Metric
                  label="path_efficiency"
                  value={profile.path_efficiency.toFixed(2)}
                />
                <Metric
                  label="comfort_target_px"
                  value={String(profile.estimated_comfortable_target_px)}
                />
                <Metric
                  label="samples"
                  value={String(profile.sample_count)}
                />
              </div>
              <div className="mt-2 rounded border border-slate-800 bg-slate-900/60 px-2.5 py-2 text-[11px]">
                <p className="text-slate-500">edge_struggle_zones</p>
                <p className="mt-0.5 text-slate-200">
                  {profile.edge_struggle_zones.length === 0
                    ? "—"
                    : profile.edge_struggle_zones.join(", ")}
                </p>
              </div>
              {profile.friction_threshold_crossed && (
                <p className="mt-2 rounded border border-amber-700/40 bg-amber-950/40 px-2 py-1.5 text-[11px] text-amber-200">
                  Friction threshold crossed (overshoots ≥ 3, midas ≥ 2, or
                  seat-map struggle &gt; 15s).
                </p>
              )}
            </section>

            {/* Perturbation */}
            <section>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Synthetic perturbation
              </h3>
              <select
                data-hci-id="researcher_perturbation_select"
                data-hci-type="select"
                value={perturbationMode}
                onChange={(e) =>
                  setPerturbationMode(e.target.value as PerturbationMode)
                }
                className="h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-[12px] text-slate-200"
              >
                <option value="none">None</option>
                <option value="high_jitter">Simulate High Jitter</option>
                <option value="restricted_rom">
                  Simulate Restricted Neck ROM
                </option>
              </select>
            </section>

            {/* Demo trigger */}
            <section>
              <button
                type="button"
                data-hci-id="run_llm_adaptation_btn"
                data-hci-type="action"
                disabled={busy}
                onClick={() => void runLlmAdaptation()}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded bg-amber-600 text-[12px] font-semibold text-slate-950 hover:bg-amber-500 disabled:opacity-60"
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {busy ? "Adapting…" : "Run LLM Adaptation"}
              </button>
              <button
                type="button"
                data-hci-id="open_pilot_study_btn"
                data-hci-type="action"
                onClick={() => setStudyModalOpen(true)}
                className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded border border-slate-600 bg-slate-900 text-[12px] font-medium text-slate-200 hover:bg-slate-800"
              >
                <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                Open Pilot Study Runner
              </button>
              {adaptNote && (
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                  {adaptNote}
                </p>
              )}
            </section>

            {/* JSON inspector */}
            <section>
              <h3 className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                <Braces className="h-3.5 w-3.5" aria-hidden />
                JSON inspector
              </h3>
              <div className="mb-2 flex gap-1 rounded border border-slate-800 p-0.5">
                <TabButton
                  active={tab === "telemetry"}
                  onClick={() => setTab("telemetry")}
                  label="Telemetry Input"
                />
                <TabButton
                  active={tab === "adapted"}
                  onClick={() => setTab("adapted")}
                  label="AdaptedUISpec"
                />
              </div>
              <pre className="max-h-64 overflow-auto rounded border border-slate-800 bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-emerald-200/90">
                {tab === "telemetry" ? telemetryJson : adaptedJson}
              </pre>
            </section>

            {profile.hotspot_frictions.length > 0 && (
              <section>
                <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Hotspot friction
                </h3>
                <ul className="space-y-1 text-[10px] text-slate-400">
                  {profile.hotspot_frictions.slice(0, 8).map((h) => (
                    <li
                      key={h.element_id}
                      className="flex justify-between gap-2 rounded border border-slate-800/80 px-2 py-1"
                    >
                      <span className="truncate text-slate-300">
                        {h.element_id}
                      </span>
                      <span>
                        {h.time_spent_sec}s · o{h.overshoots} · m{h.misclicks}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <p className="border-t border-slate-800 px-3 py-2 text-[10px] text-slate-600">
            Toggle: ⌘⇧D · Metrics update ~4Hz while open
          </p>
        </aside>
      )}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 px-2.5 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="font-mono text-sm text-amber-200">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded px-2 py-1 text-[10px] ${
        active
          ? "bg-slate-700 text-white"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}
