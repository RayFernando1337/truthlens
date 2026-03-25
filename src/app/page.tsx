"use client";

import { useTruthSession } from "@/hooks/useTruthSession";
import TranscriptInput from "./components/TranscriptInput";
import InsightsPanel from "./components/InsightsPanel";

export default function Home() {
  const s = useTruthSession();

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <header className="flex items-center justify-between border-b border-[#222] px-6 py-3">
        <h1 className="text-sm font-bold tracking-wider text-[#e5e5e5]">TRUTHLENS</h1>
        <div className="flex items-center gap-4">
          {s.isRecording && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#ff4400]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff4400]" /> LIVE
            </span>
          )}
          {s.flagCount > 0 && (
            <span className="text-[10px] tabular-nums text-[#ff4400]">{s.flagCount} flag{s.flagCount !== 1 ? "s" : ""}</span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[320px] shrink-0 border-r border-[#222] bg-[#0a0a0a] xl:w-[400px]">
          <TranscriptInput
            onAnalyze={s.handleAnalyze}
            onFetchUrl={s.handleFetchUrl}
            isRecording={s.isRecording}
            isProcessing={s.isProcessing}
            isFetchingUrl={s.isFetchingUrl}
            voiceTranscript={s.voiceTranscript}
            voiceError={s.voiceError}
            onStartRecording={s.handleStartRecording}
            onStopRecording={s.handleStopRecording}
            chunkProgress={s.chunkProgress}
            insightsMode
            voiceChunkSeverities={s.voiceChunkSeverities}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col bg-[#141414]">
          <InsightsPanel
            entries={s.pulseEntries}
            processingChunk={s.processingChunk}
            analysisResult={s.analysisResult}
            patternsResult={s.patternsResult}
            isAnalysisLoading={s.isAnalysisLoading}
            isPatternsLoading={s.isAnalysisLoading}
            onSeekTranscriptChunk={s.seekTranscriptChunk}
          />
        </div>
      </div>
    </div>
  );
}
