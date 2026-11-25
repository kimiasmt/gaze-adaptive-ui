/**
 * MediaPipe / TFLite logs benign INFO lines via console.error, which Next.js
 * surfaces as a red overlay. Patch console while head tracking is active.
 */

const BENIGN =
  /Created TensorFlow Lite XNNPACK delegate|TensorFlow Lite.*delegate|INFO:\s/i;

type ConsoleMethod = "error" | "warn" | "log" | "info";

const methods: ConsoleMethod[] = ["error", "warn", "log", "info"];
const originals = new Map<ConsoleMethod, (...args: unknown[]) => void>();
let patchCount = 0;

function isBenign(args: unknown[]): boolean {
  const text = args
    .map((a) => (typeof a === "string" ? a : String(a)))
    .join(" ");
  return BENIGN.test(text);
}

/** Reference-counted console patch for the lifetime of HeadTracker sessions. */
export function quietTfLiteConsole(): () => void {
  if (patchCount === 0) {
    for (const method of methods) {
      const original = console[method].bind(console) as (
        ...args: unknown[]
      ) => void;
      originals.set(method, original);
      console[method] = ((...args: unknown[]) => {
        if (isBenign(args)) return;
        original(...args);
      }) as typeof console.error;
    }
  }
  patchCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    patchCount = Math.max(0, patchCount - 1);
    if (patchCount === 0) {
      for (const method of methods) {
        const original = originals.get(method);
        if (original) console[method] = original as typeof console.error;
      }
      originals.clear();
    }
  };
}

export function withQuietTfLiteLogs<T>(fn: () => T): T {
  const release = quietTfLiteConsole();
  try {
    return fn();
  } finally {
    release();
  }
}

export async function withQuietTfLiteLogsAsync<T>(
  fn: () => Promise<T>,
): Promise<T> {
  const release = quietTfLiteConsole();
  try {
    return await fn();
  } finally {
    release();
  }
}
