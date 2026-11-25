import type { AdaptedUISpec } from "@/lib/genui/schema";
import type { AdaptationModeBadge } from "@/store/useAppStore";
import type { TelemetryProfile } from "@/lib/telemetry/types";
import { TASK_SCHEMA } from "@/lib/genui/schema";
import { runAdapt } from "@/lib/genui/runAdapt";

export type AdaptClientResult = {
  spec: AdaptedUISpec;
  mode: AdaptationModeBadge;
  error?: string;
};

/** Browser-side single-flight: Analyze + auto-friction + Research share one call. */
let inflight: Promise<AdaptClientResult> | null = null;

export function isAdaptationRequestInFlight(): boolean {
  return inflight !== null;
}

export async function requestAdaptation(
  telemetryProfile: TelemetryProfile | Record<string, unknown>,
): Promise<AdaptClientResult> {
  if (inflight) return inflight;

  inflight = (async () => {
    const data = await runAdapt(
      telemetryProfile as Partial<TelemetryProfile>,
      TASK_SCHEMA,
    );
    return {
      spec: data.spec,
      mode: data.mode ?? "Deterministic Fallback",
      error: data.error,
    };
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}
