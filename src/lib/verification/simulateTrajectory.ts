import { TelemetryEngine } from "@/lib/telemetry/telemetryEngine";
import type { TelemetryProfile } from "@/lib/telemetry/types";
import {
  VERIFY_VIEWPORT,
  baselineBookingTargets,
} from "@/lib/telemetry/fitts";
import type { SyntheticProfileDef } from "@/lib/verification/syntheticProfiles";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Deterministic pseudo-noise from t + seed (no Math.random). */
function noise(t: number, seed: number): number {
  const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function applyRomBox(
  x: number,
  y: number,
  frac: number,
  vw: number,
  vh: number,
): { x: number; y: number } {
  if (frac >= 0.99) return { x, y };
  const cx = vw / 2;
  const cy = vh / 2;
  const halfW = vw * frac * 0.5;
  const halfH = vh * frac * 0.5;
  const gain = 0.78;
  let px = x;
  let py = y;
  const left = cx - halfW;
  const right = cx + halfW;
  const top = cy - halfH;
  const bottom = cy + halfH;
  if (px < left) px = left - (left - px) * gain;
  else if (px > right) px = right + (px - right) * gain;
  if (py < top) py = top - (top - py) * gain;
  else if (py > bottom) py = bottom + (py - bottom) * gain;
  return { x: clamp(px, 0, vw), y: clamp(py, 0, vh) };
}

function tremorAt(
  t: number,
  seed: number,
  amp: number,
): { x: number; y: number } {
  if (amp <= 0.5) return { x: 0, y: 0 };
  const ts = t / 1000;
  return {
    x:
      amp *
      (0.55 * Math.sin(ts * 17.3 + seed) +
        0.35 * Math.sin(ts * 29.1) +
        (noise(ts, seed) - 0.5) * 0.45),
    y:
      amp *
      (0.55 * Math.cos(ts * 19.7) +
        0.35 * Math.sin(ts * 31.4 + seed) +
        (noise(ts, seed + 3) - 0.5) * 0.45),
  };
}

function travelTo(
  engine: TelemetryEngine,
  def: SyntheticProfileDef,
  from: { x: number; y: number },
  to: { x: number; y: number },
  t0: number,
  dtMs: number,
  seed: number,
  vw: number,
  vh: number,
  ampScale = 1,
  /** Soft hover near destination so edge approaches are not idle-edge stalls. */
  hoverTargetId: string | null = null,
): number {
  let t = t0;
  const frames = 36 + Math.round(def.tremor_amp_px * 0.4);
  for (let i = 0; i <= frames; i++) {
    const u = i / frames;
    const ease = 1 - Math.pow(1 - u, 2.2);
    const tr = tremorAt(t, seed, def.tremor_amp_px * ampScale);
    const x = lerp(from.x, to.x, ease) + tr.x;
    const y = lerp(from.y, to.y, ease) + tr.y;
    const dist = Math.hypot(x - to.x, y - to.y);
    // Soft-acquire only in the final settle (dwellProgress stays < 0.25 so
    // computeJitter ignores these samples; prevents idle-edge false positives).
    const tid =
      hoverTargetId && dist < 48 && u > 0.82 ? hoverTargetId : null;
    pushFrame(engine, def, t, x, y, tid, tid ? 0.08 : 0, vw, vh);
    t += dtMs;
  }
  return t;
}

function dwellOn(
  engine: TelemetryEngine,
  def: SyntheticProfileDef,
  target: { id: string; x: number; y: number; type: string },
  t0: number,
  dtMs: number,
  seed: number,
  vw: number,
  vh: number,
  opts?: { complete?: boolean; maxProgress?: number; frames?: number },
): number {
  let t = t0;
  const complete = opts?.complete ?? true;
  const frames = opts?.frames ?? 28;
  const maxProgress = opts?.maxProgress ?? 1;
  for (let d = 0; d < frames; d++) {
    const tr = tremorAt(t, seed + d, def.tremor_amp_px);
    const progress = Math.min(maxProgress, d / Math.max(1, frames - 6));
    pushFrame(
      engine,
      def,
      t,
      target.x + tr.x,
      target.y + tr.y,
      target.id,
      progress,
      vw,
      vh,
    );
    t += dtMs;
  }
  if (complete && maxProgress >= 1) {
    const landed = applyRomBox(target.x, target.y, def.rom_box_frac, vw, vh);
    engine.recordDwellClick({
      t,
      x: landed.x,
      y: landed.y,
      targetId: target.id,
      targetType: target.type,
    });
    t += 650;
  }
  return t;
}

/**
 * Organic synthetic booking trajectory — metrics come only from TelemetryEngine.
 * No post-hoc overrides of jitter / edges / midas / overshoots.
 */
export function simulateProfileTelemetry(
  def: SyntheticProfileDef,
): TelemetryProfile {
  const engine = new TelemetryEngine();
  const vw = VERIFY_VIEWPORT.width;
  const vh = VERIFY_VIEWPORT.height;
  const path = baselineBookingTargets();
  const seed = def.id.charCodeAt(1) * 17 + def.id.charCodeAt(2);
  const hz = 45;
  const dtMs = 1000 / hz;
  let t = 1000;

  let cursor = { x: vw / 2, y: vh / 2 };

  // Rest samples at center
  for (let i = 0; i < 35; i++) {
    const tr = tremorAt(t, seed, def.tremor_amp_px * 0.35);
    pushFrame(
      engine,
      def,
      t,
      cursor.x + tr.x,
      cursor.y + tr.y,
      null,
      0,
      vw,
      vh,
    );
    t += dtMs;
  }

  for (let step = 1; step < path.length; step++) {
    const to = path[step]!;
    const targetType = to.id.startsWith("seat")
      ? "seat"
      : to.id === "confirm"
        ? "confirm"
        : "select_option";
    const target = {
      id: to.id,
      x: to.x,
      y: to.y,
      type: targetType,
    };

    // Real overshoot loops: travel → partial dwell → leave → re-enter
    const overshootLoops = Math.min(6, Math.max(0, def.overshoot_bias));
    for (let o = 0; o < overshootLoops; o++) {
      // No hoverTargetId on overshoot approach — soft-acquire frames would
      // push visit duration past OVERSHOOT_EXIT_MS for high tremor (S03).
      t = travelTo(
        engine,
        def,
        cursor,
        target,
        t,
        dtMs,
        seed + o,
        vw,
        vh,
        1,
        null,
      );
      cursor = { x: target.x, y: target.y };
      t = dwellOn(engine, def, target, t, dtMs, seed + o * 3, vw, vh, {
        complete: false,
        maxProgress: 0.4,
        frames: 9,
      });
      // Abrupt leave toward viewport center (not further into the screen edge).
      for (let leave = 0; leave < 8; leave++) {
        pushFrame(
          engine,
          def,
          t,
          lerp(target.x, vw * 0.5, 0.15 + leave * 0.08),
          lerp(target.y, vh * 0.5, 0.15 + leave * 0.08),
          null,
          0,
          vw,
          vh,
        );
        t += dtMs;
      }
      cursor = { x: vw * 0.5, y: vh * 0.5 };
    }

    // Final successful acquisition
    t = travelTo(
      engine,
      def,
      cursor,
      target,
      t,
      dtMs,
      seed + 50,
      vw,
      vh,
      1,
      target.id,
    );
    cursor = { x: target.x, y: target.y };
    t = dwellOn(engine, def, target, t, dtMs, seed + 60, vw, vh, {
      complete: true,
      frames: 26 + Math.round(def.tremor_amp_px * 0.3),
    });

    // Adjacent-seat Midas within MIDAS_SEAT_WINDOW_MS
    if (def.midas_bias > 0 && target.id.startsWith("seat") && step === 1) {
      for (let m = 0; m < def.midas_bias; m++) {
        const alt = {
          id: `seat_E${5 + m}`,
          x: target.x + 22 + m * 18,
          y: target.y + (m % 2 === 0 ? 8 : -8),
          type: "seat",
        };
        t = travelTo(
          engine,
          def,
          cursor,
          alt,
          t,
          dtMs,
          seed + 80 + m,
          vw,
          vh,
          0.9,
          alt.id,
        );
        cursor = { x: alt.x, y: alt.y };
        t = dwellOn(engine, def, alt, t, dtMs, seed + 90 + m, vw, vh, {
          complete: true,
          frames: 18,
        });
        t += 400;
      }
    }
  }

  // Restricted ROM struggle: intent toward outer Confirm with attenuation.
  // targetId null so stalls register via reachAttenuation / idle edge — not
  // successful outer-button dwells.
  if (def.rom_box_frac < 0.95) {
    const struggleFrames = Math.round(80 + (1 - def.rom_box_frac) * 140);
    for (let i = 0; i < struggleFrames; i++) {
      const u = Math.min(1, i / (struggleFrames * 0.55));
      const intentX = lerp(vw * 0.52, vw * 0.98, u);
      const intentY = lerp(vh * 0.52, vh * 0.97, u);
      const tr = tremorAt(t, seed + 99, def.tremor_amp_px * 0.5);
      // Late frames: hold at attenuated frontier (low speed, high attenuation)
      const hold = i > struggleFrames * 0.55;
      const ix = hold ? vw * 0.98 + tr.x * 0.3 : intentX + tr.x;
      const iy = hold ? vh * 0.97 + tr.y * 0.3 : intentY + tr.y;
      pushFrame(engine, def, t, ix, iy, null, 0, vw, vh);
      t += hold ? dtMs * 1.4 : dtMs;
    }

    // Failed outer visit: brief partial dwell then abort to center
    for (let i = 0; i < 12; i++) {
      const tr = tremorAt(t, seed + 120, def.tremor_amp_px * 0.4);
      const p = applyRomBox(vw * 0.94, vh * 0.92, def.rom_box_frac, vw, vh);
      pushFrame(
        engine,
        def,
        t,
        // Intent stays outer so attenuation remains large
        vw * 0.97 + tr.x,
        vh * 0.96 + tr.y,
        "confirm",
        clamp(i / 28, 0, 0.3),
        vw,
        vh,
      );
      void p;
      t += dtMs;
    }
    t = travelTo(
      engine,
      def,
      { x: vw * 0.7, y: vh * 0.7 },
      { x: vw / 2, y: vh / 2 },
      t,
      dtMs,
      seed + 130,
      vw,
      vh,
      0.4,
    );
  }

  return engine.getProfile();
}

function pushFrame(
  engine: TelemetryEngine,
  def: SyntheticProfileDef,
  t: number,
  intentX: number,
  intentY: number,
  targetId: string | null,
  dwellProgress: number,
  vw: number,
  vh: number,
) {
  const perturbed = applyRomBox(intentX, intentY, def.rom_box_frac, vw, vh);
  engine.sample({
    t,
    x: perturbed.x,
    y: perturbed.y,
    rawX: perturbed.x,
    rawY: perturbed.y,
    intentX,
    intentY,
    targetId,
    dwellProgress,
    viewportW: vw,
    viewportH: vh,
  });
}
