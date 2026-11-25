import {
  AdaptedUISpecSchema,
  TASK_SCHEMA,
  type AdaptedUISpec,
} from "@/lib/genui/schema";
import { buildFallbackSpec } from "@/lib/genui/fallbackSpecs";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/genui/prompts";
import { extractJsonObject } from "@/lib/genui/parseLlmJson";
import { coerceAdaptedSpecCandidate } from "@/lib/genui/coerceSpec";
import type { TelemetryProfile } from "@/lib/telemetry/types";

const GEMINI_OPENAI_BASE =
  "https://generativelanguage.googleapis.com/v1beta/openai/";

export type AdaptRunResult = {
  spec: AdaptedUISpec;
  mode: "Live LLM" | "Deterministic Fallback";
  error?: string;
  provider?: string;
  /** True when LLM JSON needed coerceAdaptedSpecCandidate before Zod. */
  coerced?: boolean;
  /** True when final spec came from deterministic composer. */
  used_fallback?: boolean;
  latency_ms?: number;
};

function resolveBrowserLlm(): {
  apiKey: string;
  baseURL: string;
  model: string;
  provider: string;
} | null {
  const geminiKey =
    process.env.NEXT_PUBLIC_GEMINI_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY?.trim() ||
    "";
  if (geminiKey) {
    return {
      apiKey: geminiKey,
      baseURL:
        process.env.NEXT_PUBLIC_OPENAI_BASE_URL?.trim() || GEMINI_OPENAI_BASE,
      model:
        process.env.NEXT_PUBLIC_LLM_MODEL?.trim() || "gemini-3.5-flash-lite",
      provider: "gemini",
    };
  }
  return null;
}

/**
 * Browser-side Live LLM (GitHub Pages has no server routes).
 * Prefer restricting the AI Studio key by HTTP referrer.
 */
export async function runAdapt(
  telemetry: Partial<TelemetryProfile>,
  taskSchema: unknown = TASK_SCHEMA,
): Promise<AdaptRunResult> {
  const started = Date.now();
  const cfg = resolveBrowserLlm();
  if (!cfg) {
    return {
      spec: buildFallbackSpec(telemetry),
      mode: "Deterministic Fallback",
      error: "NEXT_PUBLIC_GEMINI_API_KEY missing (using composer fallback)",
      used_fallback: true,
      latency_ms: Date.now() - started,
    };
  }

  const timeoutMs = 25_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${cfg.baseURL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt() },
          {
            role: "user",
            content: buildUserPrompt(telemetry, taskSchema),
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        spec: buildFallbackSpec(telemetry),
        mode: "Deterministic Fallback",
        error: `Gemini HTTP ${res.status}: ${errText.slice(0, 120)}`,
        provider: cfg.provider,
        used_fallback: true,
        latency_ms: Date.now() - started,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      return {
        spec: buildFallbackSpec(telemetry),
        mode: "Deterministic Fallback",
        error: "Empty LLM response",
        provider: cfg.provider,
        used_fallback: true,
        latency_ms: Date.now() - started,
      };
    }

    let json: unknown;
    try {
      json = extractJsonObject(content);
    } catch {
      const preview = content.replace(/\s+/g, " ").slice(0, 80);
      return {
        spec: buildFallbackSpec(telemetry),
        mode: "Deterministic Fallback",
        error: `LLM returned non-JSON (${preview}…)`,
        provider: cfg.provider,
        used_fallback: true,
        latency_ms: Date.now() - started,
      };
    }

    const direct = AdaptedUISpecSchema.safeParse(json);
    const coercedCandidate = coerceAdaptedSpecCandidate(json);
    const validated = direct.success
      ? direct
      : AdaptedUISpecSchema.safeParse(coercedCandidate);
    const coerced = !direct.success && validated.success;

    if (!validated.success) {
      return {
        spec: buildFallbackSpec(telemetry),
        mode: "Deterministic Fallback",
        error: `LLM JSON failed Zod: ${validated.error.issues[0]?.message ?? "invalid"}`,
        provider: cfg.provider,
        used_fallback: true,
        coerced: true,
        latency_ms: Date.now() - started,
      };
    }

    return {
      spec: validated.data,
      mode: "Live LLM",
      provider: cfg.provider,
      coerced,
      used_fallback: false,
      latency_ms: Date.now() - started,
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "LLM timeout"
          : err.message
        : "LLM call failed";
    return {
      spec: buildFallbackSpec(telemetry),
      mode: "Deterministic Fallback",
      error: message,
      provider: cfg.provider,
      used_fallback: true,
      latency_ms: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}
