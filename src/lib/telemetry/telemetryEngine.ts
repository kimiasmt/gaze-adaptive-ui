import type {
  DwellClickEvent,
  EdgeStruggleLabel,
  EdgeZoneId,
  HotspotFriction,
  PointerSample,
  TelemetryProfile,
} from "@/lib/telemetry/types";
import { EMPTY_TELEMETRY_PROFILE } from "@/lib/telemetry/types";

const MAX_SAMPLES = 3600; // ~80s at 45Hz
const HOVER_JITTER_MIN_MS = 200;
const OVERSHOOT_EXIT_MS = 450;
const OVERSHOOT_REENTER_MS = 1500;
/** Only count overshoot if user had begun dwelling (not snap flicker). */
const OVERSHOOT_MIN_DWELL_PROGRESS = 0.2;
const MIDAS_WINDOW_MS = 2000;
/**
 * Must exceed dwell + cooldown (~700+600=1300ms). 2400ms covers rapid
 * adjacent-seat corrections and same-seat reselect after a mis-dwell.
 */
const MIDAS_SEAT_WINDOW_MS = 2400;
const EDGE_MARGIN_FRAC = 0.08;
const STALL_SPEED_PX_S = 40;
const SAMPLE_INTERVAL_MS = 1000 / 45; // ~45Hz
const SEAT_FLICKER_MS = 120;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function groupForTarget(id: string, type: string): string {
  if (type === "seat" || id.startsWith("seat_")) return "seat_selection";
  if (type === "select_option" || id.startsWith("ticket_count"))
    return "ticket_count";
  if (type === "confirm" || id.includes("confirm")) return "confirm_booking";
  if (
    type === "action" &&
    (id.includes("reset") || id.includes("undo") || id.includes("back"))
  )
    return "undo_back";
  return type || id;
}

function isStudyChrome(id: string | null): boolean {
  if (!id) return false;
  return (
    id.startsWith("researcher_") ||
    id.startsWith("webcam_") ||
    id === "mouse_fallback_toggle" ||
    id === "perturbation_select" ||
    id === "recenter_btn" ||
    id === "run_llm_adaptation_btn" ||
    id === "telemetry_reset_btn"
  );
}

function zoneForPoint(
  x: number,
  y: number,
  w: number,
  h: number,
): EdgeZoneId {
  const col = x < w / 3 ? 0 : x < (2 * w) / 3 ? 1 : 2;
  const row = y < h / 3 ? 0 : y < (2 * h) / 3 ? 1 : 2;
  const names: EdgeZoneId[][] = [
    ["top_left", "top_center", "top_right"],
    ["middle_left", "center", "middle_right"],
    ["bottom_left", "bottom_center", "bottom_right"],
  ];
  return names[row][col];
}

function rmsFromPoints(
  pts: Array<{ x: number; y: number; rawX?: number; rawY?: number }>,
): number {
  if (pts.length < 3) return 0;
  // Prefer pre-filter coords so One-Euro / magnetic snap do not hide tremor.
  const xs = pts.map((p) => p.rawX ?? p.x);
  const ys = pts.map((p) => p.rawY ?? p.y);
  const mx = xs.reduce((a, v) => a + v, 0) / xs.length;
  const my = ys.reduce((a, v) => a + v, 0) / ys.length;
  const variance =
    xs.reduce((a, x, i) => a + (x - mx) ** 2 + (ys[i]! - my) ** 2, 0) /
    xs.length;
  return Math.sqrt(variance);
}

type Visit = {
  targetId: string;
  enterT: number;
  exitT: number | null;
  completedDwell: boolean;
  maxDwellProgress: number;
};

type HotspotAcc = {
  overshoots: number;
  misclicks: number;
  timeMs: number;
  completed: boolean;
};

export class TelemetryEngine {
  private samples: PointerSample[] = [];
  private clicks: DwellClickEvent[] = [];
  private visits: Visit[] = [];
  private openVisit: Visit | null = null;
  private lastSampleT = 0;
  private sessionStartT: number | null = null;
  private hotspots = new Map<string, HotspotAcc>();
  private overshootCount = 0;
  private midasCount = 0;
  private pendingOvershoot = new Map<
    string,
    { exitT: number; enteredAt: number }
  >();

