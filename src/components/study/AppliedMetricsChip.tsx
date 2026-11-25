"use client";

import { useGuidedSessionStore } from "@/store/useGuidedSessionStore";
import { useAppStore } from "@/store/useAppStore";

/** Compact metrics strip while using an applied GenUI after guided session. */
export function AppliedMetricsChip() {
  const proposal = useGuidedSessionStore((s) => s.proposal);
  const phase = useGuidedSessionStore((s) => s.phase);
  const uiMode = useAppStore((s) => s.uiMode);
  const adaptedSpec = useAppStore((s) => s.adaptedSpec);

  if (phase === "results") return null;
  if (uiMode !== "adapted" || !adaptedSpec || !proposal) return null;

  const isCrowd =
    adaptedSpec.rationale.startsWith("Crowd-improved") ||
    adaptedSpec.rationale.startsWith("Crowd-informed") ||
    adaptedSpec.change_summary[0]?.startsWith("Aggregated");

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] max-w-xs rounded-2xl border border-slate-700 bg-[#12171d]/95 px-3 py-2 text-[11px] text-slate-300 shadow-lg backdrop-blur">
      <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-400/80">
        {isCrowd ? "Crowd UI" : "Personal UI"} · measured baseline session
      </p>
      <p className="mt-0.5 font-mono text-sm text-amber-300">
        {proposal.sessionScore.toFixed(1)} / 100
      </p>
      <p className="mt-1 text-slate-500">
        jitter {proposal.sessionMetrics.jitter_px.toFixed(1)} · overshoots{" "}
        {proposal.sessionMetrics.overshoot_count} · re-measure in Pilot Study
        for adapted deltas
      </p>
    </div>
  );
}
