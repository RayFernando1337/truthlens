"use client";

import { useCallback, useRef } from "react";
import { pipelineLogger } from "@/lib/pipeline-logger";
import type { InputKind, TraceStage } from "@/lib/types";
import type { TruthSessionMem } from "./truth-session-runtime";

type TraceToken = { sessionId: string; stage: TraceStage; startedAt: number } | null;

export function useTruthSessionTrace(mem: React.MutableRefObject<TruthSessionMem>, isFetchingUrl: boolean, isRecordingRef: React.MutableRefObject<boolean>) {
  const state = useRef(mem.current);
  const maybeFinishTrace = useCallback(() => {
    const sessionId = state.current.session?.sessionId;
    if (!sessionId || state.current.traceClosed) return;
    if (state.current.pendingTraceOps > 0 || isRecordingRef.current || isFetchingUrl) return;
    pipelineLogger.finishSession(sessionId);
    state.current.traceClosed = true;
  }, [isFetchingUrl, isRecordingRef, state]);

  const closePreviousTrace = useCallback(() => {
    const sessionId = state.current.session?.sessionId;
    if (!sessionId || state.current.traceClosed) return;
    pipelineLogger.finishSession(sessionId);
    state.current.traceClosed = true;
  }, [state]);

  const startTraceSession = useCallback((sessionId: string, inputKind: InputKind, fixtureKey?: string) => {
    state.current.pendingTraceOps = 0; state.current.traceClosed = false;
    pipelineLogger.startSession(sessionId, inputKind, fixtureKey);
  }, [state]);

  const beginTraceStage = useCallback((stage: TraceStage, input?: Record<string, unknown>): TraceToken => {
    const sessionId = state.current.session?.sessionId;
    if (!sessionId || state.current.traceClosed) return null;
    state.current.pendingTraceOps += 1; const startedAt = Date.now();
    pipelineLogger.record({ sessionId, stage, status: "start", timestamp: startedAt, input });
    return { sessionId, stage, startedAt };
  }, [state]);

  const endTraceStage = useCallback((
    token: TraceToken,
    status: "success" | "error",
    options?: { output?: Record<string, unknown>; error?: string },
  ) => {
    if (!token) return;
    pipelineLogger.record({
      sessionId: token.sessionId,
      stage: token.stage,
      status,
      timestamp: Date.now(),
      durationMs: Date.now() - token.startedAt,
      output: options?.output,
      error: options?.error,
    });
    if (state.current.session?.sessionId === token.sessionId) {
      state.current.pendingTraceOps = Math.max(0, state.current.pendingTraceOps - 1);
    }
    maybeFinishTrace();
  }, [maybeFinishTrace, state]);

  return { maybeFinishTrace, closePreviousTrace, startTraceSession, beginTraceStage, endTraceStage };
}
