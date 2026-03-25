import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { extractClaimCandidatesFromSnapshot } from "@/lib/claim-queue";
import { fetchSummary, fetchTopicSegments, fetchVerification } from "@/lib/api-client";
import type { StageKey } from "@/hooks/truth-session-helpers";
import type {
  PipelineStageStatus,
  SessionSummary,
  TopicSegment,
  TraceStage,
  VerificationRun,
} from "@/lib/types";
import type { TruthSessionMem } from "./truth-session-runtime";

type TraceToken = { sessionId: string; stage: TraceStage; startedAt: number } | null;

export async function runSummaryUpdate(args: {
  mem: MutableRefObject<TruthSessionMem>;
  setStage: (key: StageKey, status: PipelineStageStatus) => void;
  setRunningSummary: Dispatch<SetStateAction<SessionSummary | null>>;
  beginTraceStage: (stage: "summary", input?: Record<string, unknown>) => TraceToken;
  endTraceStage: (
    token: TraceToken,
    status: "success" | "error",
    options?: { output?: Record<string, unknown>; error?: string },
  ) => void;
}) {
  const { mem, setStage, setRunningSummary, beginTraceStage, endTraceStage } = args;
  const newSegments = mem.current.segments.slice(mem.current.lastSummarizedCount);
  if (newSegments.length === 0) return;
  const reqId = ++mem.current.summaryReq;
  setStage("summary", "running");
  const trace = beginTraceStage("summary", {
    segmentCount: newSegments.length,
    priorSummarySegments: mem.current.summary?.segmentsCovered ?? 0,
  });
  const result = await fetchSummary(mem.current.summary ?? undefined, newSegments);
  if (reqId !== mem.current.summaryReq) return;
  if (!result) {
    setStage("summary", "error");
    endTraceStage(trace, "error", { error: "Summary request failed." });
    return;
  }
  mem.current.summary = result;
  mem.current.lastSummarizedCount = mem.current.segments.length;
  setRunningSummary(result);
  setStage("summary", "success");
  endTraceStage(trace, "success", {
    output: {
      segmentsCovered: result.segmentsCovered,
      developingThreads: result.developingThreads.length,
    },
  });
}

export async function triggerVerification(args: {
  mem: MutableRefObject<TruthSessionMem>;
  setStage: (key: StageKey, status: PipelineStageStatus) => void;
  setVerificationRun: Dispatch<SetStateAction<VerificationRun | null>>;
  setVerificationError: Dispatch<SetStateAction<string | null>>;
  beginTraceStage: (stage: "verification", input?: Record<string, unknown>) => TraceToken;
  endTraceStage: (
    token: TraceToken,
    status: "success" | "error",
    options?: { output?: Record<string, unknown>; error?: string },
  ) => void;
}) {
  const { mem, setStage, setVerificationRun, setVerificationError, beginTraceStage, endTraceStage } = args;
  if (!mem.current.snap || !mem.current.session) return;
  const claims = extractClaimCandidatesFromSnapshot(mem.current.snap);
  if (claims.length === 0) {
    setVerificationRun(null);
    setVerificationError(null);
    setStage("verification", "idle");
    return;
  }
  const reqId = ++mem.current.verifyReq;
  setVerificationRun(null);
  setVerificationError(null);
  setStage("verification", "running");
  const trace = beginTraceStage("verification", {
    claimCount: claims.length,
    evidenceRows: mem.current.snap.evidenceTable.length,
  });
  const result = await fetchVerification(mem.current.session.sessionId, claims);
  if (reqId !== mem.current.verifyReq) return;
  if (result?.ok) {
    setVerificationRun(result.data);
    setVerificationError(null);
    setStage("verification", "success");
    endTraceStage(trace, "success", {
      output: {
        status: result.data.status,
        totalClaims: result.data.stats.totalClaims,
        llmChecked: result.data.stats.llmChecked,
        webSearched: result.data.stats.webSearched,
        capped: result.data.stats.capped,
      },
    });
    return;
  }
  setVerificationRun(null);
  setVerificationError(result?.error.message ?? null);
  setStage("verification", "error");
  endTraceStage(trace, "error", {
    error: result?.error.message ?? "Verification request failed.",
  });
}

export async function triggerTopicSegmentation(args: {
  mem: MutableRefObject<TruthSessionMem>;
  setStage: (key: StageKey, status: PipelineStageStatus) => void;
  setTopicSegments: Dispatch<SetStateAction<TopicSegment[] | null>>;
  beginTraceStage: (stage: "topics", input?: Record<string, unknown>) => TraceToken;
  endTraceStage: (
    token: TraceToken,
    status: "success" | "error",
    options?: { output?: Record<string, unknown>; error?: string },
  ) => void;
}) {
  const { mem, setStage, setTopicSegments, beginTraceStage, endTraceStage } = args;
  if (mem.current.segments.length === 0) return;
  setStage("topics", "running");
  const era = mem.current.era;
  const reqId = ++mem.current.topicReq;
  const flagData = mem.current.pulses.map((pulse) => ({
    segmentId: pulse.segmentId,
    flags: pulse.flags.map((flag) => flag.type),
  }));
  const trace = beginTraceStage("topics", {
    segmentCount: mem.current.segments.length,
    flaggedSegments: flagData.length,
    hasSummary: !!mem.current.summary,
  });
  const result = await fetchTopicSegments(
    mem.current.segments,
    flagData.length > 0 ? flagData : undefined,
    mem.current.summary ?? undefined,
  );
  if (era !== mem.current.era || reqId !== mem.current.topicReq) return;
  if (!result) {
    setStage("topics", "error");
    endTraceStage(trace, "error", { error: "Topic segmentation failed." });
    return;
  }
  setTopicSegments(result);
  setStage("topics", "success");
  endTraceStage(trace, "success", { output: { segmentCount: result.length } });
}
