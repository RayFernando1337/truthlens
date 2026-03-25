"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type {
  AnalysisSnapshot,
  PulseEntry,
  PulseResult,
  AnalysisResult,
  PatternsResult,
  SegmentPulse,
  TranscriptSegment,
} from "@/lib/types";
import { severityFromPulse } from "@/lib/pulse-utils";
import type { ChunkSeverity } from "@/lib/pulse-utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toAnalysisResult, toPatternsResult } from "@/lib/legacy-analysis";
import TranscriptInput from "./components/TranscriptInput";
import PulseFeed from "./components/PulseFeed";
import AnalysisPanel from "./components/AnalysisPanel";
import PatternsPanel from "./components/PatternsPanel";
import InsightsPanel from "./components/InsightsPanel";
import ArchitectureDiagram from "./components/ArchitectureDiagram";

type Tab = "pulse" | "analysis" | "patterns";
type ViewMode = "debug" | "insights";

const VOICE_ANALYSIS_FIRST_CHUNKS = 8;
const VOICE_ANALYSIS_ROLL_EVERY = 4;
const VOICE_FULL_FIRST_CHUNKS = 6;
const VOICE_FULL_ROLL_EVERY = 4;
const VOICE_FULL_STOP_MIN_CHUNKS = 4;

function makeSegment(
  segmentId: string,
  text: string,
  index: number
): TranscriptSegment {
  return { segmentId, text, index };
}

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
  const voiceSegmentsRef = useRef<TranscriptSegment[]>([]);
  const pulseResultsRef = useRef<SegmentPulse[]>([]);
  const voiceChunkIdRef = useRef(0);
  const voiceLastAnalysisAtChunkCountRef = useRef(0);
  const voiceLastFullAtChunkCountRef = useRef(0);

  const triggerStreamingAnalysis = useCallback(
    async (segments: TranscriptSegment[], priorPulses: SegmentPulse[]) => {
      setIsAnalysisLoading(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "streaming",
            segments,
            priorPulses,
          }),
        });
        if (res.ok) {
          const data: AnalysisSnapshot = await res.json();
          setAnalysisResult(toAnalysisResult(data));
        }
      } finally {
        setIsAnalysisLoading(false);
      }
    },
    []
  );

  const triggerFullAnalysis = useCallback(
    async (
      segments: TranscriptSegment[],
      mode: "full" | "batch" = "full",
      priorPulses?: SegmentPulse[]
    ) => {
      setIsPatternsLoading(true);
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, segments, priorPulses }),
        });
        if (res.ok) {
          const data: AnalysisSnapshot = await res.json();
          setAnalysisResult(toAnalysisResult(data));
          setPatternsResult(toPatternsResult(data));
        }
      } finally {
        setIsPatternsLoading(false);
      }
    },
    []
  );

  // --- Voice chunk handler: runs L1 on each transcribed chunk ---
  const handleVoiceChunk = useCallback(
    async (text: string) => {
      setVoiceTranscript((prev) => [...prev, text]);
      setActiveTab("pulse");

      const chunkId = voiceChunkIdRef.current++;
      const segmentId = `voice-${chunkId}`;
      const previousSegments = voiceSegmentsRef.current.slice(-3);
      const segment = makeSegment(segmentId, text, voiceSegmentsRef.current.length);
      voiceSegmentsRef.current.push(segment);

      setProcessingChunk(text);

      try {
        const res = await fetch("/api/analyze/pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segment, previousSegments }),
        });

        if (res.ok) {
          const result: PulseResult = await res.json();
          const entry: PulseEntry = {
            id: segmentId,
            chunk: text,
            result,
          };
          setPulseEntries((prev) => [...prev, entry]);
          pulseResultsRef.current.push({ ...result, segmentId });
        }
      } catch {
        // continue listening
      }

      setProcessingChunk(null);

      const n = voiceSegmentsRef.current.length;
      const allSegments = [...voiceSegmentsRef.current];
      const priorPulses = [...pulseResultsRef.current];

      if (n >= VOICE_ANALYSIS_FIRST_CHUNKS) {
        const lastAnalysis = voiceLastAnalysisAtChunkCountRef.current;
        if (lastAnalysis === 0) {
          voiceLastAnalysisAtChunkCountRef.current = n;
          void triggerStreamingAnalysis(allSegments, priorPulses);
        } else if (n - lastAnalysis >= VOICE_ANALYSIS_ROLL_EVERY) {
          voiceLastAnalysisAtChunkCountRef.current = n;
          void triggerStreamingAnalysis(allSegments, priorPulses);
        }
      }

      if (n >= VOICE_FULL_FIRST_CHUNKS) {
        const lastFull = voiceLastFullAtChunkCountRef.current;
        if (lastFull === 0) {
          voiceLastFullAtChunkCountRef.current = n;
          void triggerFullAnalysis(allSegments, "full", priorPulses);
        } else if (n - lastFull >= VOICE_FULL_ROLL_EVERY) {
          voiceLastFullAtChunkCountRef.current = n;
          void triggerFullAnalysis(allSegments, "full", priorPulses);
        }
      }
    },
    [triggerFullAnalysis, triggerStreamingAnalysis]
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
    voiceSegmentsRef.current = [];
    pulseResultsRef.current = [];
    voiceChunkIdRef.current = 0;
    voiceLastAnalysisAtChunkCountRef.current = 0;
    voiceLastFullAtChunkCountRef.current = 0;
    setActiveTab("pulse");
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    await stopRecording();

    const n = voiceSegmentsRef.current.length;
    const segments = [...voiceSegmentsRef.current];
    const priorPulses = [...pulseResultsRef.current];

    if (n >= 5 && n < VOICE_ANALYSIS_FIRST_CHUNKS) {
      void triggerStreamingAnalysis(segments, priorPulses);
      voiceLastAnalysisAtChunkCountRef.current = n;
    } else if (
      n >= VOICE_ANALYSIS_FIRST_CHUNKS &&
      n > voiceLastAnalysisAtChunkCountRef.current
    ) {
      voiceLastAnalysisAtChunkCountRef.current = n;
      void triggerStreamingAnalysis(segments, priorPulses);
    }

    if (n >= VOICE_FULL_STOP_MIN_CHUNKS && n > voiceLastFullAtChunkCountRef.current) {
      voiceLastFullAtChunkCountRef.current = n;
      void triggerFullAnalysis(segments, "full", priorPulses);
    }
  }, [stopRecording, triggerFullAnalysis, triggerStreamingAnalysis]);

  // --- Text paste handler (existing) ---
  const handleAnalyze = useCallback(
    async (text: string) => {
      abortRef.current = false;
      setPulseEntries([]);
      setAnalysisResult(null);
      setPatternsResult(null);
      setVoiceTranscript([]);
      voiceSegmentsRef.current = [];
      pulseResultsRef.current = [];
      setIsProcessing(true);
      setActiveTab("pulse");

      const chunks = splitIntoChunks(text);
      setChunkProgress({ current: 0, total: chunks.length });

      const segments = chunks.map((chunk, index) =>
        makeSegment(`chunk-${index}`, chunk, index)
      );
      const processedSegments: TranscriptSegment[] = [];
      pulseResultsRef.current = [];

      for (let i = 0; i < segments.length; i++) {
        if (abortRef.current) break;

        const segment = segments[i];
        const previousSegments = processedSegments.slice(-3);
        setProcessingChunk(segment.text);
        setChunkProgress({ current: i + 1, total: segments.length });

        try {
          const res = await fetch("/api/analyze/pulse", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ segment, previousSegments }),
          });

          if (res.ok) {
            const result: PulseResult = await res.json();
            const entry: PulseEntry = {
              id: segment.segmentId,
              chunk: segment.text,
              result,
            };
            setPulseEntries((prev) => [...prev, entry]);
            pulseResultsRef.current.push({
              ...result,
              segmentId: segment.segmentId,
            });
          }
        } catch {
          // continue processing remaining chunks
        }

        processedSegments.push(segment);

        if (processedSegments.length === 4) {
          void triggerStreamingAnalysis(processedSegments, [...pulseResultsRef.current]);
        }

        if (processedSegments.length === 6) {
          void triggerFullAnalysis(
            processedSegments,
            "full",
            [...pulseResultsRef.current]
          );
        }
      }

      if (processedSegments.length >= 3 && processedSegments.length < 4) {
        void triggerStreamingAnalysis(processedSegments, [...pulseResultsRef.current]);
      }
      if (processedSegments.length >= 6) {
        // already triggered
      } else if (processedSegments.length >= 2) {
        void triggerFullAnalysis(
          processedSegments,
          "full",
          [...pulseResultsRef.current]
        );
      }

      setProcessingChunk(null);
      setIsProcessing(false);
      setChunkProgress(null);
    },
    [triggerFullAnalysis, triggerStreamingAnalysis]
  );

  // --- URL fetch handler ---
  const handleFetchUrl = useCallback(
    async (url: string) => {
      setIsFetchingUrl(true);
      setPulseEntries([]);
      setAnalysisResult(null);
      setPatternsResult(null);
      setVoiceTranscript([]);
      voiceSegmentsRef.current = [];
      pulseResultsRef.current = [];

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
