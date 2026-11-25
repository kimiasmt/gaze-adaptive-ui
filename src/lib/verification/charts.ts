import type { VerificationRow } from "@/lib/verification/types";

const BG = "#0f1419";
const AMBER = "#ffc174";
const MINT = "#4edea3";
const BLUE = "#6ec8ff";
const CREAM = "#d8c3ad";
const MUTED = "#a08e7a";
const CARD = "#12171d";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function chartDecisionSpace(rows: VerificationRow[]): string {
  const W = 720;
  const H = 480;
  const pad = { l: 64, r: 24, t: 48, b: 56 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const maxJ = Math.max(28, ...rows.map((r) => r.jitter_px));
  const maxE = Math.max(4, ...rows.map((r) => r.edge_pressure));

  const colors: Record<string, string> = {
    high_jitter: AMBER,
    restricted_rom: MINT,
    mixed_impairment: BLUE,
    baseline_sufficient: CREAM,
  };

  const pts = rows
    .map((r) => {
      const x = pad.l + (r.jitter_px / maxJ) * plotW;
      const y = pad.t + plotH - (r.edge_pressure / maxE) * plotH;
      const c = colors[r.routed_archetype] ?? CREAM;
      return `<g>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${c}" fill-opacity="0.85" stroke="${BG}" stroke-width="2"/>
        <text x="${(x + 12).toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="${CREAM}" font-size="11" font-family="ui-monospace,monospace">${esc(r.id)}</text>
      </g>`;
    })
    .join("\n");

  const legend = Object.entries(colors)
    .map(([k, c], i) => {
      const x = pad.l + i * 160;
      return `<circle cx="${x}" cy="${H - 18}" r="5" fill="${c}"/><text x="${x + 10}" y="${H - 14}" fill="${MUTED}" font-size="10" font-family="system-ui">${esc(k)}</text>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="${pad.l}" y="28" fill="${AMBER}" font-size="16" font-family="system-ui" font-weight="600">Decision space · synthetic S01–S10</text>
  <text x="${pad.l}" y="44" fill="${MUTED}" font-size="11" font-family="system-ui">jitter_px vs edge_pressure (NOT human participants)</text>
  <rect x="${pad.l}" y="${pad.t}" width="${plotW}" height="${plotH}" fill="${CARD}" stroke="#534434" stroke-opacity="0.4"/>
  <text x="${pad.l + plotW / 2}" y="${H - 32}" fill="${MUTED}" font-size="11" text-anchor="middle" font-family="system-ui">jitter_px →</text>
  <text x="18" y="${pad.t + plotH / 2}" fill="${MUTED}" font-size="11" transform="rotate(-90 18 ${pad.t + plotH / 2})" font-family="system-ui">edge_pressure →</text>
  ${pts}
  ${legend}
</svg>`;
}

export function chartFittsCost(rows: VerificationRow[]): string {
  const W = 820;
  const rowH = 36;
  const H = 70 + rows.length * rowH + 40;
  const padL = 70;
  const barMax = 480;
  const maxId = Math.max(
    1,
    ...rows.flatMap((r) => [r.baseline_id_bits, r.adapted_id_bits]),
  );

  const bars = rows
    .map((r, i) => {
      const y = 58 + i * rowH;
      const bW = (r.baseline_id_bits / maxId) * barMax;
      const aW = (r.adapted_id_bits / maxId) * barMax;
      return `<g>
        <text x="12" y="${y + 14}" fill="${CREAM}" font-size="12" font-family="ui-monospace,monospace">${esc(r.id)}</text>
        <rect x="${padL}" y="${y}" width="${bW.toFixed(1)}" height="12" rx="3" fill="${AMBER}" fill-opacity="0.75"/>
        <rect x="${padL}" y="${y + 14}" width="${aW.toFixed(1)}" height="12" rx="3" fill="${MINT}" fill-opacity="0.85"/>
        <text x="${padL + barMax + 8}" y="${y + 11}" fill="${MUTED}" font-size="10" font-family="ui-monospace,monospace">B ${r.baseline_id_bits.toFixed(2)} / A ${r.adapted_id_bits.toFixed(2)} bits · neck ${r.baseline_neck_pct.toFixed(0)}%→${r.adapted_neck_pct.toFixed(0)}%</text>
      </g>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="16" y="26" fill="${AMBER}" font-size="16" font-family="system-ui" font-weight="600">Fitts's Law motor cost · Baseline vs Adapted</text>
  <text x="16" y="44" fill="${MUTED}" font-size="11" font-family="system-ui">Σ log₂(D/W+1) bits · theoretical geometry (synthetic verification)</text>
  <rect x="16" y="${H - 28}" width="12" height="12" rx="2" fill="${AMBER}" fill-opacity="0.75"/>
  <text x="34" y="${H - 18}" fill="${MUTED}" font-size="10" font-family="system-ui">Baseline</text>
  <rect x="100" y="${H - 28}" width="12" height="12" rx="2" fill="${MINT}" fill-opacity="0.85"/>
  <text x="118" y="${H - 18}" fill="${MUTED}" font-size="10" font-family="system-ui">Adapted</text>
  ${bars}
</svg>`;
}

export function chartLlmReliability(rows: VerificationRow[]): string {
  const W = 720;
  const H = 320;
  const routed = rows.filter((r) => r.archetype_match).length;
  const zodOk = rows.filter((r) => r.zod_ok).length;
  const live = rows.filter((r) => r.adapt_mode === "Live LLM").length;
  const avgScale =
    rows.reduce((a, r) => a + r.adapted_w_min / Math.max(1, r.baseline_w_min), 0) /
    rows.length;

  const metrics = [
    { label: "Archetype routing accuracy", value: routed / rows.length, color: MINT },
    { label: "Zod schema validation pass", value: zodOk / rows.length, color: BLUE },
    { label: "Live LLM share (if key present)", value: live / rows.length, color: AMBER },
    {
      label: "Mean W_min scale (Adapted / Baseline)",
      value: Math.min(1, avgScale / 4),
      color: CREAM,
      display: `${avgScale.toFixed(2)}×`,
    },
  ];

  const blocks = metrics
    .map((m, i) => {
      const y = 70 + i * 55;
      const w = 520 * m.value;
      const pct = m.display ?? `${(m.value * 100).toFixed(0)}%`;
      return `<g>
        <text x="24" y="${y}" fill="${CREAM}" font-size="13" font-family="system-ui">${esc(m.label)}</text>
        <rect x="24" y="${y + 8}" width="520" height="16" rx="8" fill="${CARD}"/>
        <rect x="24" y="${y + 8}" width="${w.toFixed(1)}" height="16" rx="8" fill="${m.color}"/>
        <text x="556" y="${y + 20}" fill="${AMBER}" font-size="12" font-family="ui-monospace,monospace">${esc(pct)}</text>
      </g>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="24" y="28" fill="${AMBER}" font-size="16" font-family="system-ui" font-weight="600">Routing &amp; schema reliability · S01–S10</text>
  <text x="24" y="48" fill="${MUTED}" font-size="11" font-family="system-ui">Synthetic algorithmic verification — not a human study</text>
  ${blocks}
</svg>`;
}
