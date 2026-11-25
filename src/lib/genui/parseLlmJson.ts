/**
 * Extract a JSON object from local LLM chat output (Qwen/Optiq often wraps
 * think tags, markdown fences, or prose around the payload).
 */
export function extractJsonObject(raw: string): unknown {
  const cleaned = stripNoise(raw);
  const candidates = [
    cleaned,
    ...fenceBodies(cleaned),
    ...braceSlices(cleaned),
  ];

  let lastErr: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("LLM returned non-JSON");
}

function stripNoise(raw: string): string {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/^\s*Assistant:\s*/i, "")
    .trim();
}

function fenceBodies(text: string): string[] {
  const out: string[] = [];
  const re = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const body = m[1]?.trim();
    if (body) out.push(body);
  }
  return out;
}

/** Prefer outermost object; also try innermost large objects. */
function braceSlices(text: string): string[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return [];

  const slices: string[] = [text.slice(start, end + 1)];

  // Walk balanced braces for the first complete object
  let depth = 0;
  let begin = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      if (depth === 0) begin = i;
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0 && begin >= 0) {
        slices.unshift(text.slice(begin, i + 1));
        break;
      }
    }
  }

  return slices;
}
