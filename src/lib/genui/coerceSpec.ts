/** Best-effort coerce of common LLM type slips before Zod. */

const POLICY_DEFAULTS = {
  dwell_time_ms: 800,
  magnetic_snap_radius_px: 18,
  one_euro_min_cutoff: 0.85,
  one_euro_beta: 0.01,
} as const;

const LAYOUT_DEFAULTS = {
  mode: "single_column_large",
  safe_zone_width_percent: 70,
  alignment: "center",
  min_target_size_px: 64,
  element_gap_px: 16,
} as const;

export function coerceAdaptedSpecCandidate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  if (typeof obj.change_summary === "string") {
    obj.change_summary = (obj.change_summary as string)
      .split(/\n|•|-/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
  }
  if (!Array.isArray(obj.change_summary) || obj.change_summary.length < 2) {
    obj.change_summary = [
      "Adapted layout for measured motor friction",
      "Larger targets / adjusted dwell from telemetry",
    ];
  }

  if (!obj.interaction_policy || typeof obj.interaction_policy !== "object") {
    obj.interaction_policy = { ...POLICY_DEFAULTS };
  } else {
    obj.interaction_policy = {
      ...POLICY_DEFAULTS,
      ...coerceNums(obj.interaction_policy as Record<string, unknown>, [
        "dwell_time_ms",
        "magnetic_snap_radius_px",
        "one_euro_min_cutoff",
        "one_euro_beta",
      ]),
    };
  }

  if (!obj.layout_config || typeof obj.layout_config !== "object") {
    obj.layout_config = { ...LAYOUT_DEFAULTS };
  } else {
    const layout = {
      ...LAYOUT_DEFAULTS,
      ...(obj.layout_config as Record<string, unknown>),
    };
    obj.layout_config = coerceNums(layout, [
      "safe_zone_width_percent",
      "min_target_size_px",
      "element_gap_px",
    ]);
  }

  if (Array.isArray(obj.nodes)) {
    obj.nodes = obj.nodes.map((n, i) => {
      if (!n || typeof n !== "object") return n;
      const node = { ...(n as Record<string, unknown>) };
      if (!node.props || typeof node.props !== "object") node.props = {};
      if (typeof node.node_id !== "string" || !node.node_id) {
        node.node_id = `gen_node_${i}`;
      }
      if (typeof node.step_title !== "string" || !node.step_title) {
        node.step_title = `Step ${i + 1}`;
      }
      // Flash-Lite sometimes nests require_long_dwell_ms as string
      const props = { ...(node.props as Record<string, unknown>) };
      if (typeof props.require_long_dwell_ms === "string") {
        const n = Number(props.require_long_dwell_ms);
        if (!Number.isNaN(n)) props.require_long_dwell_ms = n;
      }
      node.props = props;
      return node;
    });
  }

  if (typeof obj.rationale !== "string" || !obj.rationale.trim()) {
    obj.rationale =
      "Adapted UI chosen from telemetry friction signals using the constrained GenUI catalog.";
  }

  return obj;
}

function coerceNums(
  record: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out = { ...record };
  for (const k of keys) {
    const v = out[k];
    if (v === undefined || v === null || v === "") {
      continue;
    }
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      out[k] = Number(v);
    }
  }
  // Drop non-finite leftovers so defaults can fill via spread earlier
  for (const k of keys) {
    const v = out[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      delete out[k];
    }
  }
  return out;
}
