export type HciTarget = {
  id: string;
  type: string;
  element: Element;
  rect: DOMRect;
  centerX: number;
  centerY: number;
  /** When false, target is telemetry-only (no dwell-click). */
  dwellable: boolean;
  /** Optional per-target dwell override (ms). */
  dwellMs: number | null;
};

export function collectHciTargets(opts?: {
  dwellableOnly?: boolean;
  /** Limit scan to a subtree (e.g. open adaptation dialog). */
  root?: ParentNode;
}): HciTarget[] {
  const scope = opts?.root ?? document;
  const nodes = scope.querySelectorAll<HTMLElement>("[data-hci-id]");
  const targets: HciTarget[] = [];

  nodes.forEach((el) => {
    const id = el.getAttribute("data-hci-id");
    if (!id) return;
    const dwellAttr = el.getAttribute("data-hci-dwell");
    const dwellable = dwellAttr !== "false";
    if (opts?.dwellableOnly && !dwellable) return;

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const dwellRaw = el.getAttribute("data-hci-dwell-ms");
    const dwellParsed = dwellRaw ? Number(dwellRaw) : NaN;
    targets.push({
      id,
      type: el.getAttribute("data-hci-type") ?? "unknown",
      element: el,
      rect,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      dwellable,
      dwellMs: Number.isFinite(dwellParsed) ? dwellParsed : null,
    });
  });

  return targets;
}

export function distanceToRect(
  x: number,
  y: number,
  rect: DOMRect,
): number {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
}

export function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

export function findNearestTarget(
  x: number,
  y: number,
  targets: HciTarget[],
): { target: HciTarget; distance: number } | null {
  let best: HciTarget | null = null;
  let bestDist = Infinity;

  for (const t of targets) {
    // Prefer interactive leaf targets over large containers when both contain the point.
    const inside = pointInRect(x, y, t.rect);
    const dist = inside ? 0 : distanceToRect(x, y, t.rect);
    // Tie-break: smaller area wins when both are under the cursor
    if (dist < bestDist - 0.01) {
      best = t;
      bestDist = dist;
    } else if (Math.abs(dist - bestDist) <= 0.01 && best) {
      const area = t.rect.width * t.rect.height;
      const bestArea = best.rect.width * best.rect.height;
      if (area < bestArea) {
        best = t;
        bestDist = dist;
      }
    }
  }

  return best ? { target: best, distance: bestDist } : null;
}

export function triggerHciClick(element: Element): void {
  if (element instanceof HTMLElement) {
    element.click();
    return;
  }
  // SVG seats / non-HTMLElement targets
  element.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    }),
  );
}
