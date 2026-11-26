"use client";

import { ArrowLeft, LayoutTemplate, Users } from "lucide-react";
import { GenUIRenderer } from "@/components/booking/GenUIRenderer";
import { useGuidedSessionStore } from "@/store/useGuidedSessionStore";
import { useAppStore } from "@/store/useAppStore";
import { useState } from "react";
import type { AdaptedUISpec } from "@/lib/genui/schema";
import { METRIC_LABELS, type MetricKey } from "@/lib/telemetry/sessionScore";
import { compareBaselineVsAdapted } from "@/lib/telemetry/fitts";

type Preview = "none" | "personal" | "crowd";

export function SessionResultsView() {
  const phase = useGuidedSessionStore((s) => s.phase);
  const proposal = useGuidedSessionStore((s) => s.proposal);
  const dismissResults = useGuidedSessionStore((s) => s.dismissResults);
  const applySpec = (spec: AdaptedUISpec) => {
    useAppStore.setState({
      adaptedSpec: spec,
      uiMode: "adapted",
      interactionPolicy: { ...spec.interaction_policy },
      pendingAdaptedSpec: null,
      adaptationProposalOpen: false,
      bookingState: {
        selectedZone: null,
        selectedSeats: [],
        ticketCount: 1,
        isConfirmed: false,
      },
    });
  };
  const revertToBaseline = useAppStore((s) => s.revertToBaseline);
  const setMouseFallbackMode = useAppStore((s) => s.setMouseFallbackMode);
  const [preview, setPreview] = useState<Preview>("none");

  if (phase !== "results" || !proposal) return null;

  const m = proposal.sessionMetrics;
  const metricKeys = Object.keys(METRIC_LABELS) as MetricKey[];
  const fittsPersonal = compareBaselineVsAdapted(proposal.personalSpec);
  const fittsCrowd = compareBaselineVsAdapted(proposal.crowdSpec);

  return (
    <div
      className="fixed inset-0 z-[120] overflow-y-auto bg-[#0b0f14]/98"
      data-dwell-pause="true"
    >
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-400/80">
              Session complete · mouse restored · {proposal.adaptationMode}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Custom GenUI proposals
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Score{" "}
              <span className="font-mono text-amber-300">
                {proposal.sessionScore.toFixed(1)} / 100
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              revertToBaseline();
              setMouseFallbackMode(true);
              dismissResults({ clearProposal: true });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Done
          </button>
        </header>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-[#12171d]">
          <div className="border-b border-slate-800 px-4 py-2 text-[11px] uppercase tracking-wider text-slate-500">
            Measured session metrics (baseline guided task)
          </div>
          <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-3 lg:grid-cols-6">
            {metricKeys.map((key) => (
              <div key={key} className="bg-[#12171d] px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">
                  {METRIC_LABELS[key]}
                </p>
                <p className="font-mono text-lg text-amber-200">
                  {key === "path_efficiency" || key === "jitter_px"
                    ? m[key].toFixed(key === "path_efficiency" ? 2 : 1)
                    : Number.isInteger(m[key])
                      ? String(m[key])
                      : m[key].toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-amber-800/40 bg-[#12171d]/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <LayoutTemplate className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                Personal adaptation
              </h2>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              {proposal.personalSpec.detected_profile_archetype.replaceAll(
                "_",
                " ",
              )}{" "}
              · {proposal.personalSpec.layout_config.mode}
            </p>
            <p className="mb-3 text-xs leading-relaxed text-slate-300">
              {proposal.personalSpec.rationale}
            </p>
            <ul className="mb-3 list-inside list-disc text-[11px] text-slate-400">
              {proposal.personalSpec.change_summary.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <FittsCostCard
              title="Theoretical Fitts cost (geometry)"
              baseline={fittsPersonal.baseline}
              adapted={fittsPersonal.adapted}
            />
            <p className="mb-3 mt-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-400">
              Fitts ID / travel are geometric theory from layout targets — not
              predicted UX scores. Re-measure after Apply in Pilot Study for
              empirical deltas.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-amber-600/50 bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-50 hover:bg-amber-500/30"
                onClick={() => {
                  applySpec(proposal.personalSpec);
                  setMouseFallbackMode(true);
                  dismissResults();
                }}
              >
                Apply personal UI
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
                onClick={() =>
                  setPreview((p) => (p === "personal" ? "none" : "personal"))
                }
              >
                {preview === "personal" ? "Hide preview" : "Preview"}
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-emerald-800/40 bg-[#12171d]/80 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">
                Crowd-informed layout
              </h2>
            </div>
            <p className="mb-2 text-xs text-slate-400">
              Aggregate of {proposal.historyCount} session
              {proposal.historyCount === 1 ? "" : "s"} ·{" "}
              {proposal.crowdSpec.detected_profile_archetype.replaceAll(
                "_",
                " ",
              )}
            </p>
            <p className="mb-3 text-xs leading-relaxed text-slate-300">
              {proposal.crowdSpec.rationale}
            </p>
            <ul className="mb-3 list-inside list-disc text-[11px] text-slate-400">
              {proposal.crowdSpec.change_summary.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <FittsCostCard
              title="Theoretical Fitts cost (geometry)"
              baseline={fittsCrowd.baseline}
              adapted={fittsCrowd.adapted}
            />
            <p className="mb-3 mt-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-[11px] text-slate-400">
              Crowd layout is informed by prior measured telemetry, not a claim
              that crowd &gt; personal. Ability-based design expects individual
              needs to diverge.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-emerald-600/50 bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-50 hover:bg-emerald-500/30"
                onClick={() => {
                  applySpec(proposal.crowdSpec);
                  setMouseFallbackMode(true);
                  dismissResults();
                }}
              >
                Apply crowd UI
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900"
                onClick={() =>
                  setPreview((p) => (p === "crowd" ? "none" : "crowd"))
                }
              >
                {preview === "crowd" ? "Hide preview" : "Preview"}
              </button>
            </div>
          </article>
        </div>

        {preview !== "none" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-700">
            <div className="border-b border-slate-800 bg-slate-950 px-4 py-2 text-xs text-slate-400">
              Live preview ·{" "}
              {preview === "personal" ? "Personal" : "Crowd-informed"}
            </div>
            <GenUIRenderer
              key={
                preview === "personal"
                  ? `personal-${proposal.personalSpec.layout_config.mode}-${proposal.personalSpec.nodes.map((n) => n.component).join("-")}`
                  : `crowd-${proposal.crowdSpec.layout_config.mode}-${proposal.crowdSpec.nodes.map((n) => n.component).join("-")}`
              }
              spec={
                preview === "personal"
                  ? proposal.personalSpec
                  : proposal.crowdSpec
              }
            />
          </section>
        )}
      </div>
    </div>
  );
}

function FittsCostCard({
  title,
  baseline,
  adapted,
}: {
  title: string;
  baseline: {
    total_id_bits: number;
    total_travel_px: number;
    peak_neck_excursion_pct: number;
    w_min_px: number;
  };
  adapted: {
    total_id_bits: number;
    total_travel_px: number;
    peak_neck_excursion_pct: number;
    w_min_px: number;
  };
}) {
  const rows = [
    ["Σ ID (bits)", baseline.total_id_bits.toFixed(2), adapted.total_id_bits.toFixed(2)],
    ["Travel (px)", baseline.total_travel_px.toFixed(0), adapted.total_travel_px.toFixed(0)],
    [
      "Peak neck %",
      `${baseline.peak_neck_excursion_pct.toFixed(0)}%`,
      `${adapted.peak_neck_excursion_pct.toFixed(0)}%`,
    ],
    ["W_min (px)", String(baseline.w_min_px), String(adapted.w_min_px)],
  ] as const;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <p className="mb-2 text-[10px] uppercase tracking-wider text-slate-500">
        {title} · ID = log₂(D/W+1)
      </p>
      <table className="w-full text-left text-[11px] text-slate-300">
        <thead>
          <tr className="text-slate-500">
            <th className="py-1 font-medium">Metric</th>
            <th className="py-1 font-medium">Baseline</th>
            <th className="py-1 font-medium">Adapted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, b, a]) => (
            <tr key={label} className="border-t border-slate-800/80">
              <td className="py-1.5">{label}</td>
              <td className="py-1.5 font-mono text-amber-200/90">{b}</td>
              <td className="py-1.5 font-mono text-emerald-300/90">{a}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
