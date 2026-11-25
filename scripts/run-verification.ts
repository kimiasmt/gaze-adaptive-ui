/**
 * 10-profile synthetic algorithmic verification (NOT a human study).
 * Usage: npx tsx --tsconfig tsconfig.json scripts/run-verification.ts
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SYNTHETIC_PROFILES } from "../src/lib/verification/syntheticProfiles";
import { simulateProfileTelemetry } from "../src/lib/verification/simulateTrajectory";
import { composeSpecFromTelemetry } from "../src/lib/genui/composeSpec";
import { runAdapt } from "../src/lib/genui/runAdapt";
import { compareBaselineVsAdapted } from "../src/lib/telemetry/fitts";
import { AdaptedUISpecSchema } from "../src/lib/genui/schema";
import {
  chartDecisionSpace,
  chartFittsCost,
  chartLlmReliability,
} from "../src/lib/verification/charts";
import type { VerificationRow } from "../src/lib/verification/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outDir = resolve(root, "docs/verification");

function loadEnvLocal() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) return;
  const text = readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1]!;
    let val = m[2]!.trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function edgePressure(zones: string[]): number {
  return zones.filter((z) =>
    ["top_left", "top_right", "bottom_left", "bottom_right", "edges"].includes(
      z,
    ),
  ).length;
}

function toCsv(rows: VerificationRow[]): string {
  const keys = Object.keys(rows[0] ?? {}) as (keyof VerificationRow)[];
  const header = keys.join(",");
  const body = rows
    .map((r) =>
      keys
        .map((k) => {
          const v = r[k];
          const s = v == null ? "" : String(v);
          return s.includes(",") || s.includes('"')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

async function main() {
  loadEnvLocal();
  mkdirSync(outDir, { recursive: true });

  const hasKey = Boolean(
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
      process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY?.trim(),
  );
  console.log(
    hasKey
      ? "Mode: Live Gemini API (plus deterministic composer routing check)"
      : "Mode: Deterministic Rule Composer (no NEXT_PUBLIC_GEMINI_API_KEY)",
  );
  console.log(
    "NOTE: S01–S10 are synthetic algorithmic profiles — NOT human participants.\n",
  );

  const rows: VerificationRow[] = [];

  for (const def of SYNTHETIC_PROFILES) {
    process.stdout.write(`→ ${def.id} ${def.label} … `);
    const telemetry = simulateProfileTelemetry(def);
    const composed = composeSpecFromTelemetry(telemetry);
    const adapt = await runAdapt(telemetry);
    const zod_ok = AdaptedUISpecSchema.safeParse(adapt.spec).success;
    const fitts = compareBaselineVsAdapted(adapt.spec);
    const seat =
      adapt.spec.nodes.find((n) => n.bind_to === "seat_selection")?.component ??
      "";
    const tickets =
      adapt.spec.nodes.find((n) => n.bind_to === "ticket_count")?.component ??
      "";

    const composer_archetype = composed.detected_profile_archetype;
    const final_spec_archetype = adapt.spec.detected_profile_archetype;
    const row: VerificationRow = {
      id: def.id,
      label: def.label,
      kind: def.kind,
      expected_archetype: def.expected_archetype,
      composer_archetype,
      final_spec_archetype,
      routed_archetype: composer_archetype,
      archetype_match: composer_archetype === def.expected_archetype,
      jitter_px: telemetry.jitter_px,
      overshoot_count: telemetry.overshoot_count,
      midas_touch_errors: telemetry.midas_touch_errors,
      path_efficiency: telemetry.path_efficiency,
      edge_pressure: edgePressure(telemetry.edge_struggle_zones),
      edge_struggle_zones: telemetry.edge_struggle_zones.join("|"),
      adapt_mode: adapt.mode,
      zod_ok,
      coerced: Boolean(adapt.coerced),
      fallback: Boolean(adapt.used_fallback) || adapt.mode !== "Live LLM",
      latency_ms: adapt.latency_ms ?? 0,
      baseline_id_bits: fitts.baseline.total_id_bits,
      adapted_id_bits: fitts.adapted.total_id_bits,
      baseline_travel_px: fitts.baseline.total_travel_px,
      adapted_travel_px: fitts.adapted.total_travel_px,
      baseline_neck_pct: fitts.baseline.peak_neck_excursion_pct,
      adapted_neck_pct: fitts.adapted.peak_neck_excursion_pct,
      baseline_w_min: fitts.baseline.w_min_px,
      adapted_w_min: fitts.adapted.w_min_px,
      layout_mode: adapt.spec.layout_config.mode,
      seat_component: seat,
      ticket_component: tickets,
      error: adapt.error,
    };
    rows.push(row);
    console.log(
      `composer=${composer_archetype}${row.archetype_match ? " ✓" : " ✗"} · final=${final_spec_archetype} · ${row.layout_mode} · ${row.adapt_mode} · ID ${row.baseline_id_bits}→${row.adapted_id_bits}`,
    );
  }

  writeFileSync(resolve(outDir, "results.json"), JSON.stringify({
    generated_at: new Date().toISOString(),
    disclaimer:
      "Synthetic algorithmic verification & theoretical Fitts motor-cost modeling. Not human-subject data.",
    llm_key_present: hasKey,
    rows,
  }, null, 2));
  writeFileSync(resolve(outDir, "results.csv"), toCsv(rows));
  writeFileSync(
    resolve(outDir, "chart-decision-space.svg"),
    chartDecisionSpace(rows),
  );
  writeFileSync(resolve(outDir, "chart-fitts-cost.svg"), chartFittsCost(rows));
  writeFileSync(
    resolve(outDir, "chart-llm-reliability.svg"),
    chartLlmReliability(rows),
  );

  const matchRate =
    rows.filter((r) => r.archetype_match).length / rows.length;
  console.log(`\nWrote docs/verification/*`);
  console.log(`Archetype routing accuracy: ${(matchRate * 100).toFixed(0)}%`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
