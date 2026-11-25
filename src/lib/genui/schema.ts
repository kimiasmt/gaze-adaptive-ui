import { z } from "zod";

export const InteractionPolicySchema = z.object({
  dwell_time_ms: z.number().min(450).max(1500),
  magnetic_snap_radius_px: z.number().min(0).max(48),
  one_euro_min_cutoff: z.number().min(0.1).max(3.0),
  one_euro_beta: z.number().min(0.0).max(0.5),
});

export const LayoutConfigSchema = z.object({
  mode: z.enum(["step_wizard", "compact_center_hub", "single_column_large"]),
  safe_zone_width_percent: z.number().min(35).max(95),
  alignment: z.enum(["center", "top_center"]),
  min_target_size_px: z.number().min(44).max(120),
  element_gap_px: z.number().min(6).max(36),
});

export const ComponentNameSchema = z.enum([
  "InteractiveSeatMap",
  "ZoneCardSelector",
  "CompactRadialZoneHub",
  "DropdownSelect",
  "LargeStepperControl",
  "RadioPillGrid",
  "CompactCenterStepper",
  "ConfirmActionButton",
]);

export const UINodeSchema = z.object({
  node_id: z.string(),
  step_title: z.string(),
  component: ComponentNameSchema,
  bind_to: z.enum(["seat_selection", "ticket_count", "confirm_booking"]),
  props: z.record(z.string(), z.any()),
});

export const AdaptedUISpecSchema = z.object({
  detected_profile_archetype: z.enum([
    "high_jitter",
    "restricted_rom",
    "mixed_impairment",
    "baseline_sufficient",
  ]),
  rationale: z
    .string()
    .describe(
      "2-3 plain-English sentences explaining what friction was detected and why these UI changes help.",
    ),
  change_summary: z.array(z.string()).min(2).max(4),
  interaction_policy: InteractionPolicySchema,
  layout_config: LayoutConfigSchema,
  nodes: z.array(UINodeSchema).min(2).max(4),
});

export type AdaptedUISpec = z.infer<typeof AdaptedUISpecSchema>;
export type UINode = z.infer<typeof UINodeSchema>;
export type ComponentName = z.infer<typeof ComponentNameSchema>;
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>;

export const COMPONENT_CATALOG = [
  "InteractiveSeatMap",
  "ZoneCardSelector",
  "CompactRadialZoneHub",
  "DropdownSelect",
  "LargeStepperControl",
  "RadioPillGrid",
  "CompactCenterStepper",
  "ConfirmActionButton",
] as const;

export const TASK_SCHEMA = {
  task_id: "concert_ticket_booking",
  steps: [
    { id: "seat_selection", label: "Select Seat/Zone" },
    { id: "ticket_count", label: "Ticket Count" },
    { id: "confirm_booking", label: "Confirm Booking" },
  ],
  component_catalog: COMPONENT_CATALOG,
} as const;

export const AdaptRequestSchema = z.object({
  telemetryProfile: z.record(z.string(), z.any()),
  taskSchema: z.record(z.string(), z.any()).optional(),
});
