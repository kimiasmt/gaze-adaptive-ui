import type { TelemetryProfile } from "@/lib/telemetry/types";
import type { AdaptedUISpec, ComponentName } from "@/lib/genui/schema";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function topHotspot(telemetry: Partial<TelemetryProfile>) {
  return [...(telemetry.hotspot_frictions ?? [])].sort(
    (a, b) => b.time_spent_sec - a.time_spent_sec,
  )[0];
}

function hasOuterEdge(edges: string[]): boolean {
  return edges.some((z) =>
    ["top_left", "top_right", "bottom_left", "bottom_right", "edges"].includes(
      z,
    ),
  );
}

/**
 * Deterministic, metric-justified composer (no hash lottery).
 * Same telemetry fingerprint → same AdaptedUISpec.
 */
export function composeSpecFromTelemetry(
  telemetry: Partial<TelemetryProfile>,
): AdaptedUISpec {
  const jitter = telemetry.jitter_px ?? 0;
  const overshoots = telemetry.overshoot_count ?? 0;
  const midas = telemetry.midas_touch_errors ?? 0;
  const pathEff = telemetry.path_efficiency ?? 1;
  const edges = telemetry.edge_struggle_zones ?? [];
  const comfort = telemetry.estimated_comfortable_target_px ?? 56;
  const top = topHotspot(telemetry);
  const seatMapSec =
    telemetry.hotspot_frictions?.find((h) => h.element_id === "seat_map_svg")
      ?.time_spent_sec ?? 0;
  const outer = hasOuterEdge(edges);

  let archetype: AdaptedUISpec["detected_profile_archetype"] =
    "baseline_sufficient";
  // Fully rule-based, explainable, no hash lottery.
  if (jitter > 14 || (overshoots >= 4 && midas < 2)) {
    archetype = "high_jitter";
  } else if (outer && jitter <= 10 && midas < 2 && overshoots < 3) {
    archetype = "restricted_rom";
  } else if (midas >= 2 && (jitter > 5 || pathEff < 0.55 || overshoots >= 2)) {
    archetype = "mixed_impairment";
  } else if (jitter > 10 || overshoots >= 4) {
    archetype = "high_jitter";
  } else if (midas >= 2 || (jitter > 7 && pathEff < 0.4)) {
    archetype = "mixed_impairment";
  }

  let layoutMode: AdaptedUISpec["layout_config"]["mode"] = "single_column_large";
  let seat: { component: ComponentName; props: Record<string, unknown>; title: string };
  let tickets: {
    component: ComponentName;
    props: Record<string, unknown>;
    title: string;
  };

  if (archetype === "restricted_rom") {
    layoutMode = "compact_center_hub";
    seat = {
      component: "CompactRadialZoneHub",
      props: {},
      title: "Zones (center)",
    };
    tickets = {
      component: "CompactCenterStepper",
      props: {},
      title: "Tickets",
    };
  } else if (archetype === "high_jitter") {
    // High tremor + seat-map friction → spaced wizard with large zone cards + pills.
    const seatMapHard =
      seatMapSec > 6 || overshoots >= 3 || top?.element_id?.startsWith("seat_");
    layoutMode =
      seatMapHard || pathEff < 0.45 || overshoots >= 3
        ? "step_wizard"
        : "single_column_large";
    seat = seatMapHard
      ? {
          component: "ZoneCardSelector",
          props: { autoSeat: true },
          title: "Choose zone",
        }
      : {
          component: "InteractiveSeatMap",
          props: { enlarged: true },
          title: "Pick seats",
        };
    tickets =
      seatMapHard || midas >= 1 || overshoots >= 3
        ? {
            component: "RadioPillGrid",
            props: {},
            title: "Ticket count",
          }
        : {
            component: "LargeStepperControl",
            props: {},
            title: "Ticket count",
          };
  } else if (archetype === "mixed_impairment") {
    layoutMode = "step_wizard";
    seat = {
      component: "ZoneCardSelector",
      props: { autoSeat: true },
      title: "Zone / seats",
    };
    tickets = {
      component: "RadioPillGrid",
      props: {},
      title: "Tickets",
    };
  } else {
    layoutMode = "single_column_large";
    seat = {
      component: "InteractiveSeatMap",
      props: { enlarged: comfort >= 56 },
      title: "Seats",
    };
    tickets = {
      component: "DropdownSelect",
      props: {},
      title: "Tickets",
    };
  }

  const floorTarget =
    archetype === "high_jitter"
      ? 80
      : archetype === "mixed_impairment"
        ? 64
        : archetype === "restricted_rom"
          ? 48
          : 52;
  const minTarget = clamp(Math.round(Math.max(comfort, floorTarget)), 44, 120);
  const dwell = clamp(Math.round(600 + jitter * 24 + overshoots * 12), 450, 1500);
  const snap = clamp(Math.round(10 + jitter * 1.5 + overshoots), 0, 48);
  const gap = clamp(
    Math.round((layoutMode === "compact_center_hub" ? 8 : 14) + jitter * 0.4),
    6,
    36,
  );
  const safe = clamp(
    layoutMode === "compact_center_hub"
      ? 42
      : layoutMode === "step_wizard"
        ? 78
        : 68,
    35,
    95,
  );
  const confirmDwell = clamp(dwell + 120 + midas * 40, 700, 1400);

  return {
    detected_profile_archetype: archetype,
    rationale: `Deterministic GenUI from metrics: jitter ${jitter.toFixed(1)}px, ${overshoots} overshoots, midas ${midas}, path ${pathEff.toFixed(2)}, edges [${edges.slice(0, 3).join(", ") || "none"}]${top ? `, top ${top.element_id}` : ""}. Archetype ${archetype} → ${layoutMode} + ${seat.component} + ${tickets.component} (targets ~${minTarget}px, dwell ${dwell}ms).`,
    change_summary: [
      `${layoutMode} · target ~${minTarget}px · gap ${gap}px`,
      `Seat/zone: ${seat.component}`,
      `Tickets: ${tickets.component}`,
      `Policy dwell ${dwell}ms / snap ${snap}px`,
    ],
    interaction_policy: {
      dwell_time_ms: dwell,
      magnetic_snap_radius_px: snap,
      one_euro_min_cutoff: clamp(
        archetype === "high_jitter"
          ? 0.5
          : archetype === "restricted_rom"
            ? 1.05
            : 0.85,
        0.1,
        3,
      ),
      one_euro_beta: clamp(archetype === "high_jitter" ? 0.022 : 0.01, 0, 0.5),
    },
    layout_config: {
      mode: layoutMode,
      safe_zone_width_percent: safe,
      alignment:
        layoutMode === "single_column_large" &&
        archetype === "baseline_sufficient"
          ? "top_center"
          : "center",
      min_target_size_px: minTarget,
      element_gap_px: gap,
    },
    nodes:
      // Seat-map flows: tickets first so count is known before picking seats
      seat.component === "InteractiveSeatMap"
        ? [
            {
              node_id: "gen_tickets",
              step_title:
                layoutMode === "step_wizard"
                  ? `1 · ${tickets.title}`
                  : tickets.title,
              component: tickets.component,
              bind_to: "ticket_count" as const,
              props: tickets.props,
            },
            {
              node_id: "gen_seat",
              step_title:
                layoutMode === "step_wizard" ? `2 · ${seat.title}` : seat.title,
              component: seat.component,
              bind_to: "seat_selection" as const,
              props: seat.props,
            },
            {
              node_id: "gen_confirm",
              step_title:
                layoutMode === "step_wizard" ? "3 · Confirm" : "Confirm",
              component: "ConfirmActionButton" as const,
              bind_to: "confirm_booking" as const,
              props: { require_long_dwell_ms: confirmDwell },
            },
          ]
        : [
            {
              node_id: "gen_seat",
              step_title:
                layoutMode === "step_wizard" ? `1 · ${seat.title}` : seat.title,
              component: seat.component,
              bind_to: "seat_selection" as const,
              props: seat.props,
            },
            {
              node_id: "gen_tickets",
              step_title:
                layoutMode === "step_wizard"
                  ? `2 · ${tickets.title}`
                  : tickets.title,
              component: tickets.component,
              bind_to: "ticket_count" as const,
              props: tickets.props,
            },
            {
              node_id: "gen_confirm",
              step_title:
                layoutMode === "step_wizard" ? "3 · Confirm" : "Confirm",
              component: "ConfirmActionButton" as const,
              bind_to: "confirm_booking" as const,
              props: { require_long_dwell_ms: confirmDwell },
            },
          ],
  };
}

