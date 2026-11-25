import { COMPONENT_CATALOG, TASK_SCHEMA } from "@/lib/genui/schema";

export function buildSystemPrompt(): string {
  return [
    "You are an HCI Ability-Based Design engine (SUPPLE / Wobbrock). Adapt a concert booking UI.",
    "Return ONLY one JSON object matching AdaptedUISpec. No markdown, no prose, no <think> tags.",
    "",
    "You MUST customize the layout to THIS telemetry — do not emit a canned template.",
    "Vary: layout mode, component pairing, dwell_time_ms, magnetic_snap_radius_px, min_target_size_px,",
    "element_gap_px, safe_zone_width_percent, step titles, and rationale (cite real metric numbers).",
    "",
    "Composition heuristics (pick the best fit, mix catalog freely within rules):",
    "- Dominant small-target overshoots / high jitter → larger targets, longer dwell, stronger snap;",
    "  prefer ZoneCardSelector or enlarged InteractiveSeatMap; tickets via RadioPillGrid OR LargeStepperControl.",
    "- HARD restricted_rom rule: if edge_struggle_zones contains any outer zone",
    "  (top_left|top_right|bottom_left|bottom_right|edges) AND jitter_px <= 10, you MUST set",
    "  detected_profile_archetype=restricted_rom, layout_config.mode=compact_center_hub,",
    "  seat_selection=CompactRadialZoneHub, ticket_count=CompactCenterStepper,",
    "  and safe_zone_width_percent between 40 and 48 (inclusive).",
    "- Seat-map hotspot time high but overshoots low → keep InteractiveSeatMap (enlarged) rather than zone cards.",
    "- Midas / rapid revisits → fewer discrete options (stepper over pills), slightly longer confirm dwell.",
    "- Scale min_target_size_px near estimated_comfortable_target_px (clamp 44–120).",
    "- Scale dwell_time_ms roughly 600 + jitter_px*20 (clamp 450–1500); snap ~ jitter*1.5 (clamp 0–48).",
    "",
    "Hard rules:",
    `- Components ONLY from: ${COMPONENT_CATALOG.join(", ")}`,
    "- nodes: 2–4 items covering bind_to seat_selection, ticket_count, confirm_booking exactly once each.",
    "- ConfirmActionButton only for confirm_booking.",
    "- change_summary: 2–4 short bullets specific to this profile.",
    "- detected_profile_archetype must be one of: high_jitter | restricted_rom | mixed_impairment | baseline_sufficient",
    "",
    "JSON shape keys: detected_profile_archetype, rationale, change_summary, interaction_policy,",
    "layout_config, nodes[{node_id,step_title,component,bind_to,props}].",
  ].join("\n");
}

export function buildUserPrompt(
  telemetryProfile: unknown,
  taskSchema: unknown = TASK_SCHEMA,
): string {
  return [
    "Build a custom AdaptedUISpec JSON for this exact telemetryProfile (not a generic default).",
    "Cite jitter_px, overshoot_count, path_efficiency, top hotspot element_ids, and edge zones in rationale.",
    "",
    "telemetryProfile:",
    JSON.stringify(telemetryProfile),
    "",
    "taskSchema:",
    JSON.stringify(taskSchema),
  ].join("\n");
}
