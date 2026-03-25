"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { ChunkSeverity } from "@/lib/pulse-utils";
import type { DemoFixture, TranscriptInputMode } from "@/lib/types";
import { TranscriptDemoMenu, TranscriptFixtureCard } from "./TranscriptInputFixtures";

const URL_PATTERN = /^https?:\/\/\S+$/;

const NEAR_BOTTOM_PX = 80;

const SEVERITY_BORDER: Record<ChunkSeverity, string> = {
  ok: "border-l-[#00cc66]",
  warn: "border-l-[#ffaa00]",
  flag: "border-l-[#ff4400]",
};

export default function TranscriptInput({
  onAnalyze,
  onFetchUrl,
  isRecording,
  isProcessing,
  isFetchingUrl,
  voiceTranscript,
  voiceError,
  onStartRecording,
  onStopRecording,
  chunkProgress,
  voiceChunkSeverities,
}: {
  onAnalyze: (text: string, fixtureKey?: string) => void;
  onFetchUrl: (url: string, fixtureKey?: string) => void;
  isRecording: boolean;
  isProcessing: boolean;
  isFetchingUrl: boolean;
  voiceTranscript: string[];
  voiceError: string | null;
  onStartRecording: (fixtureKey?: string) => void;
  onStopRecording: () => void;
  chunkProgress: { current: number; total: number } | null;
  voiceChunkSeverities?: ChunkSeverity[];
}) {
  const [text, setText] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedFixture, setSelectedFixture] = useState<DemoFixture | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [showJumpToLive, setShowJumpToLive] = useState(false);

  const syncJumpButton = useCallback(() => {
    setShowJumpToLive(!followingRef.current);
  }, []);

  const inputMode: TranscriptInputMode = useMemo(() => {
    if (isRecording) return "voice";
    if (URL_PATTERN.test(text.trim())) return "url";
    return "text";
  }, [text, isRecording]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    followingRef.current = true;
    syncJumpButton();
  }, [syncJumpButton]);

  const handleTranscriptScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    followingRef.current = nearBottom;
    syncJumpButton();
  }, [syncJumpButton]);

  const hasVoiceChunks = voiceTranscript.length > 0;

  useEffect(() => {
    if (isRecording && voiceTranscript.length === 0) {
      followingRef.current = true;
      syncJumpButton();
    }
  }, [isRecording, voiceTranscript.length, syncJumpButton]);

  useEffect(() => {
    if (!isRecording && !hasVoiceChunks) return;
    const el = scrollRef.current;
    if (!el) return;
    if (followingRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    syncJumpButton();
  }, [voiceTranscript, isRecording, hasVoiceChunks, syncJumpButton]);

  function handleAction() {
    const content = text.trim();
    if (!content) return;
    if (inputMode === "url") {
      onFetchUrl(content);
    } else {
      onAnalyze(
        content,
        selectedFixture?.inputMode === "text" ? selectedFixture.key : undefined,
      );
    }
  }

  function loadFixture(fixture: DemoFixture) {
    setSelectedFixture(fixture);
    setDemoOpen(false);
    if (fixture.inputMode === "text") {
      setText(fixture.content);
      return;
    }
    setText("");
    if (fixture.inputMode === "url") {
      onFetchUrl(fixture.content, fixture.key);
    }
  }

  const busy = isProcessing || isFetchingUrl;
  const showJumpButton = (isRecording || hasVoiceChunks) && showJumpToLive;
  const showVoiceProtocol =
    selectedFixture?.inputMode === "voice-prompt" && !isRecording && !hasVoiceChunks;

  function severityForIndex(i: number): ChunkSeverity {
    if (!voiceChunkSeverities || i >= voiceChunkSeverities.length) return "ok";
    return voiceChunkSeverities[i] ?? "ok";
  }

  function handleTextChange(value: string) {
    setText(value);
    if (selectedFixture?.inputMode !== "text" || value !== selectedFixture.content) {
      setSelectedFixture(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666]">
          Input
        </span>
        <div className="flex items-center gap-3">
          {!isRecording && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDemoOpen((o) => !o)}
                disabled={busy}
                data-testid="demo-toggle"
                className="text-[11px] uppercase tracking-wider text-[#666] transition-colors hover:text-[#e5e5e5] disabled:opacity-30"
              >
                Demo {demoOpen ? "\u25B4" : "\u25BE"}
              </button>
              {demoOpen && <TranscriptDemoMenu onSelect={loadFixture} />}
            </div>
          )}
          <button
            type="button"
            onClick={
              isRecording
                ? onStopRecording
                : () => onStartRecording(
                  selectedFixture?.inputMode === "voice-prompt"
                    ? selectedFixture.key
                    : undefined,
                )
            }
            disabled={busy && !isRecording}
            data-testid="mic-button"
            className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-30 ${
              isRecording
                ? "text-accent hover:text-[#ff6633]"
                : "text-[#666] hover:text-[#e5e5e5]"
            }`}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isRecording ? "animate-pulse bg-accent" : "bg-[#444]"
              }`}
            />
            {isRecording ? "Stop" : "Mic"}
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden p-4">
        {isRecording || hasVoiceChunks ? (
          <div className="flex h-full flex-col">
            {isRecording && (
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                <span className="text-[11px] uppercase tracking-wider text-accent">
                  Listening
                </span>
              </div>
            )}
            {showJumpButton && (
              <button
                type="button"
                onClick={scrollToBottom}
                className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 border border-[#333] bg-[#0a0a0a] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#e5e5e5] shadow-lg transition-colors hover:border-[#e5e5e5]"
              >
                Scroll to live
              </button>
            )}
            <div
              ref={scrollRef}
              onScroll={handleTranscriptScroll}
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {voiceTranscript.length === 0 ? (
                <p className="text-sm text-[#333]">
                  Speak clearly. Transcription will appear here as audio is
                  processed...
                </p>
              ) : (
                <div className="space-y-2">
                  {voiceTranscript.map((chunk, i) => {
                    const borderClass = voiceChunkSeverities
                      ? `border-l-2 pl-2 ${SEVERITY_BORDER[severityForIndex(i)]}`
                      : "";
                    return (
                      <p
                        key={i}
                        id={`tl-transcript-chunk-${i}`}
                        className={`text-sm leading-relaxed text-[#e5e5e5] ${borderClass}`}
                      >
                        <span className="mr-2 text-[10px] tabular-nums text-[#444]">
                          [{i + 1}]
                        </span>
                        {chunk}
                      </p>
                    );
                  })}
                </div>
              )}
            </div>
            {voiceError && (
              <p className="mt-2 text-[11px] text-accent">{voiceError}</p>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col gap-3">
            {selectedFixture && (
              <TranscriptFixtureCard
                fixture={selectedFixture}
                onClear={() => setSelectedFixture(null)}
              />
            )}
            {!showVoiceProtocol && (
              <textarea
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                disabled={busy}
                data-testid="transcript-input"
                placeholder="Paste transcript, article, or a URL to analyze..."
                className="h-full w-full resize-none bg-transparent text-sm leading-relaxed text-[#e5e5e5] placeholder:text-[#333] focus:outline-none disabled:opacity-50"
              />
            )}
          </div>
        )}
      </div>

      <div className="border-t border-[#222] px-4 py-3">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <div className="relative h-0.5 flex-1 bg-[#222]">
              <div className="absolute inset-y-0 left-0 w-full animate-pulse bg-accent/30" />
            </div>
            <span className="text-[10px] tabular-nums text-[#666]">
              {voiceTranscript.length} chunk
              {voiceTranscript.length !== 1 ? "s" : ""}
            </span>
          </div>
        ) : busy && chunkProgress ? (
          <div className="flex items-center gap-3">
            <div className="relative h-0.5 flex-1 bg-[#222]">
              <div
                className="absolute inset-y-0 left-0 bg-[#e5e5e5] transition-all duration-300"
                style={{
                  width: `${(chunkProgress.current / chunkProgress.total) * 100}%`,
                }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-[#666]">
              {chunkProgress.current}/{chunkProgress.total}
            </span>
          </div>
        ) : isFetchingUrl ? (
          <div className="flex items-center gap-3">
            <div className="relative h-0.5 flex-1 bg-[#222]">
              <div className="absolute inset-y-0 left-0 w-full animate-pulse bg-yellow/30" />
            </div>
            <span className="text-[10px] text-[#666]">Fetching...</span>
          </div>
        ) : busy ? (
          <div className="flex items-center gap-3">
            <div className="relative h-0.5 flex-1 bg-[#222]"><div className="absolute inset-y-0 left-0 w-full animate-pulse bg-[#e5e5e5]/20" /></div>
            <span className="text-[10px] text-[#666]">Analyzing&hellip;</span></div>
        ) : (
          <button
            type="button"
            onClick={handleAction}
            disabled={!text.trim() || busy}
            data-testid="analyze-button"
            className="w-full border border-[#333] py-2 text-[11px] font-semibold uppercase tracking-widest text-[#e5e5e5] transition-colors hover:border-[#e5e5e5] hover:bg-[#e5e5e5] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:bg-transparent disabled:hover:text-[#e5e5e5]"
          >
            {inputMode === "url" ? "Fetch & Analyze" : "Analyze"}
          </button>
        )}
      </div>
    </div>
  );
}
