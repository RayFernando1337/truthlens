"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type {
  PulseEntry,
  PulseResult,
  AnalysisResult,
  PatternsResult,
} from "@/lib/types";
import { severityFromPulse } from "@/lib/pulse-utils";
import type { ChunkSeverity } from "@/lib/pulse-utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import TranscriptInput from "./components/TranscriptInput";
import PulseFeed from "./components/PulseFeed";
import AnalysisPanel from "./components/AnalysisPanel";
import PatternsPanel from "./components/PatternsPanel";
import InsightsPanel from "./components/InsightsPanel";
import ArchitectureDiagram from "./components/ArchitectureDiagram";

type Tab = "pulse" | "analysis" | "patterns";
type ViewMode = "debug" | "insights";

/** First deep analysis (L2) after this many voice chunks (~4s each). */
const VOICE_L2_FIRST_CHUNKS = 8;
/** Re-run L2 on every +N new chunks with full session so far (rolling tail). */
const VOICE_L2_ROLL_EVERY = 4;

/** First patterns (L3) after this many chunks — matches pasted-text (6) for demos. */
const VOICE_L3_FIRST_CHUNKS = 6;
/** Re-run L3 on every +N new chunks with full transcript (rolling tail). */
const VOICE_L3_ROLL_EVERY = 4;
/** On stop: still run L3 if you have at least this many chunks and no pass yet / final flush. */
const VOICE_L3_STOP_MIN_CHUNKS = 4;

