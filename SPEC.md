# Project Specification: Gaze/Head-Adaptive Constrained Generative UI (HCI Research Prototype)

## 1. Project Overview & Research Goal
Build a browser-based, hands-free adaptive web application designed as an HCI research artifact (Accessibility + Hands-Free Interaction + Constrained Generative UI).

**Core Mechanism:**
1. The user controls a virtual pointer hands-free via **webcam head-tracking** (MediaPipe Face Landmarker) with **dwell-to-click**.
2. A deterministic **Client-Side HCI Telemetry Engine** extracts motor interaction metrics (jitter, overshoots, Midas touch errors, path efficiency, edge-struggle zones, and per-element friction hotspots).
3. An LLM receives the **structured telemetry profile + semantic task schema + registered component catalog** and outputs a **strictly validated JSON UI Specification** (`AdaptedUISpec`).
4. Rather than mutating the UI silently, the app follows a **Mixed-Initiative & Explainable Adaptation** paradigm: it proposes the adaptation with a plain-English rationale and lets the user accept, reject, or revert at any time.
5. **Dual Adaptation:** The LLM adapts *both* the UI layout/components AND the head-tracking input policy (`dwell_time_ms`, `magnetic_snap_radius_px`, smoothing parameters).

**Primary Demo Scenario:** Concert Ticket Booking (`Select Seat/Zone` → `Ticket Count` → `Confirm Booking`).
**Core HCI Proof:** Demonstrate that no single static UI is optimal by showing how the same baseline booking page transforms into **two structurally opposite interfaces** for two conflicting motor profiles:
- **Profile A (High Jitter / Tremor):** Step-by-step Wizard, giant high-spacing targets (`ZoneCardSelector` + `RadioPillGrid`), longer dwell time, stronger smoothing & magnetic snap.
- **Profile B (High Precision, Restricted Neck Range of Motion):** Compact central hub (`CompactCenterHub` + `CompactCenterStepper`) clustered tightly within the central 45% viewport so the user completes the task with minimal head movement.

---

## 2. Tech Stack & macOS Environment Requirements
- **Framework:** Next.js 15 (App Router, TypeScript, strict mode)
- **Styling & Icons:** Tailwind CSS + `lucide-react`
- **Validation:** `zod`
- **Computer Vision (100% Client-Side):** `@mediapipe/tasks-vision` (`FaceLandmarker` running via WASM/WebGL in browser — runs smoothly on Apple Silicon macOS with zero Python backend required)
- **LLM Integration:** Official `openai` Node SDK inside a Next.js Route Handler (`/api/adapt`), configured with `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `LLM_MODEL` via `.env.local`. This ensures seamless switching between OpenAI, OpenRouter, or a local macOS server (LM Studio / Ollama) without changing code.
- **Data Storage:** Client-side state (Zustand or React Context) + `localStorage` + one-click CSV/JSON export for pilot study logs.

---

## 3. Recommended Directory Structure
```text
src/
├── app/
│   ├── page.tsx                     # Main interactive workspace (Booking App + HUD)
│   ├── layout.tsx
│   └── api/adapt/route.ts           # Server route: LLM call + Zod validation + deterministic fallback
├── lib/
│   ├── tracking/
│   │   ├── oneEuroFilter.ts         # Pure TS One-Euro Filter for jitter smoothing
│   │   ├── headTracker.ts           # MediaPipe FaceLandmarker wrapper (Yaw/Pitch -> Viewport X/Y)
│   │   └── perturbations.ts         # Synthetic motor simulators (High Jitter & Restricted ROM)
│   ├── telemetry/
│   │   ├── types.ts                 # Raw sample & computed HCI metric types
│   │   └── telemetryEngine.ts       # Computes jitter, overshoots, edge struggle, path efficiency, Midas errors
│   ├── genui/
│   │   ├── schema.ts                # Zod schemas for LLM Input & AdaptedUISpec Output
│   │   ├── prompts.ts               # System & user prompt builders
│   │   └── fallbackSpecs.ts         # Deterministic rule-based fallback specs (works offline / if LLM fails)
│   └── study/
│       └── exportUtils.ts           # CSV / JSON exporter for pilot study sessions & NASA-TLX
├── components/
│   ├── cursor/
│   │   ├── VirtualCursor.tsx        # Dwell progress ring, magnetic snap visual, calibration HUD
│   │   └── WebcamPreview.tsx        # Collapsible corner webcam monitor + "Recenter (Space)" button
│   ├── booking/
│   │   ├── BaselineConcertApp.tsx   # Challenging default UI (dense SVG seat map, small dropdown, corner CTA)
│   │   ├── GenUIRenderer.tsx        # Renders AdaptedUISpec JSON dynamically using COMPONENT_MAP
│   │   └── registry/                # Constrained, WCAG-safe adaptive components
│   │       ├── InteractiveSeatMap.tsx
│   │       ├── ZoneCardSelector.tsx
│   │       ├── CompactRadialZoneHub.tsx
│   │       ├── DropdownSelect.tsx
│   │       ├── LargeStepperControl.tsx
│   │       ├── RadioPillGrid.tsx
│   │       ├── CompactCenterStepper.tsx
│   │       └── ConfirmActionButton.tsx
│   ├── adaptation/
│   │   └── AdaptationProposalModal.tsx # Explainable Mixed-Initiative accept/reject/revert UI
│   └── researcher/
│       ├── ResearcherDrawer.tsx     # Toggleable (Cmd+Shift+D): live metrics, JSON inspector, simulation mode
│       └── PilotStudyModal.tsx      # Built-in A/B task timer, NASA-TLX (6 scales), SUS form, CSV export
└── store/
    └── useAppStore.ts               # Shared bookingState, interactionPolicy, UI mode, study state
