import type { InputKind, PipelineStageStatus, TruthSession } from "@/lib/types";

export type StageKey = "pulse" | "analysis" | "verification" | "summary";
export type Pipeline = Record<StageKey, PipelineStageStatus>;

export const IDLE: Pipeline = {
  pulse: "idle", analysis: "idle", verification: "idle", summary: "idle",
};

export function createSession(
  mode: TruthSession["mode"], inputKind: InputKind,
): TruthSession {
  return { sessionId: crypto.randomUUID(), mode, inputKind, createdAt: Date.now() };
}
