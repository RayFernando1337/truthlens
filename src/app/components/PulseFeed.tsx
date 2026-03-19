"use client";

import { useEffect, useRef } from "react";
import type { PulseEntry } from "@/lib/types";
import Flag from "./Flag";
import ConfidenceMeter from "./ConfidenceMeter";

export default function PulseFeed({
  entries,
  processingChunk,
}: {
  entries: PulseEntry[];
  processingChunk: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, processingChunk]);

  if (entries.length === 0 && !processingChunk) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[11px] uppercase tracking-widest text-[#333]">
          Waiting for input
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      {entries.map((entry) => (
        <div key={entry.id} className="border-b border-[#222] px-4 py-4">
          <div className="mb-3 text-sm leading-relaxed text-[#999]">
            {entry.chunk}
          </div>

          {entry.result.claims.length > 0 && (
            <div className="mb-2">
              {entry.result.claims.map((claim, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 py-0.5 text-xs text-[#e5e5e5]"
                >
                  <span className="mt-0.5 text-[#00cc66]">&#8250;</span>
                  <span>{claim}</span>
                </div>
              ))}
            </div>
          )}

          {entry.result.flags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {entry.result.flags.map((flag, i) => (
                <Flag key={i} flag={flag} />
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <ConfidenceMeter
              value={entry.result.confidence}
              label="confidence"
            />
            <span className="text-[10px] text-[#444]">
              {entry.result.tone}
            </span>
          </div>
        </div>
      ))}

      {processingChunk && (
        <div className="border-b border-[#222] px-4 py-4">
          <div className="mb-2 text-sm leading-relaxed text-[#666]">
            {processingChunk}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
            <span className="text-[10px] uppercase tracking-widest text-[#444]">
              Analyzing
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
