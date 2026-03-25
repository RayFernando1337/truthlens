import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { fetchAnalysis, fetchPulse } from "@/lib/api-client";
import { getSlidingWindowSize, shouldRunFullPass, shouldRunRollingAnalysis } from "@/lib/pipeline-policy";
import { makeSegment } from "@/lib/segment-utils";
import type {
  AnalysisSnapshot,
  PipelineStageStatus,
  PulseEntry,
  PulseResult,
  TraceStage,
} from "@/lib/types";
import type { StageKey } from "@/hooks/truth-session-helpers";
import type { TruthSessionMem } from "./truth-session-runtime";

type TraceToken = { sessionId: string; stage: TraceStage; startedAt: number } | null;

export async function runAnalysisPass(args: {
  mode: "streaming" | "full";
  mem: MutableRefObject<TruthSessionMem>;
  setStage: (key: StageKey, status: PipelineStageStatus) => void;
  setSnapshot: Dispatch<SetStateAction<AnalysisSnapshot | null>>;
  beginTraceStage: (stage: "analysis", input?: Record<string, unknown>) => TraceToken;
  endTraceStage: (
    token: TraceToken,
    status: "success" | "error",
    options?: { output?: Record<string, unknown>; error?: string },
  ) => void;
  runSummaryUpdate: () => Promise<void> | void;
  triggerVerification: () => Promise<void> | void;
}) {
  const { mode, mem, setStage, setSnapshot, beginTraceStage, endTraceStage, runSummaryUpdate, triggerVerification } = args;
  if (mem.current.segments.length === 0) return;
  const segments = mode === "streaming"
    ? mem.current.segments.slice(-getSlidingWindowSize(mem.current.segments.length))
    : [...mem.current.segments];
  const reqId = ++mem.current.analysisReq;
  setStage("analysis", "running");
  const trace = beginTraceStage("analysis", {
    mode,
    segmentCount: segments.length,
    pulseCount: mem.current.pulses.length,
    hasSummary: !!mem.current.summary,
  });
  const result = await fetchAnalysis(mode, segments, [...mem.current.pulses], mem.current.summary ?? undefined);
  if (reqId !== mem.current.analysisReq) return;
  if (mode === "streaming") mem.current.rollingAt = Date.now();
  else mem.current.fullPassElapsed = Date.now() - mem.current.sessionStart;
  if (!result) {
    setStage("analysis", "error");
    endTraceStage(trace, "error", { error: "Analysis request failed." });
    return;
  }
  mem.current.snap = result;
  setSnapshot(result);
  setStage("analysis", "success");
  endTraceStage(trace, "success", {
    output: {
      evidenceRows: result.evidenceTable.length,
      patterns: result.patterns.length,
      trajectoryPoints: result.trustTrajectory.length,
      mode: result.mode,
    },
  });
  void runSummaryUpdate();
  if (mode === "full") void triggerVerification();
}

export async function processVoiceChunk(args: {
  text: string;
  mem: MutableRefObject<TruthSessionMem>;
  setVoiceTranscript: Dispatch<SetStateAction<string[]>>;
  setPulseEntries: Dispatch<SetStateAction<PulseEntry[]>>;
  setProcessingChunk: Dispatch<SetStateAction<string | null>>;
  setStage: (key: StageKey, status: PipelineStageStatus) => void;
  beginTraceStage: (stage: "pulse", input?: Record<string, unknown>) => TraceToken;
  endTraceStage: (
    token: TraceToken,
    status: "success" | "error",
    options?: { output?: Record<string, unknown>; error?: string },
  ) => void;
  runAnalysis: (mode: "streaming" | "full") => Promise<void> | void;
}) {
  const { text, mem, setVoiceTranscript, setPulseEntries, setProcessingChunk, setStage, beginTraceStage, endTraceStage, runAnalysis } = args;
  setVoiceTranscript((prev) => [...prev, text]);
  const segmentId = `voice-${mem.current.chunkId++}`;
  const segment = makeSegment(segmentId, text, mem.current.segments.length);
  const previousSegments = mem.current.segments.slice(-3);
  mem.current.segments.push(segment);
  setProcessingChunk(text);
  setStage("pulse", "running");
  const trace = beginTraceStage("pulse", {
    segmentId,
    previousSegmentCount: previousSegments.length,
    textLength: text.length,
  });
  const result = await fetchPulse(segment, previousSegments);
  if (!result) {
    setStage("pulse", "error");
    endTraceStage(trace, "error", { error: "Pulse request failed." });
    setProcessingChunk(null);
    return;
  }
  setPulseEntries((prev) => [...prev, { id: segmentId, chunk: text, result }]);
  mem.current.pulses.push({ ...result, segmentId });
  setStage("pulse", "success");
  endTraceStage(trace, "success", { output: pulseTraceOutput(result) });
  setProcessingChunk(null);
  const now = Date.now();
  if (shouldRunRollingAnalysis(mem.current.segments.length, mem.current.rollingAt, now)) {
    void runAnalysis("streaming");
  }
  if (shouldRunFullPass(now - mem.current.sessionStart, mem.current.fullPassElapsed)) {
    void runAnalysis("full");
  }
}

function pulseTraceOutput(result: PulseResult): Record<string, unknown> {
  return {
    claims: result.claims.length,
    flags: result.flags.length,
    confidence: result.confidence,
  };
}
