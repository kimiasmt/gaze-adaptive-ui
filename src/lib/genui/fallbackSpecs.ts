import type { TelemetryProfile } from "@/lib/telemetry/types";
import type { AdaptedUISpec } from "@/lib/genui/schema";
import { composeSpecFromTelemetry } from "@/lib/genui/composeSpec";

/**
 * When Live LLM fails/hangs: still emit a catalog-constrained custom spec
 * derived from this session's telemetry fingerprint (not a single canned UI).
 */
export function buildFallbackSpec(
  telemetry: Partial<TelemetryProfile>,
): AdaptedUISpec {
  return composeSpecFromTelemetry(telemetry);
}
