"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import type { ChunkSeverity } from "@/lib/pulse-utils";

const DEMO_GENERIC = `Our new AI platform processes data 10x faster than any competitor on the market. We've seen this across thousands of deployments.

Industry analysts predict that by 2027, every Fortune 500 company will have adopted this technology. The transformation is inevitable.

Studies show that companies using our platform see a 340% improvement in productivity. Our customers consistently report these kinds of results.

We believe this represents a fundamental shift in how businesses operate. As one leading expert put it, this is "the most important technology since the internet."

The architecture is built on proprietary algorithms that no other company has been able to replicate. Our team of world-class researchers has spent over a decade perfecting this approach.

Looking at the broader market, we're seeing unprecedented adoption rates. Our growth trajectory puts us on track to be the dominant platform within two years. The numbers speak for themselves.`;

const DEMO_ANDREESSEN = `We're adding a trillion dollars to the national debt every 100 days right now, and it's now passing the size of the Defense Department budget and it's compounding, and pretty soon it's going to be adding a trillion dollars every 90 days, and then every 80 days, and then every 70 days. And then if this doesn't get fixed, at some point, we enter a hyper-inflationary spiral and we become Argentina or Brazil.

The United States just kept growing. If you just look at economic growth charts, the US just kept growing and very significantly, many other countries stopped growing. Canada stopped growing, the UK has stopped growing, Germany has stopped growing, and some of those countries may be actually growing backwards at this point.

We can be energy independent anytime we want. This last administration decided they didn't want to be, they wanted to turn off American energy. This new administration has declared that they have a goal of turning it on in a dramatic way. There's no question we can be energy independent, we can be a giant net energy exporter. It's purely a question of choice.

We're the beneficiary of 50, 100, 200 years of basically the most aggressive driven, smartest people in the world, most capable people moving to the US and raising their kids here. We're by far the most dynamic population, most aggressive set of characters, certainly in any Western country.

For anything in software, anything in AI, anything in advanced biotech, all these advanced areas of technology, we're by far the leader. All of our competitors have profound issues, and the competitive landscape is remarkable how much better positioned we are for growth.

The low point in the 70s was Jimmy Carter who went on TV and gave the Malaise Speech. And then Reagan came in and he's like, "Yep, nope, it's morning in America and we're the shining city on the hill." And the national spirit came roaring back and roared really hard for a full decade. I think that's exactly what could happen here.

Most people don't actually have some inner core of rock solid beliefs. I think what happens is they conform to the belief system around them, and most of the time they're not even aware that they're basically part of a herd. Why does every dinner party have the exact same conversation? Why does everybody agree on every single issue? Why is that agreement precisely what was in the New York Times today?

The idea that people have beliefs is mostly wrong. I think most people just go along. The most high status people are the most prone to just go along because they're the most focused on status. Harvard and Yale believe the exact same thing. The New York Times and The Washington Post believe the exact same thing. The Ford Foundation and the Rockefeller Foundation believe the exact same thing. But those things change over time, but there's never conflict in the moment.

AI censorship is a million times more dangerous than social media censorship. AI values will be a million times bigger and more intense and more important than the social media censorship fight. The Biden administration had seething contempt for tech.`;

const DEMO_LENNY_POD = `Products or is it just I tell the Ai how to build products? It's like whatever. Whatever that job is called, who even knows what it's going to be, but it's going to be incredibly important.

Because the people doing that job are going to be orchestrated by Ai. And so that's the track that the best people are going to be on. And I think that's the thing that.

Lean hearted to. I think people aren't fully grasping just this. Specifically software engineering and how much that is changing. Like it's.

It's pretty clear we're going to be in a world soon where engineers are not actually writing code, which I think a year ago we would not have thought and now it's just clearly this is where it's heading.

It's like it's going to be this artisanal experience of sitting there writing code, which is so crazy how much that job is going to change. Yeah, so.

I can hear I go back and again maybe the history lesson, but like I go back like. So The 1st You may know that. Do you know? The original definition of the term calculator, you know what that referred to?

Referred to people Right. So. Back before there were like electronic calculators or computers or any of these things.

The way that you would actually do computing and the way that you would do calculating like the way that insurance company would calculate actuarial tables or the military would like calculate, you know, I don't know, whatever troop logistics formulas or whatever it was.

The way that you would do it is you would actually have a room full of people. And by the way, groups, you can have hundreds or thousands or tens of thousands of people.`;

type DemoKey = "generic" | "andreessen" | "lennypod";

const DEMOS: Record<DemoKey, { label: string; transcript: string }> = {
  generic: { label: "Tech pitch", transcript: DEMO_GENERIC },
  andreessen: { label: "Andreessen", transcript: DEMO_ANDREESSEN },
  lennypod: { label: "Lenny Pod", transcript: DEMO_LENNY_POD },
};

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

  const syncJumpButton = useCallback(() => {
    setShowJumpToLive(!followingRef.current);
  }, []);

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
      onAnalyze(content);
    }
  }

  function loadDemo(key: DemoKey) {
    setText(DEMOS[key].transcript);
  }

  const busy = isProcessing || isFetchingUrl;
  const showJumpButton = (isRecording || hasVoiceChunks) && showJumpToLive;

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
          {!isRecording &&
            (Object.entries(DEMOS) as [DemoKey, (typeof DEMOS)[DemoKey]][]).map(
              ([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => loadDemo(key)}
                  disabled={busy}
                  className="text-[11px] uppercase tracking-wider text-[#666] transition-colors hover:text-[#e5e5e5] disabled:opacity-30"
                >
                  {label}
                </button>
              )
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
