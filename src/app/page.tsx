"use client";

import { useTruthSession } from "@/hooks/useTruthSession";
import type { SessionHistoryEntry } from "@/lib/types";
import TranscriptInput from "./components/TranscriptInput";
import TruthPanel from "./components/TruthPanel";
import SessionHistory from "./components/SessionHistory";

function PageHeader({ isRecording, flagCount, onRestore }: {
  isRecording: boolean; flagCount: number;
  onRestore: (entry: SessionHistoryEntry) => void;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#222] px-6 py-3">
      <h1 className="text-sm font-bold tracking-wider text-[#e5e5e5]">TRUTHLENS</h1>
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
        <SessionHistory onRestore={onRestore} />
      </div>
    </header>
  );
}

export default function Home() {
  const s = useTruthSession();

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <PageHeader isRecording={s.isRecording} flagCount={s.flagCount} onRestore={s.restoreSession} />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[320px] shrink-0 border-r border-[#222] bg-[#0a0a0a] xl:w-[400px]">
          <TranscriptInput
            onAnalyze={(text, fixtureKey) => {
              void s.handleAnalyze(text, "paste", undefined, fixtureKey);
            }}
            onFetchUrl={(url, fixtureKey) => {
              void s.handleFetchUrl(url, fixtureKey);
            }}
            isRecording={s.isRecording}
            isProcessing={s.isProcessing}
            isFetchingUrl={s.isFetchingUrl}
            voiceTranscript={s.voiceTranscript}
            voiceError={s.voiceError}
            onStartRecording={(fixtureKey) => {
              s.handleStartRecording(fixtureKey);
            }}
            onStopRecording={s.handleStopRecording}
            chunkProgress={s.chunkProgress}
            voiceChunkSeverities={s.voiceChunkSeverities}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          <TruthPanel
            pulseEntries={s.pulseEntries}
            snapshot={s.snapshot}
            verificationRun={s.verificationRun}
            verificationError={s.verificationError}
            topicSegments={s.topicSegments}
            queryResult={s.queryResult}
            pipelineStatus={s.pipelineStatus}
            processingChunk={s.processingChunk}
            isStreaming={s.isRecording || s.isProcessing}
            sourceTitle={s.session?.sourceAsset?.title}
            onSeekTranscriptChunk={s.seekTranscriptChunk}
            onTriggerVerification={s.triggerVerification}
            onTriggerTopicSegmentation={s.triggerTopicSegmentation}
            onSubmitQuery={s.submitQuery}
          />
        </div>
      </div>
    </div>
  );
}
