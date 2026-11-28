import type { TelemetryProfile } from "@/lib/telemetry/types";
import type { AdaptedUISpec } from "@/lib/genui/schema";
import {
  metricsFromProfile,
  scoreSession,
  type MetricSnapshot,
} from "@/lib/telemetry/sessionScore";
import { buildCrowdSeedSessions } from "@/lib/study/crowdSeed";

const STORAGE_KEY = "gaze_adaptive_session_history_v1";

export type StoredSession = {
  id: string;
  saved_at_iso: string;
  participant_id?: string;
  telemetry: TelemetryProfile;
  metrics: MetricSnapshot;
  score_100: number;
  personal_spec: AdaptedUISpec;
};

export function loadSessionHistory(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Ensures diverse prior sessions exist in localStorage so crowd-informed
 * GenUI differs from a single personal run on a fresh browser.
 */
export function ensureCrowdHistorySeed(): void {
  if (typeof window === "undefined") return;
  try {
    const prev = loadSessionHistory();
    if (prev.some((h) => h.id.startsWith("seed_"))) return;
    const seeds = buildCrowdSeedSessions();
    const next = [...seeds, ...prev].slice(-40);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
}

export function saveSessionToHistory(entry: {
  telemetry: TelemetryProfile;
  personal_spec: AdaptedUISpec;
  participant_id?: string;
}): StoredSession {
  const scored = scoreSession(entry.telemetry);
  const row: StoredSession = {
    id: `sess_${Date.now()}`,
    saved_at_iso: new Date().toISOString(),
    participant_id: entry.participant_id,
    telemetry: entry.telemetry,
    metrics: scored.metrics,
    score_100: scored.score_100,
    personal_spec: entry.personal_spec,
  };
  const prev = loadSessionHistory();
  const next = [...prev, row].slice(-40);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return row;
}

export function clearSessionHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function aggregateProfiles(
  history: StoredSession[],
): Partial<TelemetryProfile>[] {
  return history.map((h) => h.telemetry);
}

export { metricsFromProfile };
