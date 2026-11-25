import type { AdaptedUISpec } from "@/lib/genui/schema";

export type GalleryVariant = {
  id: string;
  title: string;
  /** Human-readable metric band that leads here (composer + LLM heuristics). */
  metricBand: string;
  /** Short decision rule. */
  rule: string;
  spec: AdaptedUISpec;
};

const confirm = (
  title: string,
  dwell: number,
): AdaptedUISpec["nodes"][number] => ({
  node_id: "gen_confirm",
  step_title: title,
  component: "ConfirmActionButton",
  bind_to: "confirm_booking",
  props: { require_long_dwell_ms: dwell },
});

/** Canonical visual families the constrained GenUI can emit. */
export const GALLERY_VARIANTS: GalleryVariant[] = [
  {
    id: "hj-wizard-zones-pills",
    title: "High jitter · wizard · Zone cards + Pills",
    metricBand:
      "jitter_px > 10 OR overshoot_count ≥ 3; seat-map hotspot / overshoots ≥ 5 → ZoneCardSelector; midas ≥ 1 or overshoots ≥ 3 → RadioPillGrid",
    rule: "archetype=high_jitter → layout step_wizard → ZoneCardSelector + RadioPillGrid",
    spec: {
      detected_profile_archetype: "high_jitter",
      rationale:
        "High overshoots on small seats; wizard with zone cards and discrete ticket pills.",
      change_summary: [
        "step_wizard",
        "ZoneCardSelector",
        "RadioPillGrid",
        "Longer dwell + stronger snap",
      ],
      interaction_policy: {
        dwell_time_ms: 1000,
        magnetic_snap_radius_px: 32,
        one_euro_min_cutoff: 0.55,
        one_euro_beta: 0.02,
      },
      layout_config: {
        mode: "step_wizard",
        safe_zone_width_percent: 85,
        alignment: "center",
        min_target_size_px: 88,
        element_gap_px: 24,
      },
      nodes: [
        {
          node_id: "gen_seat",
          step_title: "1 · Choose zone",
          component: "ZoneCardSelector",
          bind_to: "seat_selection",
          props: { autoSeat: true },
        },
        {
          node_id: "gen_tickets",
          step_title: "2 · Ticket count",
          component: "RadioPillGrid",
          bind_to: "ticket_count",
          props: {},
        },
        confirm("3 · Confirm", 1200),
      ],
    },
  },
  {
    id: "hj-wizard-map-stepper",
    title: "High jitter · wizard · Enlarged map + Stepper",
    metricBand:
      "jitter > 10 OR overshoots ≥ 3; top hotspot seat_* or seat_map_svg > 8s; milder overshoot (<5) / midas 0 → LargeStepper favored in pool",
    rule: "high_jitter → step_wizard → InteractiveSeatMap(enlarged) + LargeStepperControl",
    spec: {
      detected_profile_archetype: "high_jitter",
      rationale:
        "Seat-map friction dominates; keep map but enlarge targets and use a large stepper.",
      change_summary: [
        "step_wizard",
        "InteractiveSeatMap enlarged",
        "LargeStepperControl",
        "Scaled dwell/snap",
      ],
      interaction_policy: {
        dwell_time_ms: 980,
        magnetic_snap_radius_px: 28,
        one_euro_min_cutoff: 0.55,
        one_euro_beta: 0.02,
      },
      layout_config: {
        mode: "step_wizard",
        safe_zone_width_percent: 82,
        alignment: "center",
        min_target_size_px: 84,
        element_gap_px: 20,
      },
      nodes: [
        {
          node_id: "gen_seat",
          step_title: "1 · Pick seats",
          component: "InteractiveSeatMap",
          bind_to: "seat_selection",
          props: { enlarged: true },
        },
        {
          node_id: "gen_tickets",
          step_title: "2 · Ticket count",
          component: "LargeStepperControl",
          bind_to: "ticket_count",
          props: {},
        },
        confirm("3 · Confirm", 1150),
      ],
    },
  },
  {
    id: "hj-column-zones-stepper",
    title: "High jitter · single column · Zones + Stepper",
    metricBand:
      "Same high_jitter band; rule composer prefers single_column_large when seat-map friction is milder",
    rule: "high_jitter → single_column_large → ZoneCardSelector + LargeStepperControl",
    spec: {
      detected_profile_archetype: "high_jitter",
      rationale:
        "High jitter with column layout — large zone cards and stepper in one scroll.",
      change_summary: [
        "single_column_large",
        "ZoneCardSelector",
        "LargeStepperControl",
        "Large min targets",
      ],
      interaction_policy: {
        dwell_time_ms: 1050,
        magnetic_snap_radius_px: 30,
        one_euro_min_cutoff: 0.55,
        one_euro_beta: 0.02,
      },
      layout_config: {
        mode: "single_column_large",
        safe_zone_width_percent: 72,
        alignment: "center",
        min_target_size_px: 90,
        element_gap_px: 22,
      },
      nodes: [
        {
          node_id: "gen_seat",
          step_title: "Choose zone",
          component: "ZoneCardSelector",
          bind_to: "seat_selection",
          props: { autoSeat: true },
        },
        {
          node_id: "gen_tickets",
          step_title: "Ticket count",
          component: "LargeStepperControl",
          bind_to: "ticket_count",
          props: {},
        },
        confirm("Confirm", 1200),
      ],
    },
  },
  {
    id: "rom-hub",
    title: "Restricted ROM · compact center hub",
    metricBand:
      "edge_struggle_zones includes outer (top_left/right, bottom_left/right, or edges) AND jitter_px ≤ 10 AND NOT (overshoots ≥ 3)",
    rule: "archetype=restricted_rom → always CompactRadialZoneHub + CompactCenterStepper",
    spec: {
      detected_profile_archetype: "restricted_rom",
      rationale:
        "Edge struggle with stable fine motor — keep everything in a small center safe zone.",
      change_summary: [
        "compact_center_hub ≤50%",
        "CompactRadialZoneHub",
        "CompactCenterStepper",
        "Confirm in cluster",
      ],
      interaction_policy: {
        dwell_time_ms: 700,
        magnetic_snap_radius_px: 18,
        one_euro_min_cutoff: 1.0,
        one_euro_beta: 0.007,
      },
      layout_config: {
        mode: "compact_center_hub",
        safe_zone_width_percent: 45,
        alignment: "center",
        min_target_size_px: 52,
        element_gap_px: 10,
      },
      nodes: [
        {
          node_id: "gen_seat",
          step_title: "Zones (center)",
          component: "CompactRadialZoneHub",
          bind_to: "seat_selection",
          props: {},
        },
        {
          node_id: "gen_tickets",
          step_title: "Tickets",
          component: "CompactCenterStepper",
          bind_to: "ticket_count",
          props: {},
        },
        confirm("Confirm", 900),
      ],
    },
  },
  {
    id: "mixed-column-map-stepper",
    title: "Mixed impairment · column · Map + Stepper",
    metricBand:
      "midas_touch_errors ≥ 2, with jitter ≤ 10 and overshoots < 3, and no outer-edge trigger (else ROM/high_jitter wins first)",
    rule: "mixed_impairment → single_column_large → InteractiveSeatMap + LargeStepperControl",
    spec: {
      detected_profile_archetype: "mixed_impairment",
      rationale:
        "Midas revisits without extreme jitter — larger map targets and a stepper reduce discrete option thrash.",
      change_summary: [
        "single_column_large",
        "InteractiveSeatMap enlarged",
        "LargeStepperControl",
        "Moderate dwell",
      ],
      interaction_policy: {
        dwell_time_ms: 900,
        magnetic_snap_radius_px: 26,
        one_euro_min_cutoff: 0.8,
        one_euro_beta: 0.015,
      },
      layout_config: {
        mode: "single_column_large",
        safe_zone_width_percent: 70,
        alignment: "center",
        min_target_size_px: 72,
        element_gap_px: 18,
      },
      nodes: [
        {
          node_id: "gen_seat",
          step_title: "Seats",
          component: "InteractiveSeatMap",
          bind_to: "seat_selection",
          props: { enlarged: true },
        },
        {
          node_id: "gen_tickets",
          step_title: "Tickets",
          component: "LargeStepperControl",
          bind_to: "ticket_count",
          props: {},
        },
        confirm("Confirm", 1100),
      ],
    },
  },
  {
    id: "base-column-map-dropdown",
    title: "Baseline sufficient · mild enlarge + Dropdown",
    metricBand:
      "jitter ≤ 10, overshoots < 3, midas < 2, and no outer edge_struggle (or jitter low enough that ROM/high don't fire)",
    rule: "baseline_sufficient → often InteractiveSeatMap + DropdownSelect",
    spec: {
      detected_profile_archetype: "baseline_sufficient",
      rationale:
        "No strong motor friction — light enlargement while keeping familiar dropdown ticket control.",
      change_summary: [
        "single_column_large",
        "InteractiveSeatMap enlarged",
        "DropdownSelect",
        "Mild dwell/snap",
      ],
      interaction_policy: {
        dwell_time_ms: 750,
        magnetic_snap_radius_px: 20,
        one_euro_min_cutoff: 1.0,
        one_euro_beta: 0.01,
      },
      layout_config: {
        mode: "single_column_large",
        safe_zone_width_percent: 75,
        alignment: "top_center",
        min_target_size_px: 56,
        element_gap_px: 14,
      },
      nodes: [
        {
          node_id: "gen_seat",
          step_title: "Seats",
          component: "InteractiveSeatMap",
          bind_to: "seat_selection",
          props: { enlarged: true },
        },
        {
          node_id: "gen_tickets",
          step_title: "Tickets",
          component: "DropdownSelect",
          bind_to: "ticket_count",
          props: {},
        },
        confirm("Confirm", 800),
      ],
    },
  },
  {
    id: "base-wizard-zones-stepper",
    title: "Baseline sufficient · wizard · Zones + Stepper",
    metricBand:
      "Same calm metrics as baseline; deterministic gallery variant showing an optional mild wizard upgrade",
    rule: "baseline_sufficient → step_wizard → ZoneCardSelector + LargeStepperControl",
    spec: {
      detected_profile_archetype: "baseline_sufficient",
      rationale:
        "Calm telemetry but composer still offers a clearer wizard as a mild ability-based upgrade.",
      change_summary: [
        "step_wizard",
        "ZoneCardSelector",
        "LargeStepperControl",
        "Mild policy",
      ],
      interaction_policy: {
        dwell_time_ms: 780,
        magnetic_snap_radius_px: 18,
        one_euro_min_cutoff: 1.0,
        one_euro_beta: 0.01,
      },
      layout_config: {
        mode: "step_wizard",
        safe_zone_width_percent: 80,
        alignment: "center",
        min_target_size_px: 60,
        element_gap_px: 16,
      },
      nodes: [
        {
          node_id: "gen_seat",
          step_title: "1 · Choose zone",
          component: "ZoneCardSelector",
          bind_to: "seat_selection",
          props: { autoSeat: true },
        },
        {
          node_id: "gen_tickets",
          step_title: "2 · Ticket count",
          component: "LargeStepperControl",
          bind_to: "ticket_count",
          props: {},
        },
        confirm("3 · Confirm", 850),
      ],
    },
  },
];

export function getGalleryVariant(id: string): GalleryVariant | undefined {
  return GALLERY_VARIANTS.find((v) => v.id === id);
}
