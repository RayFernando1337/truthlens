import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { createSession, type StageKey } from "@/hooks/truth-session-helpers";
import { fetchAnalysis } from "@/lib/api-client";
import { severityFromPulse, type ChunkSeverity } from "@/lib/pulse-utils";
import { makeSegment, splitIntoChunks } from "@/lib/segment-utils";
import type {
  AnalysisSnapshot,
  InputKind,
  PipelineStageStatus,
  PulseEntry,
  SegmentPulse,
  SessionHistoryEntry,
  SessionSummary,
  SourceAsset,
  TraceStage,
  TopicSegment,
  TranscriptSegment,
  TruthSession,
  VerificationRun,
} from "@/lib/types";

type TraceToken = { sessionId: string; stage: TraceStage; startedAt: number } | null;

export interface TruthSessionMem {
  segments: TranscriptSegment[];
  pulses: SegmentPulse[];
  chunkId: number;
  analysisReq: number;
  summaryReq: number;
  verifyReq: number;
  topicReq: number;
  queryReq: number;
  rollingAt: number | null;
  fullPassElapsed: number | null;
  sessionStart: number;
  lastSummarizedCount: number;
  era: number;
  summary: SessionSummary | null;
  snap: AnalysisSnapshot | null;
  session: TruthSession | null;
  pendingTraceOps: number;
  traceClosed: boolean;
}

export function createTruthSessionMem(): TruthSessionMem {
  return {
    segments: [],
    pulses: [],
    chunkId: 0,
    analysisReq: 0,
    summaryReq: 0,
    verifyReq: 0,
    topicReq: 0,
    queryReq: 0,
    rollingAt: null,
    fullPassElapsed: null,
    sessionStart: 0,
    lastSummarizedCount: 0,
    era: 0,
    summary: null,
    snap: null,
    session: null,
    pendingTraceOps: 0,
    traceClosed: false,
  };
}

export function resetTruthSessionMem(mem: TruthSessionMem): void {
  mem.segments = [];
  mem.pulses = [];
  mem.chunkId = 0;
  mem.analysisReq = 0;
  mem.summaryReq = 0;
  mem.verifyReq = 0;
  mem.topicReq = 0;
  mem.queryReq = 0;
  mem.rollingAt = null;
  mem.fullPassElapsed = null;
  mem.sessionStart = 0;
  mem.lastSummarizedCount = 0;
  mem.summary = null;
  mem.snap = null;
  mem.pendingTraceOps = 0;
  mem.traceClosed = false;
}

export function openTrackedSession(args: {
  mem: MutableRefObject<TruthSessionMem>;
  mode: TruthSession["mode"];
  inputKind: InputKind;
  fixtureKey?: string;
  resetState: () => void;
  closePreviousTrace: () => void;
  startTraceSession: (sessionId: string, inputKind: InputKind, fixtureKey?: string) => void;
  setSession: Dispatch<SetStateAction<TruthSession | null>>;
}) {
  const { mem, mode, inputKind, fixtureKey, resetState, closePreviousTrace, startTraceSession, setSession } = args;
  closePreviousTrace();
  const era = ++mem.current.era;
  resetState();
  const session = createSession(mode, inputKind);
  mem.current.session = session;
  mem.current.sessionStart = Date.now();
  setSession(session);
  startTraceSession(session.sessionId, inputKind, fixtureKey);
  return { era, session };
}

