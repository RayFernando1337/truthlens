"use client";

import { useState } from "react";

const DEMO_TRANSCRIPT = `Our new AI platform processes data 10x faster than any competitor on the market. We've seen this across thousands of deployments.

Industry analysts predict that by 2027, every Fortune 500 company will have adopted this technology. The transformation is inevitable.

Studies show that companies using our platform see a 340% improvement in productivity. Our customers consistently report these kinds of results.

We believe this represents a fundamental shift in how businesses operate. As one leading expert put it, this is "the most important technology since the internet."

The architecture is built on proprietary algorithms that no other company has been able to replicate. Our team of world-class researchers has spent over a decade perfecting this approach.

Looking at the broader market, we're seeing unprecedented adoption rates. Our growth trajectory puts us on track to be the dominant platform within two years. The numbers speak for themselves.`;

export default function TranscriptInput({
  onAnalyze,
  isProcessing,
  chunkProgress,
}: {
  onAnalyze: (text: string) => void;
  isProcessing: boolean;
  chunkProgress: { current: number; total: number } | null;
}) {
  const [text, setText] = useState("");

  function handleAnalyze() {
    const content = text.trim();
    if (!content) return;
    onAnalyze(content);
  }

  function loadDemo() {
    setText(DEMO_TRANSCRIPT);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#222] px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[#666]">
          Input
        </span>
        <button
          onClick={loadDemo}
          disabled={isProcessing}
          className="text-[11px] uppercase tracking-wider text-[#666] transition-colors hover:text-[#e5e5e5] disabled:opacity-30"
        >
          Load demo
        </button>
      </div>

      <div className="flex-1 p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isProcessing}
          placeholder="Paste transcript, article, or any text with claims to analyze..."
          className="h-full w-full resize-none bg-transparent text-sm leading-relaxed text-[#e5e5e5] placeholder:text-[#333] focus:outline-none disabled:opacity-50"
        />
      </div>

      <div className="border-t border-[#222] px-4 py-3">
        {isProcessing && chunkProgress ? (
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
        ) : (
          <button
            onClick={handleAnalyze}
            disabled={!text.trim() || isProcessing}
            className="w-full border border-[#333] py-2 text-[11px] font-semibold uppercase tracking-widest text-[#e5e5e5] transition-colors hover:border-[#e5e5e5] hover:bg-[#e5e5e5] hover:text-[#0a0a0a] disabled:opacity-30 disabled:hover:border-[#333] disabled:hover:bg-transparent disabled:hover:text-[#e5e5e5]"
          >
            Analyze
          </button>
        )}
      </div>
    </div>
  );
}
