"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PulseEntry } from "@/lib/types";
import Flag from "./Flag";
import ConfidenceMeter from "./ConfidenceMeter";

const NEAR_BOTTOM_PX = 80;

export default function PulseFeed({
  entries,
  processingChunk,
}: {
  entries: PulseEntry[];
  processingChunk: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followingRef = useRef(true);
  const [showJumpToLive, setShowJumpToLive] = useState(false);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    followingRef.current = true;
    setShowJumpToLive(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    followingRef.current = nearBottom;
    setShowJumpToLive(!nearBottom);
  }, []);

  useEffect(() => {
    if (entries.length === 0 && !processingChunk) {
      followingRef.current = true;
      setShowJumpToLive(false);
    }
  }, [entries.length, processingChunk]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (followingRef.current) {
      el.scrollTop = el.scrollHeight;
      setShowJumpToLive(false);
    } else {
      setShowJumpToLive(true);
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
    <div className="relative h-full">
      {showJumpToLive && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 border border-[#333] bg-[#141414] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#e5e5e5] shadow-lg transition-colors hover:border-[#e5e5e5]"
        >
          Scroll to live
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
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
    </div>
  );
}
