"use client";

import type { RefObject } from "react";
import type { ChunkSeverity } from "@/lib/pulse-utils";
import type { DemoFixture, TranscriptInputMode } from "@/lib/types";
import { TranscriptDemoMenu, TranscriptFixtureCard } from "./TranscriptInputFixtures";

const SEVERITY_BORDER: Record<ChunkSeverity, string> = {
  ok: "border-l-[#00cc66]",
  warn: "border-l-[#ffaa00]",
  flag: "border-l-[#ff4400]",
};

function severityForIndex(severities: ChunkSeverity[] | undefined, i: number): ChunkSeverity {
  if (!severities || i >= severities.length) return "ok";
  return severities[i] ?? "ok";
}

export function InputHeader({ isRecording, busy, demoOpen, onToggleDemo, onLoadFixture, onStopRecording, onStartRecording }: {
  isRecording: boolean;
  busy: boolean;
  demoOpen: boolean;
  onToggleDemo: () => void;
  onLoadFixture: (fixture: DemoFixture) => void;
  onStopRecording: () => void;
  onStartRecording: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666]">Input</span>
      <div className="flex items-center gap-3">
        {!isRecording && (
          <div className="relative">
            <button type="button" onClick={onToggleDemo} disabled={busy} data-testid="demo-toggle"
              className="text-[11px] uppercase tracking-wider text-[#666] transition-colors hover:text-[#e5e5e5] disabled:opacity-30">
              Demo {demoOpen ? "\u25B4" : "\u25BE"}
            </button>
            {demoOpen && <TranscriptDemoMenu onSelect={onLoadFixture} />}
          </div>
        )}
        <button type="button" onClick={isRecording ? onStopRecording : onStartRecording}
          disabled={busy && !isRecording} data-testid="mic-button"
          className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-30 ${
            isRecording ? "text-accent hover:text-[#ff6633]" : "text-[#666] hover:text-[#e5e5e5]"
          }`}
          title={isRecording ? "Stop recording" : "Start voice input"}>
          <span className={`inline-block h-2 w-2 rounded-full ${isRecording ? "animate-pulse bg-accent" : "bg-[#444]"}`} />
          {isRecording ? "Stop" : "Mic"}
        </button>
      </div>
    </div>
  );
}

export function VoiceTranscriptView({ isRecording, voiceTranscript, voiceError, voiceChunkSeverities, showJumpButton, scrollRef, onScroll, onScrollToBottom }: {
  isRecording: boolean;
  voiceTranscript: string[];
  voiceError: string | null;
  voiceChunkSeverities?: ChunkSeverity[];
  showJumpButton: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  onScrollToBottom: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {isRecording && (
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          <span className="text-[11px] uppercase tracking-wider text-accent">Listening</span>
        </div>
      )}
      {showJumpButton && (
        <button type="button" onClick={onScrollToBottom}
          className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 border border-[#333] bg-[#0a0a0a] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#e5e5e5] shadow-lg transition-colors hover:border-[#e5e5e5]">
          Scroll to live
        </button>
      )}
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
        {voiceTranscript.length === 0 ? (
          <p className="text-sm text-[#333]">Speak clearly. Transcription will appear here as audio is processed...</p>
        ) : (
          <div className="space-y-2">
            {voiceTranscript.map((chunk, i) => {
              const borderClass = voiceChunkSeverities
                ? `border-l-2 pl-2 ${SEVERITY_BORDER[severityForIndex(voiceChunkSeverities, i)]}`
                : "";
              return (
                <p key={i} id={`tl-transcript-chunk-${i}`} className={`text-sm leading-relaxed text-[#e5e5e5] ${borderClass}`}>
                  <span className="mr-2 text-[10px] tabular-nums text-[#444]">[{i + 1}]</span>
                  {chunk}
                </p>
              );
            })}
          </div>
        )}
      </div>
      {voiceError && <p className="mt-2 text-[11px] text-accent">{voiceError}</p>}
    </div>
  );
}

export function TextInputView({ selectedFixture, onClearFixture, showVoiceProtocol, text, onTextChange, busy }: {
  selectedFixture: DemoFixture | null;
  onClearFixture: () => void;
  showVoiceProtocol: boolean;
  text: string;
  onTextChange: (value: string) => void;
  busy: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      {selectedFixture && <TranscriptFixtureCard fixture={selectedFixture} onClear={onClearFixture} />}
      {!showVoiceProtocol && (
        <textarea value={text} onChange={(e) => onTextChange(e.target.value)} disabled={busy}
          data-testid="transcript-input"
          placeholder="Paste transcript, article, or a URL to analyze..."
          className="h-full w-full resize-none bg-transparent text-sm leading-relaxed text-[#e5e5e5] placeholder:text-[#333] focus:outline-none disabled:opacity-50" />
      )}
    </div>
  );
}

function ProgressStrip({ barClass, barStyle, label }: {
  barClass: string;
  barStyle?: React.CSSProperties;
  label: string;
}) {
  return (
    <div className="border-t border-[#222] px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative h-0.5 flex-1 bg-[#222]"><div className={`absolute inset-y-0 left-0 ${barClass}`} style={barStyle} /></div>
        <span className="text-[10px] tabular-nums text-[#666]">{label}</span>
      </div>
    </div>
  );
}

export function InputFooter({ isRecording, busy, isFetchingUrl, chunkProgress, voiceChunkCount, text, inputMode, onAction }: {
  isRecording: boolean;
  busy: boolean;
  isFetchingUrl: boolean;
  chunkProgress: { current: number; total: number } | null;
  voiceChunkCount: number;
  text: string;
  inputMode: TranscriptInputMode;
  onAction: () => void;
}) {
  if (isRecording)
    return <ProgressStrip barClass="w-full animate-pulse bg-accent/30" label={`${voiceChunkCount} chunk${voiceChunkCount !== 1 ? "s" : ""}`} />;
  if (busy && chunkProgress)
    return <ProgressStrip barClass="bg-[#e5e5e5] transition-all duration-300" barStyle={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }} label={`${chunkProgress.current}/${chunkProgress.total}`} />;
  if (isFetchingUrl)
    return <ProgressStrip barClass="w-full animate-pulse bg-yellow/30" label="Fetching..." />;
  if (busy)
    return <ProgressStrip barClass="w-full animate-pulse bg-[#e5e5e5]/20" label="Analyzing&hellip;" />;
  return (
    <div className="border-t border-[#222] px-4 py-3">
      <button type="button" onClick={onAction} disabled={!text.trim() || busy} data-testid="analyze-button"
        className="w-full border border-[#333] py-2 text-[11px] font-semibold uppercase tracking-widest text-[#e5e5e5] transition-colors hover:border-[#e5e5e5] hover:bg-[#e5e5e5] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:bg-transparent disabled:hover:text-[#e5e5e5]">
        {inputMode === "url" ? "Fetch & Analyze" : "Analyze"}
      </button>
    </div>
  );
}
