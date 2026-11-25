import type { PerturbationMode } from "@/store/useAppStore";

export type Point2D = { x: number; y: number };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function gaussian(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Central comfortable box used by restricted_rom (~45% of viewport). */
export function romSafeBox(viewport: { width: number; height: number }) {
  const cx = viewport.width * 0.5;
  const cy = viewport.height * 0.5;
  const halfW = viewport.width * 0.45 * 0.5;
  const halfH = viewport.height * 0.45 * 0.5;
  return {
    left: cx - halfW,
    right: cx + halfW,
    top: cy - halfH,
    bottom: cy + halfH,
  };
}

/**
 * Apply synthetic motor impairments for demos / reproducible testing.
 * Coordinates are in viewport pixels.
 */
export function applyPerturbation(
  point: Point2D,
  mode: PerturbationMode,
  timeSec: number,
  viewport: { width: number; height: number },
): Point2D {
  if (mode === "none") {
    return point;
  }

  if (mode === "high_jitter") {
    const ampA = 14 + 4 * Math.sin(timeSec * 0.7);
    const ampB = 8 + 3 * Math.cos(timeSec * 1.1);
    const tremorX =
      ampA * Math.sin(timeSec * 17.3) +
      ampB * Math.sin(timeSec * 29.1 + 1.2) +
      gaussian() * 3.5;
    const tremorY =
      ampA * Math.cos(timeSec * 19.7 + 0.4) +
      ampB * Math.sin(timeSec * 31.4) +
      gaussian() * 3.5;
    const mag = Math.hypot(tremorX, tremorY);
    const scale = mag > 22 ? 22 / mag : 1;
    return {
      x: point.x + tremorX * scale,
      y: point.y + tremorY * scale,
    };
  }

  // restricted_rom: soft resistance outside central box.
  // Gain 0.78 lets a full-intent reach ~93–95% of the viewport so Confirm
  // (bottom-right) is attainable, but motion past the box is slow enough to
  // register as an edge stall under STALL_SPEED_PX_S.
  const box = romSafeBox(viewport);
  let { x, y } = point;
  const gain = 0.78;

  if (x < box.left) {
    x = box.left - (box.left - x) * gain;
  } else if (x > box.right) {
    x = box.right + (x - box.right) * gain;
  }

  if (y < box.top) {
    y = box.top - (box.top - y) * gain;
  } else if (y > box.bottom) {
    y = box.bottom + (y - box.bottom) * gain;
  }

  return {
    x: clamp(x, 0, viewport.width),
    y: clamp(y, 0, viewport.height),
  };
}