```

## 4. Detailed Module Specifications

### Module A: Head Tracking, One-Euro Filter & Dwell Controller

1. MediaPipe FaceLandmarker:
  ⚬ Load model from Google CDN (face_landmarker.task) with outputFacialTransformationMatrixes: true, runningMode: "VIDEO", numFaces: 1.
  ⚬ Extract head Yaw and Pitch from the 4x4 transformation matrix (fallback: relative nose-tip landmark #1 vs face center).
  ⚬ Provide a 1-click / Spacebar "Recenter" calibration that sets the user's current neutral head pose as viewport center (0.5, 0.5).
  ⚬ Map Yaw/Pitch delta with configurable gain (sensitivityX, sensitivityY) to viewport coordinates (x, y).
  ⚬ Include a "Mouse Fallback Mode" toggle so the app can also be tested without a webcam (or with synthetic perturbations applied to the mouse).
2. One-Euro Filter (oneEuroFilter.ts):
  ⚬ Implement the standard Casiez et al. (CHI 2012) One-Euro Filter in pure TypeScript with dynamic minCutoff and beta parameters controlled by interaction_policy.
3. Dwell-to-Click & Magnetic Snapping (VirtualCursor.tsx):
  ⚬ All interactive targets register a data-hci-id and data-hci-type attribute.
  ⚬ On every animation frame (requestAnimationFrame), find the nearest [data-hci-id] bounding rect.
  ⚬ If the cursor is within magnetic_snap_radius_px of a target, gently pull the effective pointer toward the target center (visually show a subtle snap halo).
  ⚬ While hovering a target, animate a circular SVG progress ring around the virtual cursor from 0% to 100% over dwell_time_ms (default: 700ms). When it reaches 100%, programmatically trigger .click() on the target and enforce a 600ms cooldown to avoid double triggers.
4. Synthetic Motor Perturbations (perturbations.ts):
  ⚬ Crucial for demos and reproducible testing:
    ⚬ none: Clean head/mouse tracking.
    ⚬ high_jitter: Injects multi-frequency sinusoidal + Gaussian tremor (±14–22px) into raw coordinates.
    ⚬ restricted_rom: Applies nonlinear edge resistance outside the central 45% box (simulating inability/pain when turning neck toward screen corners).

### Module B: Deterministic HCI Telemetry Engine (telemetryEngine.ts)

Sample pointer trajectory at ~30–60Hz and compute a clean summary object:

⚬ jitter_px: Standard deviation (RMS distance from mean position) during intentional hover/dwell windows (>200ms near a target).
⚬ overshoot_count: Count of events where pointer enters a [data-hci-id] target, exits within <450ms without completing dwell, and re-enters the same target within 1500ms.
⚬ midas_touch_errors: Count of dwell-clicks immediately followed within 2000ms by clicking a different option in the same group, clicking "Undo/Back", or clicking an unrelated adjacent element.
⚬ path_efficiency: Ratio straight_line_distance / actual_path_length between consecutive clicks (bounded 0.0 – 1.0).
⚬ edge_struggle_zones: Divide viewport into a 3×3 grid. Flag outer zones (top_left, top_right, bottom_left, bottom_right, edges) if pointer dwell attempts fail there or cursor velocity/reach stalls near the margin.
⚬ estimated_comfortable_target_px: Heuristic clamp(44, round(jitter_px * 5.2), 110).
⚬ hotspot_frictions: Array of { element_id, overshoots, misclicks, time_spent_sec, completed }.

### Module C: Baseline Concert Booking App (BaselineConcertApp.tsx)

Design a realistic, visually polished (but hands-free hostile) default interface:

⚬ Seat Map (seat_map_svg): An 8-row × 12-column SVG theater map with small clickable seat circles (16px diameter, 4px gap) divided into 3 price tiers (VIP Front $120, Mid Floor $80, Balcony $50), with some seats pre-marked as occupied.
⚬ Ticket Count (ticket_count_dropdown): A compact dropdown (height: 32px) in the right sidebar to select 1–4 tickets.
⚬ Checkout Button (confirm_booking_btn): Placed in the bottom-right corner of the viewport (120px × 36px), forcing neck rotation and precise aiming.
⚬ Shared State (bookingState): { selectedZone: 'vip' | 'floor' | 'balcony' | null, selectedSeats: string[], ticketCount: number, isConfirmed: boolean }. Both Baseline and Adapted UIs read/write this exact same state.

### Module D: Constrained Generative UI Schema & Renderer (schema.ts & GenUIRenderer.tsx)

Strict Zod Output Schema (AdaptedUISpecSchema):

```ts
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
  props: z.record(z.any()),
});

