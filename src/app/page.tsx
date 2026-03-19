"use client";

import { useState, useCallback, useRef } from "react";
import type {
  PulseEntry,
  PulseResult,
  AnalysisResult,
  PatternsResult,
} from "@/lib/types";
import TranscriptInput from "./components/TranscriptInput";
import PulseFeed from "./components/PulseFeed";
import AnalysisPanel from "./components/AnalysisPanel";
import PatternsPanel from "./components/PatternsPanel";

type Tab = "pulse" | "analysis" | "patterns";

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
  const [activeTab, setActiveTab] = useState<Tab>("pulse");
  const [pulseEntries, setPulseEntries] = useState<PulseEntry[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [patternsResult, setPatternsResult] = useState<PatternsResult | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isPatternsLoading, setIsPatternsLoading] = useState(false);
  const [processingChunk, setProcessingChunk] = useState<string | null>(null);
  const [chunkProgress, setChunkProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const abortRef = useRef(false);

  const triggerL2 = useCallback(
    async (chunks: string[], allClaims: string[]) => {
      setIsAnalysisLoading(true);
      setActiveTab("analysis");
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

  const handleAnalyze = useCallback(
    async (text: string) => {
      abortRef.current = false;
      setPulseEntries([]);
      setAnalysisResult(null);
      setPatternsResult(null);
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

      // final triggers if thresholds weren't met during processing
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
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-wider text-[#e5e5e5]">
            TRUTHLENS
          </h1>
          <span className="text-[10px] text-[#444]">
            nemotron 3 super &middot; 3-tier analysis
          </span>
        </div>
        {pulseBadge > 0 && (
          <span className="text-[10px] tabular-nums text-[#ff4400]">
            {pulseBadge} flag{pulseBadge !== 1 ? "s" : ""} detected
          </span>
        )}
      </header>

      {/* Main two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Input */}
        <div className="w-[400px] shrink-0 border-r border-[#222] bg-[#0a0a0a]">
          <TranscriptInput
            onAnalyze={handleAnalyze}
            isProcessing={isProcessing}
            chunkProgress={chunkProgress}
          />
        </div>

        {/* Right: Analysis panels */}
        <div className="flex flex-1 flex-col bg-[#141414]">
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
                {tab.id === "patterns" && isPatternsLoading && (
                  <span className="ml-2 inline-block h-1 w-1 animate-pulse bg-[#ffaa00]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