export function composeCrowdSpec(
  sessions: Partial<TelemetryProfile>[],
): AdaptedUISpec {
  if (!sessions.length) {
    return composeSpecFromTelemetry({
      jitter_px: 12,
      overshoot_count: 4,
      midas_touch_errors: 1,
      path_efficiency: 0.4,
      edge_struggle_zones: ["edges"],
      estimated_comfortable_target_px: 72,
      hotspot_frictions: [],
      sample_count: 1200,
    });
  }
  const n = sessions.length;
  const avg = {
    jitter_px: sessions.reduce((s, p) => s + (p.jitter_px ?? 0), 0) / n,
    overshoot_count: Math.round(
      sessions.reduce((s, p) => s + (p.overshoot_count ?? 0), 0) / n,
    ),
    midas_touch_errors: Math.round(
      sessions.reduce((s, p) => s + (p.midas_touch_errors ?? 0), 0) / n,
    ),
    path_efficiency:
      sessions.reduce((s, p) => s + (p.path_efficiency ?? 1), 0) / n,
    edge_struggle_zones: Array.from(
      new Set(sessions.flatMap((p) => p.edge_struggle_zones ?? [])),
    ),
    estimated_comfortable_target_px: Math.round(
      sessions.reduce(
        (s, p) => s + (p.estimated_comfortable_target_px ?? 56),
        0,
      ) / n,
    ),
    hotspot_frictions: sessions
      .flatMap((p) => p.hotspot_frictions ?? [])
      .slice(0, 12),
    sample_count: Math.round(
      sessions.reduce((s, p) => s + (p.sample_count ?? 0), 0) / n,
    ),
    friction_threshold_crossed: true,
  };
  // Mild conservative bias toward safer targets — not a claim that crowd > personal.
  const biased = {
    ...avg,
    jitter_px: avg.jitter_px * 1.08,
    estimated_comfortable_target_px: Math.min(
      110,
      avg.estimated_comfortable_target_px + 4,
    ),
  };
  const spec = composeSpecFromTelemetry(biased);
  return {
    ...spec,
    rationale: `Crowd layout from ${n} prior session${n === 1 ? "" : "s"} (avg jitter ${avg.jitter_px.toFixed(1)}px, avg overshoots ${avg.overshoot_count}). ${spec.rationale}`,
    change_summary: [
      `Aggregated from ${n} sessions`,
      ...spec.change_summary.slice(0, 3),
    ],
  };
}
