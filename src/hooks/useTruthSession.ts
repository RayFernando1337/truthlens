"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { AnalysisSnapshot, InputKind, PipelineStageStatus, PostAnalysisQueryResult, PostQueryType, PulseEntry, SegmentPulse, SessionSummary, TopicSegment, TranscriptSegment, TruthSession, VerificationRun } from "@/lib/types";
import { severityFromPulse, type ChunkSeverity } from "@/lib/pulse-utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import {
  shouldRunRollingAnalysis, shouldRunFullPass, getSlidingWindowSize,
} from "@/lib/pipeline-policy";
import { extractClaimCandidatesFromSnapshot } from "@/lib/claim-queue";
import { makeSegment, splitIntoChunks } from "@/lib/segment-utils";
import { fetchPulse, fetchAnalysis, fetchSummary, fetchVerification, fetchUrlExtract, fetchTopicSegments, fetchPostAnalysisQuery } from "@/lib/api-client";
// ─── Constants ────────────────────────────────────────
type StageKey = "pulse" | "analysis" | "verification" | "summary";
type Pipeline = Record<StageKey, PipelineStageStatus>;

const IDLE: Pipeline = {
  pulse: "idle", analysis: "idle", verification: "idle", summary: "idle",
};

function createSession(
  mode: TruthSession["mode"], inputKind: InputKind
): TruthSession {
  return { sessionId: crypto.randomUUID(), mode, inputKind, createdAt: Date.now() };
}
// ─── Hook ─────────────────────────────────────────────
export function useTruthSession() {
  const [session, setSession] = useState<TruthSession | null>(null);
  const [pulseEntries, setPulseEntries] = useState<PulseEntry[]>([]);
  const [snapshot, setSnapshot] = useState<AnalysisSnapshot | null>(null);
  const [runningSummary, setRunningSummary] = useState<SessionSummary | null>(null);
  const [verificationRun, setVerificationRun] = useState<VerificationRun | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline>(IDLE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [processingChunk, setProcessingChunk] = useState<string | null>(null);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string[]>([]);
  const [topicSegments, setTopicSegments] = useState<TopicSegment[] | null>(null);
  const [queryResult, setQueryResult] = useState<PostAnalysisQueryResult | null>(null);

  const mem = useRef({
    segments: [] as TranscriptSegment[], pulses: [] as SegmentPulse[],
    chunkId: 0, analysisReq: 0, summaryReq: 0, verifyReq: 0,
    topicReq: 0, queryReq: 0,
    rollingAt: null as number | null, fullPassElapsed: null as number | null,
    sessionStart: 0, lastSummarizedCount: 0, era: 0,
    summary: null as SessionSummary | null, snap: null as AnalysisSnapshot | null,
    session: null as TruthSession | null,
  });

  const setStage = useCallback((key: StageKey, status: PipelineStageStatus) =>
    setPipeline((prev) => ({ ...prev, [key]: status })), []);

  const resetState = useCallback(() => {
    setPulseEntries([]);
    setSnapshot(null);
    setRunningSummary(null);
    setVerificationRun(null);
    setVerificationError(null);
    setPipeline(IDLE);
    setVoiceTranscript([]);
    setProcessingChunk(null);
    setChunkProgress(null);
    setIsProcessing(false);
    setIsFetchingUrl(false);
    setTopicSegments(null);
    setQueryResult(null);
    const m = mem.current;
    m.segments = [];
    m.pulses = [];
    m.chunkId = 0;
    m.analysisReq = 0;
    m.summaryReq = 0;
    m.verifyReq = 0;
    m.topicReq = 0;
    m.queryReq = 0;
    m.rollingAt = null;
    m.fullPassElapsed = null;
    m.lastSummarizedCount = 0;
    m.summary = null;
    m.snap = null;
  }, []);
  // ─── Pipeline triggers ────────────────────────────
  const runSummaryUpdate = useCallback(async () => {
    const m = mem.current;
    const newSegs = m.segments.slice(m.lastSummarizedCount);
    if (newSegs.length === 0) return;
    const reqId = ++m.summaryReq;
    setStage("summary", "running");
    const result = await fetchSummary(m.summary ?? undefined, newSegs);
    if (reqId !== m.summaryReq) return;
    if (result) {
      m.summary = result;
      m.lastSummarizedCount = m.segments.length;
      setRunningSummary(result);
      setStage("summary", "success");
    } else {
      setStage("summary", "error");
    }
  }, [setStage]);

  const triggerVerification = useCallback(async () => {
    const m = mem.current;
    if (!m.snap || !m.session) return;
    const claims = extractClaimCandidatesFromSnapshot(m.snap);
    if (claims.length === 0) {
      setVerificationRun(null);
      setVerificationError(null);
      setStage("verification", "idle");
      return;
    }
    const reqId = ++m.verifyReq;
    setVerificationRun(null);
    setVerificationError(null);
    setStage("verification", "running");
    const result = await fetchVerification(m.session.sessionId, claims);
    if (reqId !== m.verifyReq) return;
    if (result?.ok) {
      setVerificationRun(result.data);
      setVerificationError(null);
      setStage("verification", "success");
    } else if (result) {
      setVerificationRun(null);
      setVerificationError(result.error.message);
      setStage("verification", "error");
    } else {
      setVerificationRun(null);
      setVerificationError(null);
      setStage("verification", "error");
    }
  }, [setStage]);

  const triggerTopicSegmentation = useCallback(async () => {
    const m = mem.current;
    if (m.segments.length === 0) return;
    const era = m.era;
    const reqId = ++m.topicReq;
    const flagData = m.pulses.map((p) => ({ segmentId: p.segmentId, flags: p.flags.map((f) => f.type) }));
    const result = await fetchTopicSegments(
      m.segments, flagData.length > 0 ? flagData : undefined, m.summary ?? undefined,
    );
    if (era !== m.era || reqId !== m.topicReq) return;
    if (result) setTopicSegments(result);
  }, []);

  const submitQuery = useCallback(async (query: string, queryType: PostQueryType) => {
    const m = mem.current;
    if (m.segments.length === 0) return null;
    const era = m.era;
    const reqId = ++m.queryReq;
    setQueryResult(null);
    const result = await fetchPostAnalysisQuery(
      query,
      queryType,
      m.segments,
      m.summary ?? undefined,
      topicSegments ?? undefined,
    );
    if (era !== m.era || reqId !== m.queryReq) return null;
    if (result) setQueryResult(result);
    return result;
  }, [topicSegments]);

  const runAnalysis = useCallback(
    async (mode: "streaming" | "full") => {
      const m = mem.current;
      if (m.segments.length === 0) return;
      const segments =
        mode === "streaming"
          ? m.segments.slice(-getSlidingWindowSize(m.segments.length))
          : [...m.segments];
      const reqId = ++m.analysisReq;
      setStage("analysis", "running");

      const result = await fetchAnalysis(
        mode, segments, [...m.pulses], m.summary ?? undefined,
      );

      if (reqId !== m.analysisReq) return;
      if (mode === "streaming") m.rollingAt = Date.now();
      else m.fullPassElapsed = Date.now() - m.sessionStart;

      if (result) {
        m.snap = result;
        setSnapshot(result);
        setStage("analysis", "success");
        void runSummaryUpdate();
        if (mode === "full") void triggerVerification();
      } else {
        setStage("analysis", "error");
      }
    },
    [setStage, runSummaryUpdate, triggerVerification],
  );

  // ─── Voice chunk handler ──────────────────────────

  const handleVoiceChunk = useCallback(
    async (text: string) => {
      const m = mem.current;
      setVoiceTranscript((prev) => [...prev, text]);
      const segmentId = `voice-${m.chunkId++}`;
      const seg = makeSegment(segmentId, text, m.segments.length);
      const prev = m.segments.slice(-3);
      m.segments.push(seg);

      setProcessingChunk(text);
      setStage("pulse", "running");
      const result = await fetchPulse(seg, prev);
      if (result) {
        setPulseEntries((p) => [...p, { id: segmentId, chunk: text, result }]);
        m.pulses.push({ ...result, segmentId });
        setStage("pulse", "success");
      } else {
        setStage("pulse", "error");
      }
      setProcessingChunk(null);

      const now = Date.now();
      if (shouldRunRollingAnalysis(m.segments.length, m.rollingAt, now)) {
        void runAnalysis("streaming");
      }
      const elapsed = now - m.sessionStart;
      if (shouldRunFullPass(elapsed, m.fullPassElapsed)) {
        void runAnalysis("full");
      }
    },
    [setStage, runAnalysis],
  );

  const { isRecording, error: voiceError, startRecording, stopRecording } =
    useVoiceInput({ onChunkTranscribed: handleVoiceChunk });

  // ─── Session lifecycle ────────────────────────────

  const handleStartRecording = useCallback(() => {
    ++mem.current.era;
    resetState();
    const sess = createSession("streaming", "voice");
    mem.current.session = sess;
    mem.current.sessionStart = Date.now();
    setSession(sess);
    startRecording();
  }, [resetState, startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();
    const m = mem.current;
    if (m.session) {
      m.session = { ...m.session, stoppedAt: Date.now() };
      setSession(m.session);
    }
    if (m.segments.length === 0) return;
    void runAnalysis("full");
    void triggerTopicSegmentation();
  }, [stopRecording, runAnalysis, triggerTopicSegmentation]);

  const handleAnalyze = useCallback(
    async (text: string, inputKind?: InputKind) => {
      const m = mem.current;
      const era = ++m.era;
      resetState();
      const sess = createSession("batch", inputKind ?? "paste");
      m.session = sess;
      m.sessionStart = Date.now();
      setSession(sess);
      setIsProcessing(true);
      setProcessingChunk("Analyzing full text\u2026");
      setStage("analysis", "running");

      const chunks = splitIntoChunks(text);
      m.segments = chunks.map((c, i) => makeSegment(`batch-${i}`, c, i));

      const result = await fetchAnalysis("batch", m.segments);

      setProcessingChunk(null);
      setIsProcessing(false);

      if (era !== m.era) return;
      if (result) {
        m.snap = result;
        setSnapshot(result);
        setStage("analysis", "success");
        void triggerVerification();
        void triggerTopicSegmentation();
      } else {
        setStage("analysis", "error");
      }
    },
    [resetState, setStage, triggerVerification, triggerTopicSegmentation],
  );

  const handleFetchUrl = useCallback(async (url: string) => {
    setIsFetchingUrl(true);
    const text = await fetchUrlExtract(url);
    setIsFetchingUrl(false);
    if (text) void handleAnalyze(text, "url");
  }, [handleAnalyze]);

  // ─── Derived selectors ────────────────────────────

  const voiceChunkSeverities = useMemo((): ChunkSeverity[] => voiceTranscript.map((_, i) => {
    const e = pulseEntries.find((p) => p.id === `voice-${i}`);
    return e ? severityFromPulse(e.result) : "ok";
  }), [voiceTranscript, pulseEntries]);

  const seekTranscriptChunk = useCallback((index: number) => {
    document.getElementById(`tl-transcript-chunk-${index}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const flagCount = useMemo(
    () => pulseEntries.reduce((sum, e) => sum + e.result.flags.length, 0),
    [pulseEntries],
  );

  const isAnalysisLoading = pipeline.analysis === "running";

  return {
    session, snapshot, runningSummary, verificationRun, verificationError, topicSegments, queryResult, pipelineStatus: pipeline, flagCount, isAnalysisLoading, pulseEntries,
    voiceTranscript, voiceChunkSeverities, isRecording, voiceError, isProcessing, isFetchingUrl, processingChunk, chunkProgress,
    handleAnalyze, handleFetchUrl, handleStartRecording, handleStopRecording, triggerVerification, triggerTopicSegmentation, submitQuery, seekTranscriptChunk,
  };
}

export type TruthSessionState = ReturnType<typeof useTruthSession>;
