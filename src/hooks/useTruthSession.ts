"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { AnalysisSnapshot, InputKind, PipelineStageStatus, PostAnalysisQueryResult, PostQueryType, PulseEntry, SessionHistoryEntry, SessionSummary, SourceAsset, TopicSegment, TruthSession, VerificationRun } from "@/lib/types";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { fetchUrlExtract, fetchPostAnalysisQuery } from "@/lib/api-client";
import { buildHistoryEntry, saveSession } from "@/lib/session-history";
import { IDLE, type StageKey, type Pipeline } from "@/hooks/truth-session-helpers";
import {
  attachSourceAsset,
  countFlags,
  createTruthSessionMem,
  getVoiceChunkSeverities,
  openTrackedSession,
  resetTruthSessionMem,
  restoreTrackedSession,
  retryBatchAnalysis,
  runBatchAnalysis,
} from "@/hooks/truth-session-runtime";
import {
  runSummaryUpdate as runSummaryUpdateTask,
  triggerTopicSegmentation as triggerTopicSegmentationTask,
  triggerVerification as triggerVerificationTask,
} from "@/hooks/truth-session-pipeline";
import { processVoiceChunk, runAnalysisPass } from "@/hooks/truth-session-streaming";
import { useTruthSessionTrace } from "@/hooks/useTruthSessionTrace";
export function useTruthSession() {
  const [session, setSession] = useState<TruthSession | null>(null);
  const [pulseEntries, setPulseEntries] = useState<PulseEntry[]>([]);
  const [snapshot, setSnapshot] = useState<AnalysisSnapshot | null>(null);
  const [runningSummary, setRunningSummary] = useState<SessionSummary | null>(null);
  const [verificationRun, setVerificationRun] = useState<VerificationRun | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline>(IDLE);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [processingChunk, setProcessingChunk] = useState<string | null>(null);
  const [chunkProgress, setChunkProgress] = useState<{ current: number; total: number } | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState<string[]>([]);
  const [topicSegments, setTopicSegments] = useState<TopicSegment[] | null>(null);
  const [queryResult, setQueryResult] = useState<PostAnalysisQueryResult | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const mem = useRef(createTruthSessionMem());
  const recordingState = useRef(false);

  const setStage = useCallback((key: StageKey, status: PipelineStageStatus) =>
    setPipeline((prev) => ({ ...prev, [key]: status })), []);

  const resetState = useCallback(() => {
    setSession(null);
    setPulseEntries([]);
    setSnapshot(null);
    setRunningSummary(null);
    setVerificationRun(null);
    setVerificationError(null);
    setAnalysisError(null);
    setPipeline(IDLE);
    setVoiceTranscript([]);
    setProcessingChunk(null);
    setChunkProgress(null);
    setIsProcessing(false);
    setIsFetchingUrl(false);
    setTopicSegments(null);
    setQueryResult(null);
    mem.current.session = null;
    resetTruthSessionMem(mem.current);
  }, []);
  const { maybeFinishTrace, closePreviousTrace, startTraceSession, beginTraceStage, endTraceStage } = useTruthSessionTrace(mem, isFetchingUrl, recordingState);

  const clearSession = useCallback(() => {
    closePreviousTrace();
    mem.current.era += 1;
    resetState();
    setResetSignal((value) => value + 1);
  }, [closePreviousTrace, resetState]);

  const runSummaryUpdate = useCallback(async () => {
    await runSummaryUpdateTask({
      mem,
      setStage,
      setRunningSummary,
      beginTraceStage,
      endTraceStage,
    });
  }, [beginTraceStage, endTraceStage, setStage]);

  const triggerVerification = useCallback(async () => {
    await triggerVerificationTask({
      mem,
      setStage,
      setVerificationRun,
      setVerificationError,
      beginTraceStage,
      endTraceStage,
    });
  }, [beginTraceStage, endTraceStage, setStage]);

  const triggerTopicSegmentation = useCallback(async () => {
    await triggerTopicSegmentationTask({
      mem,
      setStage,
      setTopicSegments,
      beginTraceStage,
      endTraceStage,
    });
  }, [beginTraceStage, endTraceStage, setStage]);

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

  const runAnalysis = useCallback(async (mode: "streaming" | "full") => {
    await runAnalysisPass({ mode, mem, setStage, setSnapshot, setAnalysisError, beginTraceStage, endTraceStage, runSummaryUpdate, triggerVerification });
  }, [beginTraceStage, endTraceStage, setStage, runSummaryUpdate, triggerVerification]);
  const handleVoiceChunk = useCallback(async (text: string) => {
    await processVoiceChunk({ text, mem, setVoiceTranscript, setPulseEntries, setProcessingChunk, setStage, beginTraceStage, endTraceStage, runAnalysis });
  }, [beginTraceStage, endTraceStage, setStage, runAnalysis]);

  const { isRecording, error: voiceError, startRecording, stopRecording } =
    useVoiceInput({ onChunkTranscribed: handleVoiceChunk });
  useEffect(() => {
    recordingState.current = isRecording;
  }, [isRecording]);

  const handleStartRecording = useCallback((fixtureKey?: string) => {
    openTrackedSession({
      mem,
      mode: "streaming",
      inputKind: "voice",
      fixtureKey,
      resetState,
      closePreviousTrace,
      startTraceSession,
      setSession,
    });
    void startRecording();
  }, [closePreviousTrace, resetState, startRecording, startTraceSession]);

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
    async (
      text: string,
      inputKind: InputKind = "paste",
      sourceAsset?: SourceAsset,
      fixtureKey?: string,
    ) => {
      const { era, session: sess } = openTrackedSession({
        mem,
        mode: "batch",
        inputKind,
        fixtureKey,
        resetState,
        closePreviousTrace,
        startTraceSession,
        setSession,
      });
      if (sourceAsset) {
        attachSourceAsset(mem, sess, sourceAsset, setSession);
      }
      await runBatchAnalysis({
        text,
        era,
        mem,
        setIsProcessing,
        setProcessingChunk,
        setAnalysisError,
        setStage,
        setSnapshot,
        triggerVerification,
        triggerTopicSegmentation,
        beginTraceStage,
        endTraceStage,
      });
    },
    [beginTraceStage, closePreviousTrace, endTraceStage, resetState, setStage, startTraceSession, triggerTopicSegmentation, triggerVerification],
  );

  const handleFetchUrl = useCallback(async (url: string, fixtureKey?: string) => {
    const { era, session: sess } = openTrackedSession({
      mem,
      mode: "batch",
      inputKind: "url",
      fixtureKey,
      resetState,
      closePreviousTrace,
      startTraceSession,
      setSession,
    });
    setIsFetchingUrl(true);
    const trace = beginTraceStage("extract", { url });
    const result = await fetchUrlExtract(url);
    setIsFetchingUrl(false);
    if (era !== mem.current.era) return;
    if (result) {
      const asset: SourceAsset = { url, title: result.title, excerpt: result.excerpt };
      attachSourceAsset(mem, sess, asset, setSession);
      endTraceStage(trace, "success", {
        output: {
          title: result.title,
          textLength: result.text.length,
          excerptLength: result.excerpt.length,
        },
      });
      await runBatchAnalysis({
        text: result.text,
        era,
        mem,
        setIsProcessing,
        setProcessingChunk,
        setAnalysisError,
        setStage,
        setSnapshot,
        triggerVerification,
        triggerTopicSegmentation,
        beginTraceStage,
        endTraceStage,
      });
    } else {
      endTraceStage(trace, "error", { error: "URL extraction failed." });
    }
  }, [beginTraceStage, closePreviousTrace, endTraceStage, resetState, setStage, startTraceSession, triggerTopicSegmentation, triggerVerification]);

  const retryAnalysis = useCallback(async () => {
    await retryBatchAnalysis({
      mem, setIsProcessing, setProcessingChunk, setAnalysisError, setStage, setSnapshot,
      triggerVerification, triggerTopicSegmentation, beginTraceStage, endTraceStage,
    });
  }, [beginTraceStage, endTraceStage, setStage, triggerTopicSegmentation, triggerVerification]);

  const restoreSession = useCallback((entry: SessionHistoryEntry) => {
    restoreTrackedSession({
      entry,
      mem,
      resetState,
      closePreviousTrace,
      setPulseEntries,
      setSession,
      setSnapshot,
      setVerificationRun,
      setTopicSegments,
      setVoiceTranscript,
    });
    setResetSignal((value) => value + 1);
  }, [closePreviousTrace, resetState]);

  const voiceChunkSeverities = useMemo(
    () => getVoiceChunkSeverities(voiceTranscript, pulseEntries),
    [voiceTranscript, pulseEntries],
  );

  const seekTranscriptChunk = useCallback((index: number) => {
    document.getElementById(`tl-transcript-chunk-${index}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const flagCount = useMemo(() => countFlags(pulseEntries), [pulseEntries]);

  const isAnalysisLoading = pipeline.analysis === "running";

  useEffect(() => {
    if (!session || !snapshot) return;
    saveSession(buildHistoryEntry(
      session,
      mem.current.segments,
      voiceTranscript,
      pulseEntries,
      snapshot,
      verificationRun,
      topicSegments,
    ));
  }, [pulseEntries, session, snapshot, topicSegments, verificationRun, voiceTranscript]);

  useEffect(() => {
    maybeFinishTrace();
  }, [maybeFinishTrace, pipeline, queryResult, session, snapshot, topicSegments, verificationRun]);

  return {
    session, snapshot, runningSummary, verificationRun, verificationError, analysisError, topicSegments, queryResult, pipelineStatus: pipeline, flagCount, isAnalysisLoading, pulseEntries,
    voiceTranscript, voiceChunkSeverities, isRecording, voiceError, isProcessing, isFetchingUrl, processingChunk, chunkProgress,
    handleAnalyze, handleFetchUrl, handleStartRecording, handleStopRecording, triggerVerification, triggerTopicSegmentation, retryAnalysis, submitQuery, seekTranscriptChunk, restoreSession, clearSession, resetSignal,
  };
}

export type TruthSessionState = ReturnType<typeof useTruthSession>;
