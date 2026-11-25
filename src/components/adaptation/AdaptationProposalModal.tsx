"use client";

import { useAppStore } from "@/store/useAppStore";
import type { AdaptedUISpec } from "@/lib/genui/schema";

export function AdaptationProposalModal() {
  const open = useAppStore((s) => s.adaptationProposalOpen);
  const pending = useAppStore((s) => s.pendingAdaptedSpec);
  const applyPendingAdaptation = useAppStore((s) => s.applyPendingAdaptation);
  const rejectPendingAdaptation = useAppStore((s) => s.rejectPendingAdaptation);
  const adaptationModeBadge = useAppStore((s) => s.adaptationModeBadge);

  if (!open || !pending) return null;

  const spec = pending as AdaptedUISpec;

  return (
    <div
      className="researcher-hud fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      data-adaptation-modal="true"
      aria-labelledby="adapt-proposal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-[#534434]/50 bg-[var(--nl-surface-container)] p-5 shadow-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffc174]">
          Mixed-initiative adaptation · {adaptationModeBadge}
        </p>
        <h2
          id="adapt-proposal-title"
          className="font-display mt-1 text-lg font-semibold text-[#dee3ea]"
        >
          Suggested UI adaptation
        </h2>
        <p className="mt-1 text-xs text-[#a08e7a]">
          Profile: {spec.detected_profile_archetype.replaceAll("_", " ")}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-[#d8c3ad]">
          {spec.rationale}
        </p>

        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#dee3ea]">
          {spec.change_summary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            data-hci-id="adapt_apply_btn"
            data-hci-type="action"
            onClick={applyPendingAdaptation}
            className="flex min-h-[56px] items-center justify-center rounded-xl bg-[#f59e0b] font-display text-sm font-semibold text-[#613b00] hover:brightness-110"
          >
            Apply Adapted UI
          </button>
          <button
            type="button"
            data-hci-id="adapt_keep_btn"
            data-hci-type="action"
            onClick={rejectPendingAdaptation}
            className="flex min-h-[56px] items-center justify-center rounded-xl border border-[#534434]/60 bg-[var(--nl-surface-high)] font-display text-sm font-semibold text-[#dee3ea] hover:border-[#a08e7a]"
          >
            Keep Current UI
          </button>
        </div>
      </div>
    </div>
  );
}