  reset(): void {
    this.samples = [];
    this.clicks = [];
    this.visits = [];
    this.openVisit = null;
    this.lastSampleT = 0;
    this.sessionStartT = null;
    this.hotspots.clear();
    this.overshootCount = 0;
    this.midasCount = 0;
    this.pendingOvershoot.clear();
  }

  /** Push a frame; internally rate-limits to ~45Hz. */
  sample(input: {
    t: number;
    x: number;
    y: number;
    /** Pre-filter perturbed coords for jitter; defaults to x/y. */
    rawX?: number;
    rawY?: number;
    /** Unperturbed intent; defaults to rawX/rawY. */
    intentX?: number;
    intentY?: number;
    targetId: string | null;
    dwellProgress: number;
    viewportW: number;
    viewportH: number;
  }): void {
    // Researcher / webcam chrome must not pollute motor metrics
    const targetId = isStudyChrome(input.targetId) ? null : input.targetId;
    const dwellProgress = targetId ? input.dwellProgress : 0;
    const rawX = input.rawX ?? input.x;
    const rawY = input.rawY ?? input.y;
    const frame = {
      ...input,
      rawX,
      rawY,
      intentX: input.intentX ?? rawX,
      intentY: input.intentY ?? rawY,
      targetId,
      dwellProgress,
    };

    if (this.sessionStartT === null) this.sessionStartT = frame.t;
    if (frame.t - this.lastSampleT < SAMPLE_INTERVAL_MS) {
      this.updateVisit(frame.t, frame.targetId, frame.dwellProgress);
      return;
    }
    this.lastSampleT = frame.t;

    this.samples.push(frame);
    if (this.samples.length > MAX_SAMPLES) {
      this.samples.splice(0, this.samples.length - MAX_SAMPLES);
    }

    this.updateVisit(frame.t, frame.targetId, frame.dwellProgress);
    this.accumulateHoverTime(frame);
    this.detectEdgeStall(frame);
  }

  recordDwellClick(
    event: Omit<DwellClickEvent, "group"> & { group?: string },
  ): void {
    if (isStudyChrome(event.targetId)) return;

    const group =
      event.group ?? groupForTarget(event.targetId, event.targetType);
    const full: DwellClickEvent = { ...event, group };
    this.clicks.push(full);

    if (this.openVisit && this.openVisit.targetId === event.targetId) {
      this.openVisit.completedDwell = true;
      this.openVisit.maxDwellProgress = 1;
    }

    const hs = this.ensureHotspot(event.targetId);
    hs.completed = true;

    this.detectMidas(full);
  }

  getProfile(): TelemetryProfile {
    const jitter = this.computeJitter();
    const pathEff = this.computePathEfficiency();
    const edgeZones = this.computeEdgeStruggleZones();
    const hotspots = this.computeHotspots();
    const duration =
      this.sessionStartT === null || this.samples.length === 0
        ? 0
        : (this.lastSampleT - this.sessionStartT) / 1000;

    const seatMapHotspot = hotspots.find((h) => h.element_id === "seat_map_svg");
    const seatStruggleSec = seatMapHotspot?.time_spent_sec ?? 0;

    const friction =
      this.overshootCount >= 3 ||
      this.midasCount >= 2 ||
      seatStruggleSec > 15;

    return {
      jitter_px: Number(jitter.toFixed(2)),
      overshoot_count: this.overshootCount,
      midas_touch_errors: this.midasCount,
      path_efficiency: Number(clamp(pathEff, 0, 1).toFixed(3)),
      edge_struggle_zones: edgeZones,
      estimated_comfortable_target_px: clamp(Math.round(jitter * 5.2), 44, 110),
      hotspot_frictions: hotspots,
      sample_count: this.samples.length,
      session_duration_sec: Number(duration.toFixed(1)),
      friction_threshold_crossed: friction,
      computed_at_ms: Date.now(),
    };
  }

  toTelemetryInputJson(): TelemetryProfile {
    return this.getProfile();
  }

  private ensureHotspot(id: string): HotspotAcc {
    let h = this.hotspots.get(id);
    if (!h) {
      h = { overshoots: 0, misclicks: 0, timeMs: 0, completed: false };
      this.hotspots.set(id, h);
    }
    return h;
  }