export const AdaptedUISpecSchema = z.object({
  detected_profile_archetype: z.enum([
    "high_jitter",
    "restricted_rom",
    "mixed_impairment",
    "baseline_sufficient",
  ]),
  rationale: z.string().describe("2-3 plain-English sentences explaining what friction was detected and why these UI changes help."),
  change_summary: z.array(z.string()).min(2).max(4),
  interaction_policy: InteractionPolicySchema,
  layout_config: LayoutConfigSchema,
  nodes: z.array(UINodeSchema).min(2).max(4),
});
```

Component Registry (COMPONENT_MAP) Behavior:

⚬ ZoneCardSelector: Large full-width cards for VIP / Floor / Balcony; selecting a zone automatically reserves the best adjacent seats (auto-seat badge).
⚬ CompactRadialZoneHub: All 3 zones + ticket count arranged tightly around a central hub (max-width: 420px, dead-center viewport) for zero edge-reaching.
⚬ LargeStepperControl: Giant - and + buttons (min-height bound to layout_config.min_target_size_px).
⚬ RadioPillGrid: Large discrete buttons [1] [2] [3] [4] with generous spacing.
⚬ CompactCenterStepper: Tightly clustered horizontal buttons centered in the focal zone.
⚬ ConfirmActionButton: Supports require_long_dwell_ms (e.g., 1200ms safeguard against accidental purchase) and displays a summary of selected seats & total price.

### Module E: Mixed-Initiative Adaptation Flow

⚬ Trigger adaptation either:
  1. Automatically when friction threshold is crossed (e.g., overshoot_count >= 3 OR midas_touch_errors >= 2 OR >15s spent struggling on seat_map_svg), OR
  2. Manually via a top-bar button: "Analyze Telemetry & Suggest Adaptation".
⚬ Show AdaptationProposalModal:
  ⚬ Displays rationale and bulleted change_summary.
  ⚬ Two large dwell-friendly buttons: "Apply Adapted UI" and "Keep Current UI".
⚬ Once adapted, keep a persistent subtle "Revert to Baseline" button at the top-center to preserve User Agency and allow instant before/after comparison.

### Module F: Researcher HUD & Mini Pilot Study Runner

1. Researcher Drawer (Cmd + Shift + D or subtle top-right icon):
  ⚬ Live metrics dashboard (jitter_px, overshoots, midas_errors, path_efficiency, edge_struggle_zones).
  ⚬ Synthetic Perturbation selector (None, Simulate High Jitter, Simulate Restricted Neck ROM).
  ⚬ Quick Demo Triggers: "Run LLM Adaptation" + JSON Inspector tabs (Telemetry Input JSON vs LLM AdaptedUISpec Output JSON).
2. Pilot Study Runner (PilotStudyModal.tsx):
  ⚬ Setup: Participant ID (P01), Condition Order (Baseline → Adapted or Adapted → Baseline for counterbalancing).
  ⚬ Automatically records: task_completion_time_sec, overshoot_count, midas_touch_errors, path_efficiency, condition.
  ⚬ Upon clicking "Confirm Booking", automatically opens a clean NASA-TLX (6 sliders, 0–100: Mental Demand, Physical/Neck Demand, Temporal Demand, Performance, Effort, Frustration) + 3-item Agency/Usability rating.
  ⚬ One-click "Export All Trials (CSV)" and "Export Full Telemetry (JSON)".

## 5. LLM Route Handler (/api/adapt/route.ts)

⚬ Accepts { telemetryProfile, taskSchema }.
⚬ Uses openai SDK with response_format: { type: "json_object" } (or structured outputs) and validates with AdaptedUISpecSchema.safeParse().
⚬ System Prompt Rules:
  ⚬ Act as an expert HCI Accessibility & Ability-Based Design engine inspired by SUPPLE (Gajos et al.) and Ability-Based Design (Wobbrock et al.).
  ⚬ If jitter_px > 10 or overshoot_count >= 3: choose mode: "step_wizard", ZoneCardSelector, RadioPillGrid or LargeStepperControl, min_target_size_px >= 80, element_gap_px >= 20, increase dwell_time_ms (900–1100ms), increase magnetic_snap_radius_px (24–36px).
  ⚬ If edge_struggle_zones contains outer zones AND jitter_px <= 10: choose mode: "compact_center_hub", CompactRadialZoneHub, CompactCenterStepper, safe_zone_width_percent <= 50, element_gap_px small (8–12px), keep everything dead-center.
  ⚬ Never invent component names outside ComponentNameSchema.
⚬ Resilience: If OPENAI_API_KEY is missing or the API times out, gracefully fall back to fallbackSpecs.ts (and display a badge "Mode: Deterministic Fallback" vs "Mode: Live LLM" in the Researcher Drawer so demos never crash).

## 6. Phased Implementation Plan (Execute One Phase at a Time)

⚬ Phase 1 (Scaffold & Baseline App): Initialize Next.js 15 + Tailwind + TypeScript + Zustand + BaselineConcertApp with shared bookingState and full [data-hci-id] tagging.
⚬ Phase 2 (Head Tracking, One-Euro Filter & Dwell Cursor): Integrate @mediapipe/tasks-vision FaceLandmarker, calibration (Space to recenter), VirtualCursor with dwell ring + magnetic snap, and synthetic perturbation modes (High Jitter, Restricted ROM, Mouse Fallback).
⚬ Phase 3 (HCI Telemetry Engine & Researcher HUD): Build telemetryEngine.ts and ResearcherDrawer.tsx to visualize live metrics in real time.
⚬ Phase 4 (Constrained GenUI Engine & Mixed-Initiative Modal): Build schema.ts, /api/adapt/route.ts, fallbackSpecs.ts, all 8 registry components, GenUIRenderer.tsx, and AdaptationProposalModal.tsx.
⚬ Phase 5 (Pilot Study Mode & Polish): Build PilotStudyModal.tsx (counterbalanced A/B timer, NASA-TLX, CSV/JSON export), refine visual aesthetics for clean academic demo recording, and verify npm run build passes with zero TypeScript errors.
