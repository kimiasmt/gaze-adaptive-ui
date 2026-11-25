"use client";

import { useEffect, useState } from "react";
import type { AdaptedUISpec } from "@/lib/genui/schema";
import { COMPONENT_MAP } from "@/components/booking/registry";

type Props = {
  spec: AdaptedUISpec;
};

export function GenUIRenderer({ spec }: Props) {
  const isWizard = spec.layout_config.mode === "step_wizard";
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
  }, [spec]);

  const nodes = spec.nodes;
  const current = isWizard
    ? nodes[Math.min(step, nodes.length - 1)]
    : null;
  const visibleNodes = isWizard ? (current ? [current] : []) : nodes;

  const widthPct = spec.layout_config.safe_zone_width_percent;
  const align =
    spec.layout_config.alignment === "top_center"
      ? "items-start pt-10"
      : "items-center";
  const navH = Math.max(48, Math.round(spec.layout_config.min_target_size_px * 0.7));

  return (
    <div
      className={`flex min-h-[calc(100vh-57px)] justify-center ${align} bg-[#0f1419] px-4 pb-24`}
    >
      <div
        className="flex w-full flex-col"
        style={{
          maxWidth: `${widthPct}%`,
          gap: spec.layout_config.element_gap_px,
        }}
      >
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-400/80">
            Adapted UI · {spec.detected_profile_archetype.replaceAll("_", " ")}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            Northlight · Ability-based layout
          </h2>
          {isWizard && (
            <p className="mt-1 font-mono text-[10px] text-slate-500">
              Step {step + 1} / {nodes.length}
            </p>
          )}
        </div>

        {visibleNodes.map((node) => {
          const Comp = COMPONENT_MAP[node.component];
          if (!Comp) return null;
          return (
            <section
              key={node.node_id}
              className="rounded-2xl border border-slate-800 bg-[#12171d]/90 p-4"
            >
              {(isWizard || node.step_title) && (
                <h3 className="mb-3 text-sm font-medium text-slate-300">
                  {node.step_title}
                </h3>
              )}
              <Comp
                {...node.props}
                minTargetSizePx={spec.layout_config.min_target_size_px}
                elementGapPx={spec.layout_config.element_gap_px}
              />
            </section>
          );
        })}

        {isWizard && (
          <div className="flex gap-3">
            <button
              type="button"
              data-hci-id="wizard_back"
              data-hci-type="action"
              disabled={step <= 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="flex flex-1 items-center justify-center rounded-lg border border-slate-600 bg-slate-900 text-sm font-medium text-slate-100 enabled:hover:bg-slate-800 disabled:opacity-40"
              style={{ minHeight: navH }}
            >
              Back
            </button>
            {step < nodes.length - 1 ? (
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
        )}
      </div>
    </div>
  );
}