  private updateVisit(
    t: number,
    targetId: string | null,
    dwellProgress: number,
  ): void {
    if (targetId) {
      if (!this.openVisit || this.openVisit.targetId !== targetId) {
        if (this.openVisit && this.openVisit.exitT === null) {
          this.closeVisit(t, this.openVisit.completedDwell, targetId);
        }
        this.noteTargetEnter(targetId, t);
        this.openVisit = {
          targetId,
          enterT: t,
          exitT: null,
          completedDwell: dwellProgress >= 1,
          maxDwellProgress: dwellProgress,
        };
      } else {
        this.openVisit.maxDwellProgress = Math.max(
          this.openVisit.maxDwellProgress,
          dwellProgress,
        );
        if (dwellProgress >= 1) this.openVisit.completedDwell = true;
      }
      return;
    }

    if (this.openVisit && this.openVisit.exitT === null) {
      this.closeVisit(t, this.openVisit.completedDwell, null);
    }
  }

  private closeVisit(
    exitT: number,
    completed: boolean,
    nextTargetId: string | null,
  ): void {
    if (!this.openVisit) return;
    const visit = this.openVisit;
    visit.exitT = exitT;
    visit.completedDwell = completed || visit.completedDwell;
    this.visits.push(visit);

    const dwellMs = exitT - visit.enterT;
    const intentionalAttempt =
      visit.maxDwellProgress >= OVERSHOOT_MIN_DWELL_PROGRESS;

    // Dense seat-map snap flicker: seat A → seat B in <120ms is not an overshoot
    const seatFlicker =
      nextTargetId !== null &&
      groupForTarget(visit.targetId, "seat") === "seat_selection" &&
      groupForTarget(nextTargetId, "seat") === "seat_selection" &&
      dwellMs < SEAT_FLICKER_MS;

    if (
      !visit.completedDwell &&
      intentionalAttempt &&
      dwellMs < OVERSHOOT_EXIT_MS &&
      !seatFlicker
    ) {
      this.pendingOvershoot.set(visit.targetId, {
        exitT,
        enteredAt: visit.enterT,
      });
    }

    this.openVisit = null;
  }

  private accumulateHoverTime(input: {
    t: number;
    targetId: string | null;
  }): void {
    if (!input.targetId) return;
    const hs = this.ensureHotspot(input.targetId);
    hs.timeMs += SAMPLE_INTERVAL_MS;

    if (input.targetId.startsWith("seat_")) {
      const map = this.ensureHotspot("seat_map_svg");
      map.timeMs += SAMPLE_INTERVAL_MS;
    }
  }

  private detectEdgeStall(input: PointerSample): void {
    if (this.samples.length < 2) return;
    const prev = this.samples[this.samples.length - 2];
    const dt = (input.t - prev.t) / 1000;
    if (dt <= 0) return;
    // Perturbed (pre-filter) speed — ROM gain attenuates motion outside the box.
    const speed =
      Math.hypot(input.rawX - prev.rawX, input.rawY - prev.rawY) / dt;
    const marginX = input.viewportW * EDGE_MARGIN_FRAC;
    const marginY = input.viewportH * EDGE_MARGIN_FRAC;
    const nearScreenEdge =
      input.rawX < marginX ||
      input.rawX > input.viewportW - marginX ||
      input.rawY < marginY ||
      input.rawY > input.viewportH - marginY;

    const reachAttenuationPx = Math.hypot(
      input.intentX - input.rawX,
      input.intentY - input.rawY,
    );
    // Successful dwells on outer Confirm / sidebar must NOT flag ROM.
    // Only: (a) ROM reach attenuation, or (b) edge stall with no active target.
    const romAttenuation = reachAttenuationPx > 18;
    const idleEdgeStall =
      nearScreenEdge && speed < STALL_SPEED_PX_S && !input.targetId;

    if (!romAttenuation && !idleEdgeStall) return;
    if (romAttenuation && speed >= STALL_SPEED_PX_S * 2.5) return;

    const zone = zoneForPoint(
      input.rawX,
      input.rawY,
      input.viewportW,
      input.viewportH,
    );
    const hs = this.ensureHotspot(`edge_zone_${zone}`);
    hs.timeMs += SAMPLE_INTERVAL_MS;
  }