function splitIntoChunks(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const para of paragraphs) {
    if (para.length > 500) {
      const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
      let current = "";
      for (const sentence of sentences) {
        if (current.length + sentence.length > 400 && current) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    } else {
      chunks.push(para);
    }
  }
  return chunks;
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("insights");
  const [showArch, setShowArch] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("pulse");
  const [pulseEntries, setPulseEntries] = useState<PulseEntry[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [patternsResult, setPatternsResult] = useState<PatternsResult | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isPatternsLoading, setIsPatternsLoading] = useState(false);
  const [processingChunk, setProcessingChunk] = useState<string | null>(null);
  const [chunkProgress, setChunkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const [voiceTranscript, setVoiceTranscript] = useState<string[]>([]);

  const abortRef = useRef(false);
  const voiceChunksRef = useRef<string[]>([]);
  const voiceClaimsRef = useRef<string[]>([]);
  const voiceChunkIdRef = useRef(0);
  /** Chunk count when L2 last completed a request (0 = not yet). */
  const voiceLastL2AtChunkCountRef = useRef(0);
  /** Chunk count when L3 last completed a request (0 = not yet). */
  const voiceLastL3AtChunkCountRef = useRef(0);

  const triggerL2 = useCallback(
    async (chunks: string[], allClaims: string[]) => {
      setIsAnalysisLoading(true);
      try {
        const res = await fetch("/api/analyze/deep", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunks, claims: allClaims }),
        });
        if (res.ok) {
          const data: AnalysisResult = await res.json();
          setAnalysisResult(data);
        }
      } finally {
        setIsAnalysisLoading(false);
      }
    },
    []
  );

  const triggerL3 = useCallback(async (chunks: string[]) => {
    setIsPatternsLoading(true);
    try {
      const res = await fetch("/api/analyze/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: chunks.join("\n\n") }),
      });
      if (res.ok) {
        const data: PatternsResult = await res.json();
        setPatternsResult(data);
      }
    } finally {
      setIsPatternsLoading(false);
    }
  }, []);

  // --- Voice chunk handler: runs L1 on each transcribed chunk ---
  const handleVoiceChunk = useCallback(
    async (text: string) => {
      setVoiceTranscript((prev) => [...prev, text]);
      setActiveTab("pulse");

      const chunkId = voiceChunkIdRef.current++;
      voiceChunksRef.current.push(text);

      setProcessingChunk(text);

      try {
        const res = await fetch("/api/analyze/pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunk: text }),
        });

        if (res.ok) {
          const result: PulseResult = await res.json();
          const entry: PulseEntry = {
            id: `voice-${chunkId}`,
            chunk: text,
            result,
          };
          setPulseEntries((prev) => [...prev, entry]);
          voiceClaimsRef.current.push(...result.claims);
        }
      } catch {
        // continue listening
      }

      setProcessingChunk(null);

      const n = voiceChunksRef.current.length;
      const allChunks = [...voiceChunksRef.current];
      const allClaims = [...voiceClaimsRef.current];

      // L2 rolling tail: first at VOICE_L2_FIRST_CHUNKS, then every +VOICE_L2_ROLL_EVERY chunks (full session).
      if (n >= VOICE_L2_FIRST_CHUNKS) {
        const lastL2 = voiceLastL2AtChunkCountRef.current;
        if (lastL2 === 0) {
          voiceLastL2AtChunkCountRef.current = n;
          void triggerL2(allChunks, allClaims);
        } else if (n - lastL2 >= VOICE_L2_ROLL_EVERY) {
          voiceLastL2AtChunkCountRef.current = n;
          void triggerL2(allChunks, allClaims);
        }
      }

      // L3 rolling tail: first at VOICE_L3_FIRST_CHUNKS, then every +VOICE_L3_ROLL_EVERY chunks (full transcript).
      if (n >= VOICE_L3_FIRST_CHUNKS) {
        const lastL3 = voiceLastL3AtChunkCountRef.current;
        if (lastL3 === 0) {
          voiceLastL3AtChunkCountRef.current = n;
          void triggerL3(allChunks);
        } else if (n - lastL3 >= VOICE_L3_ROLL_EVERY) {
          voiceLastL3AtChunkCountRef.current = n;
          void triggerL3(allChunks);
        }
      }
    },
    [triggerL2, triggerL3]
  );

  const { isRecording, error: voiceError, startRecording, stopRecording } =
    useVoiceInput({ onChunkTranscribed: handleVoiceChunk });

  const voiceChunkSeverities = useMemo((): ChunkSeverity[] => {
    return voiceTranscript.map((_, i) => {
      const e = pulseEntries.find((p) => p.id === `voice-${i}`);
      return e ? severityFromPulse(e.result) : "ok";
    });
  }, [voiceTranscript, pulseEntries]);

  const seekTranscriptChunk = useCallback((index: number) => {
    document
      .getElementById(`tl-transcript-chunk-${index}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const handleStartRecording = useCallback(() => {
    setPulseEntries([]);
    setAnalysisResult(null);
    setPatternsResult(null);
    setVoiceTranscript([]);
    voiceChunksRef.current = [];
    voiceClaimsRef.current = [];
    voiceChunkIdRef.current = 0;
    voiceLastL2AtChunkCountRef.current = 0;
    voiceLastL3AtChunkCountRef.current = 0;
    setActiveTab("pulse");
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();

    const n = voiceChunksRef.current.length;
    const chunks = [...voiceChunksRef.current];
    const claims = [...voiceClaimsRef.current];

    // L2: short sessions that never hit the rolling threshold
    if (n >= 5 && n < VOICE_L2_FIRST_CHUNKS) {
      void triggerL2(chunks, claims);
      voiceLastL2AtChunkCountRef.current = n;
    } else if (n >= VOICE_L2_FIRST_CHUNKS && n > voiceLastL2AtChunkCountRef.current) {
      // Final flush so the last partial window is included
      voiceLastL2AtChunkCountRef.current = n;
      void triggerL2(chunks, claims);
    }

    // L3: enough material and transcript grew since last patterns pass (or first-time short stop)
    if (n >= VOICE_L3_STOP_MIN_CHUNKS && n > voiceLastL3AtChunkCountRef.current) {
      voiceLastL3AtChunkCountRef.current = n;
      void triggerL3(chunks);
    }
  }, [stopRecording, triggerL2, triggerL3]);

  // --- Text paste handler (existing) ---
  const handleAnalyze = useCallback(
    async (text: string) => {
      abortRef.current = false;
      setPulseEntries([]);
      setAnalysisResult(null);
      setPatternsResult(null);
      setVoiceTranscript([]);
      setIsProcessing(true);
      setActiveTab("pulse");

      const chunks = splitIntoChunks(text);
      setChunkProgress({ current: 0, total: chunks.length });

      const processedChunks: string[] = [];
      const allClaims: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (abortRef.current) break;

        const chunk = chunks[i];
        setProcessingChunk(chunk);
        setChunkProgress({ current: i + 1, total: chunks.length });

        try {
          const res = await fetch("/api/analyze/pulse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chunk }),
          });

          if (res.ok) {
            const result: PulseResult = await res.json();
            const entry: PulseEntry = {
              id: `chunk-${i}`,
              chunk,
              result,
            };
            setPulseEntries((prev) => [...prev, entry]);
            allClaims.push(...result.claims);
          }
        } catch {
          // continue processing remaining chunks
        }

        processedChunks.push(chunk);

        if (processedChunks.length === 4) {
          triggerL2(processedChunks, allClaims);
        }

        if (processedChunks.length === 6) {
          triggerL3(processedChunks);
        }
      }

      if (processedChunks.length >= 3 && processedChunks.length < 4) {
        triggerL2(processedChunks, allClaims);
      }
      if (processedChunks.length >= 6) {
        // already triggered
      } else if (processedChunks.length >= 2) {
        triggerL3(processedChunks);
      }

      setProcessingChunk(null);
      setIsProcessing(false);
      setChunkProgress(null);
    },
    [triggerL2, triggerL3]
  );

  // --- URL fetch handler ---
  const handleFetchUrl = useCallback(
    async (url: string) => {
      setIsFetchingUrl(true);
      setPulseEntries([]);
      setAnalysisResult(null);
      setPatternsResult(null);
      setVoiceTranscript([]);

      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const { error } = await res.json();
          console.error("Extract error:", error);
          return;
        }

        const { text } = await res.json();
        if (text) {
          setIsFetchingUrl(false);
          handleAnalyze(text);
          return;
        }
      } catch (e) {
        console.error("Fetch URL failed:", e);
      } finally {
        setIsFetchingUrl(false);
      }
    },
    [handleAnalyze]
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "pulse", label: "Pulse", count: pulseEntries.length || undefined },
    { id: "analysis", label: "Analysis" },
    { id: "patterns", label: "Patterns" },
  ];

  const pulseBadge = pulseEntries.reduce(
    (sum, e) => sum + e.result.flags.length,
    0
  );

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#222] px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-sm font-bold tracking-wider text-[#e5e5e5]">
            TRUTHLENS
          </h1>
          <span className="text-[10px] text-[#444]">
            {viewMode === "debug" ? "Debug view · " : "Insights view · "}
            nemotron 3 super &middot;{" "}
            <button
              type="button"
              onClick={() => setShowArch(true)}
              className="text-[#666] underline decoration-[#333] underline-offset-2 transition-colors hover:text-[#e5e5e5] hover:decoration-[#666]"
            >
              3-tier analysis
            </button>
          </span>
          <div
            className="flex items-center gap-0.5 border border-[#222] p-0.5"
            role="group"
            aria-label="Interface mode"
          >
            <button
              type="button"
              onClick={() => setViewMode("insights")}
              className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                viewMode === "insights"
                  ? "bg-[#e5e5e5] text-[#0a0a0a]"
                  : "text-[#666] hover:text-[#e5e5e5]"
              }`}
            >
              Insights
            </button>
            <button
              type="button"
              onClick={() => setViewMode("debug")}
              className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                viewMode === "debug"
                  ? "bg-[#e5e5e5] text-[#0a0a0a]"
                  : "text-[#666] hover:text-[#e5e5e5]"
              }`}
            >
              Debug
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isRecording && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#ff4400]">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff4400]" />
              LIVE
            </span>
          )}
          {pulseBadge > 0 && (
            <span className="text-[10px] tabular-nums text-[#ff4400]">
              {pulseBadge} flag{pulseBadge !== 1 ? "s" : ""} detected
            </span>
          )}
        </div>
      </header>

      {/* Main two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Input */}
        <div className="w-[320px] shrink-0 border-r border-[#222] bg-[#0a0a0a] xl:w-[400px]">
          <TranscriptInput
            onAnalyze={handleAnalyze}
            onFetchUrl={handleFetchUrl}
            isRecording={isRecording}
            isProcessing={isProcessing}
            isFetchingUrl={isFetchingUrl}
            voiceTranscript={voiceTranscript}
            voiceError={voiceError}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            chunkProgress={chunkProgress}
            insightsMode={viewMode === "insights"}
            voiceChunkSeverities={voiceChunkSeverities}
          />
        </div>

        {/* Right: Analysis panels */}
        <div className="flex min-w-0 flex-1 flex-col bg-[#141414]">
          {viewMode === "insights" ? (
            <div className="flex-1 overflow-hidden transition-opacity duration-150">
              <InsightsPanel
                entries={pulseEntries}
                processingChunk={processingChunk}
                analysisResult={analysisResult}
                patternsResult={patternsResult}
                isAnalysisLoading={isAnalysisLoading}
                isPatternsLoading={isPatternsLoading}
                onSeekTranscriptChunk={seekTranscriptChunk}
              />
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex border-b border-[#222]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-5 py-3 text-[11px] font-semibold uppercase tracking-widest transition-colors ${
                      activeTab === tab.id
                        ? "text-[#e5e5e5]"
                        : "text-[#444] hover:text-[#666]"
                    }`}
                  >
                    {tab.label}
                    {tab.count && (
                      <span className="ml-2 text-[10px] tabular-nums text-[#666]">
                        {tab.count}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-px bg-[#e5e5e5]" />
                    )}
                    {tab.id === "analysis" && isAnalysisLoading && (
                      <span className="ml-2 inline-block h-1 w-1 animate-pulse bg-[#ffaa00]" />
                    )}
                    {tab.id === "analysis" &&
                      !isAnalysisLoading &&
                      analysisResult && (
                        <span
                          className="ml-2 inline-block h-1 w-1 rounded-full bg-[#00cc66]"
                          title="Analysis ready"
                        />
                      )}
                    {tab.id === "patterns" && isPatternsLoading && (
                      <span className="ml-2 inline-block h-1 w-1 animate-pulse bg-[#ffaa00]" />
                    )}
                    {tab.id === "patterns" &&
                      !isPatternsLoading &&
                      patternsResult && (
                        <span
                          className="ml-2 inline-block h-1 w-1 rounded-full bg-[#00cc66]"
                          title="Patterns ready"
                        />
                      )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-hidden transition-opacity duration-150">
                {activeTab === "pulse" && (
                  <PulseFeed
                    entries={pulseEntries}
                    processingChunk={processingChunk}
                  />
                )}
                {activeTab === "analysis" && (
                  <AnalysisPanel
                    result={analysisResult}
                    isLoading={isAnalysisLoading}
                  />
                )}
                {activeTab === "patterns" && (
                  <PatternsPanel
                    result={patternsResult}
                    isLoading={isPatternsLoading}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {showArch && <ArchitectureDiagram onClose={() => setShowArch(false)} />}
    </div>
  );
}
