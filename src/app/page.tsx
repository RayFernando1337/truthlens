"use client";

import { useTruthSession, type TruthSessionState } from "@/hooks/useTruthSession";
import type { SessionHistoryEntry } from "@/lib/types";
import TranscriptInput from "./components/TranscriptInput";
import TruthPanel from "./components/TruthPanel";
import SessionHistory from "./components/SessionHistory";

function PageHeader({ isRecording, flagCount, canStartNew, historyDisabled, onStartNew, onRestore }: {
  isRecording: boolean; flagCount: number;
  canStartNew: boolean;
  historyDisabled: boolean;
  onStartNew: () => void;
  onRestore: (entry: SessionHistoryEntry) => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3">
      <h1 className="text-sm font-bold tracking-wider text-foreground">TRUTHLENS</h1>
      <div className="flex items-center gap-4">
        {isRecording && (
          <span className="flex items-center gap-1.5 text-[10px] text-accent">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> LIVE
          </span>
        )}
        {flagCount > 0 && (
          <span className="text-[10px] tabular-nums text-accent">
            {flagCount} flag{flagCount !== 1 ? "s" : ""}
          </span>
        )}
        <button type="button" onClick={onStartNew} disabled={!canStartNew}
          className="text-[10px] uppercase tracking-wider text-[#555] transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[#555]">
          New Session
        </button>
        <SessionHistory onRestore={onRestore} disabled={historyDisabled} />
      </div>
    </header>
  );
}

function InputColumn({ session }: { session: TruthSessionState }) {
  return (
    <div className="w-[320px] shrink-0 border-r border-border bg-bg xl:w-[400px]">
      <TranscriptInput
        key={session.resetSignal}
        onAnalyze={(text, fixtureKey) => {
          void session.handleAnalyze(text, "paste", undefined, fixtureKey);
        }}
        onFetchUrl={(url, fixtureKey) => {
          void session.handleFetchUrl(url, fixtureKey);
        }}
        isRecording={session.isRecording}
        isProcessing={session.isProcessing}
        isFetchingUrl={session.isFetchingUrl}
        voiceTranscript={session.voiceTranscript}
        voiceError={session.voiceError}
        onStartRecording={(fixtureKey) => {
          session.handleStartRecording(fixtureKey);
        }}
        onStopRecording={session.handleStopRecording}
        chunkProgress={session.chunkProgress}
        voiceChunkSeverities={session.voiceChunkSeverities}
      />
    </div>
  );
}

function OutputColumn({ session }: { session: TruthSessionState }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col bg-surface">
      <TruthPanel
        pulseEntries={session.pulseEntries}
        snapshot={session.snapshot}
        verificationRun={session.verificationRun}
        verificationError={session.verificationError}
        analysisError={session.analysisError}
        topicSegments={session.topicSegments}
        queryResult={session.queryResult}
        pipelineStatus={session.pipelineStatus}
        processingChunk={session.processingChunk}
        isStreaming={session.isRecording || session.isProcessing}
        sourceTitle={session.session?.sourceAsset?.title}
        onSeekTranscriptChunk={session.seekTranscriptChunk}
        onTriggerVerification={session.triggerVerification}
        onTriggerTopicSegmentation={session.triggerTopicSegmentation}
        onRetryAnalysis={session.retryAnalysis}
        onSubmitQuery={session.submitQuery}
      />
    </div>
  );
}

export default function Home() {
  const s = useTruthSession();
  const isBusy = s.isRecording || s.isProcessing || s.isFetchingUrl;
  const canStartNewSession = !isBusy && (
    !!s.session
    || !!s.snapshot
    || !!s.verificationRun
    || !!s.topicSegments
    || !!s.queryResult
    || s.pulseEntries.length > 0
    || s.voiceTranscript.length > 0
  );

  return (
    <div className="flex h-full flex-col bg-bg">
      <PageHeader
        isRecording={s.isRecording}
        flagCount={s.flagCount}
        canStartNew={canStartNewSession}
        historyDisabled={isBusy}
        onStartNew={s.clearSession}
        onRestore={s.restoreSession}
      />

      <div className="flex flex-1 overflow-hidden">
        <InputColumn session={s} />
        <OutputColumn session={s} />
      </div>
    </div>
  );
}
