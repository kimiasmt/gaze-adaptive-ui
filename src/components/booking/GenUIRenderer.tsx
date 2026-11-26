"use client";

import { useEffect, useState } from "react";
import type { AdaptedUISpec } from "@/lib/genui/schema";
import { COMPONENT_MAP } from "@/components/booking/registry";

type Props = {
  spec: AdaptedUISpec;
};

/**
 * Always one node at a time (stepper). Head-gaze users cannot scroll, so stacked
 * multi-section layouts are never shown together — layout_config.mode still
 * drives spacing / density, not whether steps are paginated.
 */
export function GenUIRenderer({ spec }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [spec]);

  const nodes = spec.nodes;
  const safeStep = Math.min(step, Math.max(0, nodes.length - 1));
  const current = nodes[safeStep];
  const widthPct = spec.layout_config.safe_zone_width_percent;
  const navH = Math.max(
    48,
    Math.round(spec.layout_config.min_target_size_px * 0.7),
  );
  const isLast = safeStep >= nodes.length - 1;

  return (
    <div className="flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-[#0f1419] px-3 py-2">
      <div
        className="flex max-h-full w-full min-h-0 flex-col"
        style={{
          maxWidth: `${Math.min(widthPct, 92)}%`,
          gap: Math.min(spec.layout_config.element_gap_px, 16),
        }}
      >
        <div className="shrink-0 text-center">
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-400/80">
            Adapted UI · {spec.detected_profile_archetype.replaceAll("_", " ")}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">
            Northlight · Ability-based layout
          </h2>
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">
            Step {safeStep + 1} / {nodes.length}
            {spec.layout_config.mode !== "step_wizard"
              ? ` · ${spec.layout_config.mode.replaceAll("_", " ")}`
              : ""}
          </p>
        </div>

        {current && (
          <section className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-[#12171d]/90 p-3">
            {current.step_title && (
              <h3 className="mb-2 shrink-0 text-sm font-medium text-slate-300">
                {current.step_title}
              </h3>
            )}
            <div className="max-h-full overflow-hidden">
              {(() => {
                const Comp = COMPONENT_MAP[current.component];
                if (!Comp) return null;
                return (
                  <Comp
                    {...current.props}
                    minTargetSizePx={spec.layout_config.min_target_size_px}
                    elementGapPx={spec.layout_config.element_gap_px}
                  />
                );
              })()}
            </div>
          </section>
        )}

        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            data-hci-id="wizard_back"
            data-hci-type="action"
            disabled={safeStep <= 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="flex flex-1 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-sm font-medium text-slate-100 enabled:hover:bg-slate-800 disabled:opacity-40"
            style={{ minHeight: navH }}
          >
            Back
          </button>
          {!isLast ? (
            <button
              type="button"
              data-hci-id="wizard_continue"
              data-hci-type="action"
              onClick={() =>
                setStep((s) => Math.min(nodes.length - 1, s + 1))
              }
              className="flex flex-[1.4] items-center justify-center rounded-lg border border-amber-600/50 bg-amber-500/20 text-sm font-medium text-amber-50 hover:bg-amber-500/30"
              style={{ minHeight: navH }}
            >
              Continue
            </button>
          ) : (
            <p className="flex flex-[1.4] items-center justify-center text-center text-[11px] text-slate-500">
              Confirm on this step
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