export async function runBatchAnalysis(args: {
  text: string;
  era: number;
  mem: MutableRefObject<TruthSessionMem>;
  setIsProcessing: Dispatch<SetStateAction<boolean>>;
  setProcessingChunk: Dispatch<SetStateAction<string | null>>;
  setStage: (key: StageKey, status: PipelineStageStatus) => void;
  setSnapshot: Dispatch<SetStateAction<AnalysisSnapshot | null>>;
  triggerVerification: () => Promise<void> | void;
  triggerTopicSegmentation: () => Promise<void> | void;
  beginTraceStage: (stage: TraceStage, input?: Record<string, unknown>) => TraceToken;
  endTraceStage: (
    token: TraceToken,
    status: "success" | "error",
    options?: { output?: Record<string, unknown>; error?: string },
  ) => void;
}) {
  const {
    text, era, mem, setIsProcessing, setProcessingChunk, setStage, setSnapshot,
    triggerVerification, triggerTopicSegmentation, beginTraceStage, endTraceStage,
  } = args;
  setIsProcessing(true);
  setProcessingChunk("Analyzing full text...");
  setStage("analysis", "running");
  mem.current.segments = splitIntoChunks(text).map((chunk, index) => makeSegment(`batch-${index}`, chunk, index));
  const trace = beginTraceStage("analysis", {
    mode: "batch",
    segmentCount: mem.current.segments.length,
    pulseCount: 0,
    hasSummary: false,
  });
  const result = await fetchAnalysis("batch", mem.current.segments);
  setProcessingChunk(null);
  setIsProcessing(false);
  if (era !== mem.current.era) return;
  if (!result) {
    setStage("analysis", "error");
    endTraceStage(trace, "error", { error: "Analysis request failed." });
    return;
  }
  mem.current.snap = result;
  setSnapshot(result);
  setStage("analysis", "success");
  endTraceStage(trace, "success", { output: batchTraceOutput(result) });
  void triggerVerification();
  void triggerTopicSegmentation();
}

function batchTraceOutput(result: AnalysisSnapshot): Record<string, unknown> {
  return {
    evidenceRows: result.evidenceTable.length,
    patterns: result.patterns.length,
    trajectoryPoints: result.trustTrajectory.length,
    mode: result.mode,
  };
}

export function restoreTrackedSession(args: {
  entry: SessionHistoryEntry;
  mem: MutableRefObject<TruthSessionMem>;
  resetState: () => void;
  closePreviousTrace: () => void;
  setSession: Dispatch<SetStateAction<TruthSession | null>>;
  setSnapshot: Dispatch<SetStateAction<AnalysisSnapshot | null>>;
  setVerificationRun: Dispatch<SetStateAction<VerificationRun | null>>;
  setTopicSegments: Dispatch<SetStateAction<TopicSegment[] | null>>;
}) {
  const {
    entry, mem, resetState, closePreviousTrace, setSession,
    setSnapshot, setVerificationRun, setTopicSegments,
  } = args;
  closePreviousTrace();
  ++mem.current.era;
  resetState();
  const session: TruthSession = {
    sessionId: entry.sessionId,
    mode: entry.mode,
    inputKind: entry.inputKind,
    createdAt: entry.createdAt,
    sourceAsset: entry.sourceAsset,
  };
  mem.current.session = session;
  mem.current.segments = [...entry.segments];
  setSession(session);
  if (entry.snapshot) {
    mem.current.snap = entry.snapshot;
    setSnapshot(entry.snapshot);
  }
  if (entry.verificationRun) setVerificationRun(entry.verificationRun);
  if (entry.topicSegments) setTopicSegments(entry.topicSegments);
}

export function attachSourceAsset(
  mem: MutableRefObject<TruthSessionMem>,
  session: TruthSession,
  sourceAsset: SourceAsset,
  setSession: Dispatch<SetStateAction<TruthSession | null>>,
): void {
  session.sourceAsset = sourceAsset;
  mem.current.session = session;
  setSession({ ...session });
}

export function getVoiceChunkSeverities(
  voiceTranscript: string[],
  pulseEntries: PulseEntry[],
): ChunkSeverity[] {
  return voiceTranscript.map((_, index) => {
    const entry = pulseEntries.find((pulse) => pulse.id === `voice-${index}`);
    return entry ? severityFromPulse(entry.result) : "ok";
  });
}

export function countFlags(pulseEntries: PulseEntry[]): number {
  return pulseEntries.reduce((sum, entry) => sum + entry.result.flags.length, 0);
}
