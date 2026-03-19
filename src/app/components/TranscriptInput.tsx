"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { ChunkSeverity } from "@/lib/pulse-utils";

const DEMO_TRANSCRIPT = `Our new AI platform processes data 10x faster than any competitor on the market. We've seen this across thousands of deployments.

Industry analysts predict that by 2027, every Fortune 500 company will have adopted this technology. The transformation is inevitable.

Studies show that companies using our platform see a 340% improvement in productivity. Our customers consistently report these kinds of results.

We believe this represents a fundamental shift in how businesses operate. As one leading expert put it, this is "the most important technology since the internet."

The architecture is built on proprietary algorithms that no other company has been able to replicate. Our team of world-class researchers has spent over a decade perfecting this approach.

Looking at the broader market, we're seeing unprecedented adoption rates. Our growth trajectory puts us on track to be the dominant platform within two years. The numbers speak for themselves.`;

const URL_PATTERN = /^https?:\/\/\S+$/;

const NEAR_BOTTOM_PX = 80;

const SEVERITY_BORDER: Record<ChunkSeverity, string> = {
  ok: "border-l-[#00cc66]",
  warn: "border-l-[#ffaa00]",
  flag: "border-l-[#ff4400]",
};

type InputMode = "text" | "url" | "voice";

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
  insightsMode,
  voiceChunkSeverities,
}: {
  onAnalyze: (text: string) => void;
  onFetchUrl: (url: string) => void;
  isRecording: boolean;
  isProcessing: boolean;
  isFetchingUrl: boolean;
  voiceTranscript: string[];
  voiceError: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  chunkProgress: { current: number; total: number } | null;
  /** When true, voice chunks show severity borders from pulse flags */
  insightsMode?: boolean;
  /** Per voice chunk index; length should match voiceTranscript when provided */
  voiceChunkSeverities?: ChunkSeverity[];
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [showJumpToLive, setShowJumpToLive] = useState(false);

  const inputMode: InputMode = useMemo(() => {
    if (isRecording) return "voice";
    if (URL_PATTERN.test(text.trim())) return "url";
    return "text";
  }, [text, isRecording]);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    followingRef.current = true;
    setShowJumpToLive(false);
  }, []);

  const handleTranscriptScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    followingRef.current = nearBottom;
    setShowJumpToLive(!nearBottom);
  }, []);

  const hasVoiceChunks = voiceTranscript.length > 0;

  useEffect(() => {
    if (isRecording && voiceTranscript.length === 0) {
      followingRef.current = true;
      setShowJumpToLive(false);
    }
  }, [isRecording, voiceTranscript.length]);

  useEffect(() => {
    if (!isRecording && !hasVoiceChunks) return;
    const el = scrollRef.current;
    if (!el) return;
    if (followingRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLive(false);
    } else {
      setShowJumpToLive(true);
    }
  }, [voiceTranscript, isRecording, hasVoiceChunks]);

  function handleAction() {
    const content = text.trim();
    if (!content) return;
    if (inputMode === "url") {
      onFetchUrl(content);
    } else {
      onAnalyze(content);
    }
  }

  function loadDemo() {
    setText(DEMO_TRANSCRIPT);
  }

  const busy = isProcessing || isFetchingUrl;

  function severityForIndex(i: number): ChunkSeverity {
    if (!voiceChunkSeverities || i >= voiceChunkSeverities.length) return "ok";
    return voiceChunkSeverities[i] ?? "ok";
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666]">
          Input
        </span>
        <div className="flex items-center gap-3">
          {!isRecording && (
            <button
              onClick={loadDemo}
              disabled={busy}
              className="text-[11px] uppercase tracking-wider text-[#666] transition-colors hover:text-[#e5e5e5] disabled:opacity-30"
            >
              Load demo
            </button>
          )}
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={busy && !isRecording}
            className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-30 ${
              isRecording
                ? "text-[#ff4400] hover:text-[#ff6633]"
                : "text-[#666] hover:text-[#e5e5e5]"
            }`}
            title={isRecording ? "Stop recording" : "Start voice input"}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                isRecording ? "animate-pulse bg-[#ff4400]" : "bg-[#444]"
              }`}
            />
            {isRecording ? "Stop" : "Mic"}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="relative flex-1 overflow-hidden p-4">
        {isRecording || hasVoiceChunks ? (
          <div className="flex h-full flex-col">
            {isRecording && (
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff4400]" />
                <span className="text-[11px] uppercase tracking-wider text-[#ff4400]">
                  Listening
                </span>
                <span className="text-[10px] text-[#444]">
                  &middot; chunks every 4s
                </span>
              </div>
            )}
            {showJumpToLive && (
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
                    const borderClass =
                      insightsMode && voiceChunkSeverities
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
              <p className="mt-2 text-[11px] text-[#ff4400]">{voiceError}</p>
            )}
          </div>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
            placeholder="Paste transcript, article, or a URL to analyze..."
            className="h-full w-full resize-none bg-transparent text-sm leading-relaxed text-[#e5e5e5] placeholder:text-[#333] focus:outline-none disabled:opacity-50"
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#222] px-4 py-3">
        {isRecording ? (
          <div className="flex items-center gap-3">
            <div className="relative h-0.5 flex-1 bg-[#222]">
              <div className="absolute inset-y-0 left-0 w-full animate-pulse bg-[#ff4400]/30" />
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
              <div className="absolute inset-y-0 left-0 w-full animate-pulse bg-[#ffaa00]/30" />
            </div>
            <span className="text-[10px] text-[#666]">Fetching...</span>
          </div>
        ) : (
          <button
            onClick={handleAction}
            disabled={!text.trim() || busy}
            className="w-full border border-[#333] py-2 text-[11px] font-semibold uppercase tracking-widest text-[#e5e5e5] transition-colors hover:border-[#e5e5e5] hover:bg-[#e5e5e5] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:bg-transparent disabled:hover:text-[#e5e5e5]"
          >
            {inputMode === "url" ? "Fetch & Analyze" : "Analyze"}
          </button>
        )}
      </div>
    </div>
  );
}