  noteTargetEnter(targetId: string, t: number): void {
    const pending = this.pendingOvershoot.get(targetId);
    if (pending && t - pending.exitT <= OVERSHOOT_REENTER_MS) {
      this.overshootCount += 1;
      const hs = this.ensureHotspot(targetId);
      hs.overshoots += 1;
      this.pendingOvershoot.delete(targetId);
    }
  }

  private detectMidas(click: DwellClickEvent): void {
    if (this.clicks.length < 2) return;
    const prev = this.clicks[this.clicks.length - 2];
    const dt = click.t - prev.t;

    const isUndo =
      click.group === "undo_back" ||
      click.targetId.includes("reset") ||
      click.targetId.includes("undo") ||
      click.targetId.includes("back");

    // Adjacent-seat misclick correction OR same-seat reselect thrash.
    // Window (2400ms) exceeds dwell+cooldown so consecutive seat dwells can fire.
    const seatCorrection =
      prev.group === "seat_selection" &&
      click.group === "seat_selection" &&
      dt <= MIDAS_SEAT_WINDOW_MS;

    const optionCorrection =
      prev.group === click.group &&
      prev.targetId !== click.targetId &&
      click.group === "ticket_count" &&
      dt <= MIDAS_WINDOW_MS;

    const unrelatedAdjacent =
      prev.group !== click.group &&
      !isUndo &&
      dt <= MIDAS_WINDOW_MS &&
      Math.hypot(click.x - prev.x, click.y - prev.y) < 120;

    if (isUndo && dt <= MIDAS_WINDOW_MS) {
      this.midasCount += 1;
      this.ensureHotspot(prev.targetId).misclicks += 1;
      return;
    }

    if (seatCorrection || optionCorrection || unrelatedAdjacent) {
      this.midasCount += 1;
      this.ensureHotspot(prev.targetId).misclicks += 1;
    }
  }

