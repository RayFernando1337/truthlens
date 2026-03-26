import type { AnalysisSnapshot, InputKind, PipelineStageStatus, TruthSession } from "@/lib/types";

export type StageKey = "pulse" | "analysis" | "verification" | "summary" | "topics";
export type Pipeline = Record<StageKey, PipelineStageStatus>;

export const IDLE: Pipeline = {
  pulse: "idle", analysis: "idle", verification: "idle", summary: "idle", topics: "idle",
};

export function createSession(
  mode: TruthSession["mode"], inputKind: InputKind,
): TruthSession {
  return { sessionId: crypto.randomUUID(), mode, inputKind, createdAt: Date.now() };
}

export function analysisTraceOutput(d: AnalysisSnapshot): Record<string, unknown> {
  return {
    evidenceRows: d.evidenceTable.length,
    patterns: d.patterns.length,
    trajectoryPoints: d.trustTrajectory.length,
    mode: d.mode,
  };
}
