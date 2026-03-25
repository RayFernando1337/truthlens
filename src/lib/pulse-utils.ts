import type { PulseFlag, PulseResult } from "@/lib/types";

export type ChunkSeverity = "ok" | "warn" | "flag";

const HIGH_SEVERITY_TYPES: ReadonlySet<PulseFlag["type"]> = new Set([
  "logic",
  "contradiction",
  "stat",
  "attribution",
]);

const WARNING_TYPES: ReadonlySet<PulseFlag["type"]> = new Set([
  "vague",
  "prediction",
  "emotional-appeal",
  "cognitive-bias",
]);

/**
 * Visual severity for transcript borders / pulse strip dots.
 * ok = no flags, warn = vague/prediction, flag = strong skepticism signals
 */
export function severityFromFlags(flags: PulseFlag[]): ChunkSeverity {
  if (flags.length === 0) return "ok";
  if (flags.some((f) => HIGH_SEVERITY_TYPES.has(f.type))) return "flag";
  if (flags.some((f) => WARNING_TYPES.has(f.type))) return "warn";
  return "ok";
}

export function severityFromPulse(result: PulseResult | undefined): ChunkSeverity {
  if (!result) return "ok";
  return severityFromFlags(result.flags);
}