  private computeJitter(): number {
    // Per-hover-window RMS, then average — never pool distant targets together
    const windows: PointerSample[][] = [];
    let current: PointerSample[] = [];
    let windowTarget: string | null = null;

    const flush = () => {
      if (current.length < 3) {
        current = [];
        windowTarget = null;
        return;
      }
      const dur = current[current.length - 1].t - current[0].t;
      if (dur >= HOVER_JITTER_MIN_MS) windows.push(current);
      current = [];
      windowTarget = null;
    };

    for (const s of this.samples) {
      // Only stable dwell/hover samples — approach motion is not tremor.
      if (!s.targetId || s.dwellProgress < 0.25) {
        flush();
        continue;
      }
      // Split when target changes so seat→confirm travel isn't "jitter"
      if (windowTarget && s.targetId !== windowTarget) flush();
      if (!windowTarget) windowTarget = s.targetId;
      current.push(s);
    }
    flush();

    if (windows.length === 0) return 0;
    const scores = windows.map((w) => rmsFromPoints(w)).filter((v) => v > 0);
    if (scores.length === 0) return 0;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  private computePathEfficiency(): number {
    if (this.clicks.length < 2) return 1;
    let straight = 0;
    let path = 0;

    for (let i = 1; i < this.clicks.length; i++) {
      const a = this.clicks[i - 1];
      const b = this.clicks[i];
      const chord = Math.hypot(b.x - a.x, b.y - a.y);
      if (chord < 1) continue;
      straight += chord;

      const seg = this.samples.filter((s) => s.t >= a.t && s.t <= b.t);
      if (seg.length < 2) {
        path += chord;
        continue;
      }
      let segPath = 0;
      for (let j = 1; j < seg.length; j++) {
        segPath += Math.hypot(
          seg[j].x - seg[j - 1].x,
          seg[j].y - seg[j - 1].y,
        );
      }
      path += Math.max(segPath, chord);
    }

    if (path <= 1e-3 || straight <= 1e-3) return 1;
    return clamp(straight / path, 0, 1);
  }

  private computeEdgeStruggleZones(): EdgeStruggleLabel[] {
    const failByZone = new Map<EdgeZoneId, number>();
    const stallByZone = new Map<EdgeZoneId, number>();

    for (const v of this.visits) {
      if (v.completedDwell || v.exitT === null) continue;
      if (v.maxDwellProgress < OVERSHOOT_MIN_DWELL_PROGRESS) continue;
      const dur = v.exitT - v.enterT;
      if (dur >= OVERSHOOT_EXIT_MS) continue;
      const s = this.samples.find(
        (p) => p.t >= v.enterT && p.targetId === v.targetId,
      );
      if (!s) continue;
      const z = zoneForPoint(s.x, s.y, s.viewportW, s.viewportH);
      if (z === "center") continue;
      failByZone.set(z, (failByZone.get(z) ?? 0) + 1);
    }

    for (let i = 1; i < this.samples.length; i++) {
      const a = this.samples[i - 1];
      const b = this.samples[i];
      const dt = (b.t - a.t) / 1000;
      if (dt <= 0) continue;
      const speed = Math.hypot(b.rawX - a.rawX, b.rawY - a.rawY) / dt;
      const marginX = b.viewportW * EDGE_MARGIN_FRAC;
      const marginY = b.viewportH * EDGE_MARGIN_FRAC;
      const nearEdge =
        b.rawX < marginX ||
        b.rawX > b.viewportW - marginX ||
        b.rawY < marginY ||
        b.rawY > b.viewportH - marginY;
      const reachAttenuationPx = Math.hypot(
        b.intentX - b.rawX,
        b.intentY - b.rawY,
      );
      const romAttenuation = reachAttenuationPx > 18;
      const idleEdgeStall =
        nearEdge && speed < STALL_SPEED_PX_S && !b.targetId;
      if (!romAttenuation && !idleEdgeStall) continue;
      if (romAttenuation && speed >= STALL_SPEED_PX_S * 2.5) continue;
      const z = zoneForPoint(b.rawX, b.rawY, b.viewportW, b.viewportH);
      if (z === "center" && !romAttenuation) continue;
      stallByZone.set(z, (stallByZone.get(z) ?? 0) + 1);
    }

    // Hotspots from detectEdgeStall (ROM attenuation / idle edge stalls only).
    for (const [id, h] of this.hotspots) {
      if (!id.startsWith("edge_zone_") || h.timeMs < 300) continue;
      const z = id.replace("edge_zone_", "") as EdgeZoneId;
      stallByZone.set(z, (stallByZone.get(z) ?? 0) + Math.ceil(h.timeMs / 200));
    }

    const flagged = new Set<EdgeStruggleLabel>();
    const corners = [
      "top_left",
      "top_right",
      "bottom_left",
      "bottom_right",
    ] as const satisfies readonly EdgeZoneId[];
    for (const z of corners) {
      if ((failByZone.get(z) ?? 0) + (stallByZone.get(z) ?? 0) >= 3) {
        flagged.add(z);
      }
    }
    const edgeZones: EdgeZoneId[] = [
      "top_center",
      "middle_left",
      "middle_right",
      "bottom_center",
      ...corners,
    ];
    let edgeScore = 0;
    for (const z of edgeZones) {
      edgeScore += (failByZone.get(z) ?? 0) + (stallByZone.get(z) ?? 0);
    }
    if (edgeScore >= 8) flagged.add("edges");

    return Array.from(flagged);
  }

  private computeHotspots(): HotspotFriction[] {
    const list: HotspotFriction[] = [];
    for (const [element_id, h] of this.hotspots) {
      if (isStudyChrome(element_id)) continue;
      if (h.timeMs < 100 && h.overshoots === 0 && h.misclicks === 0) continue;
      list.push({
        element_id,
        overshoots: h.overshoots,
        misclicks: h.misclicks,
        time_spent_sec: Number((h.timeMs / 1000).toFixed(2)),
        completed: h.completed,
      });
    }
    list.sort((a, b) => b.time_spent_sec - a.time_spent_sec);
    return list.slice(0, 24);
  }
}

let engineSingleton: TelemetryEngine | null = null;

export function getTelemetryEngine(): TelemetryEngine {
  if (!engineSingleton) engineSingleton = new TelemetryEngine();
  return engineSingleton;
}

export function resetTelemetryEngine(): void {
  getTelemetryEngine().reset();
}

export { EMPTY_TELEMETRY_PROFILE };
