/**
 * Synthetic algorithmic motor profiles for offline verification.
 * These are NOT human participants.
 */

export type SyntheticKind =
  | "high_jitter"
  | "restricted_rom"
  | "mixed_impairment"
  | "baseline_sufficient";

export type SyntheticProfileDef = {
  id: string;
  label: string;
  kind: SyntheticKind;
  /** Expected archetype from composeSpec / runAdapt routing. */
  expected_archetype: SyntheticKind;
  tremor_amp_px: number;
  /** Comfortable central box as fraction of viewport (1 = full ROM). */
  rom_box_frac: number;
  midas_bias: number;
  path_efficiency_bias: number;
  overshoot_bias: number;
};

export const SYNTHETIC_PROFILES: SyntheticProfileDef[] = [
  {
    id: "S01",
    label: "Mild High Jitter / Tremor",
    kind: "high_jitter",
    expected_archetype: "high_jitter",
    tremor_amp_px: 12,
    rom_box_frac: 1,
    midas_bias: 0,
    path_efficiency_bias: 0.55,
    overshoot_bias: 3,
  },
  {
    id: "S02",
    label: "Moderate High Jitter / Tremor",
    kind: "high_jitter",
    expected_archetype: "high_jitter",
    tremor_amp_px: 18,
    rom_box_frac: 1,
    midas_bias: 1,
    path_efficiency_bias: 0.4,
    overshoot_bias: 5,
  },
  {
    id: "S03",
    label: "Severe High Jitter / Tremor",
    kind: "high_jitter",
    expected_archetype: "high_jitter",
    tremor_amp_px: 24,
    rom_box_frac: 1,
    midas_bias: 1,
    path_efficiency_bias: 0.28,
    overshoot_bias: 8,
  },
  {
    id: "S04",
    label: "Mild Restricted Neck ROM",
    kind: "restricted_rom",
    expected_archetype: "restricted_rom",
    tremor_amp_px: 2.5,
    rom_box_frac: 0.55,
    midas_bias: 0,
    path_efficiency_bias: 0.7,
    overshoot_bias: 0,
  },
  {
    id: "S05",
    label: "Moderate Restricted Neck ROM",
    kind: "restricted_rom",
    expected_archetype: "restricted_rom",
    tremor_amp_px: 3,
    rom_box_frac: 0.45,
    midas_bias: 0,
    path_efficiency_bias: 0.62,
    overshoot_bias: 0,
  },
  {
    id: "S06",
    label: "Severe Restricted Neck ROM",
    kind: "restricted_rom",
    expected_archetype: "restricted_rom",
    tremor_amp_px: 3.5,
    rom_box_frac: 0.35,
    midas_bias: 0,
    path_efficiency_bias: 0.5,
    overshoot_bias: 0,
  },
  {
    id: "S07",
    label: "Mixed Impairment A",
    kind: "mixed_impairment",
    expected_archetype: "mixed_impairment",
    tremor_amp_px: 8,
    rom_box_frac: 1,
    midas_bias: 3,
    path_efficiency_bias: 0.32,
    overshoot_bias: 2,
  },
  {
    id: "S08",
    label: "Mixed Impairment B",
    kind: "mixed_impairment",
    expected_archetype: "mixed_impairment",
    tremor_amp_px: 9,
    rom_box_frac: 1,
    midas_bias: 4,
    path_efficiency_bias: 0.28,
    overshoot_bias: 2,
  },
  {
    id: "S09",
    label: "Steady / Low-Friction A",
    kind: "baseline_sufficient",
    expected_archetype: "baseline_sufficient",
    tremor_amp_px: 1.2,
    rom_box_frac: 1,
    midas_bias: 0,
    path_efficiency_bias: 0.92,
    overshoot_bias: 0,
  },
  {
    id: "S10",
    label: "Steady / Low-Friction B",
    kind: "baseline_sufficient",
    expected_archetype: "baseline_sufficient",
    tremor_amp_px: 1.8,
    rom_box_frac: 1,
    midas_bias: 0,
    path_efficiency_bias: 0.88,
    overshoot_bias: 0,
  },
];
