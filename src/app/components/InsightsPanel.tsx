"use client";

import { useState, useMemo } from "react";
import type {
  AnalysisResult,
  PatternsResult,
  PulseEntry,
} from "@/lib/types";
import { severityFromPulse } from "@/lib/pulse-utils";
import Flag from "./Flag";

const PATTERN_COLORS: Record<string, string> = {
  escalation: "#ff4400",
  contradiction: "#ff4400",
  "narrative-arc": "#ffaa00",
  "cherry-picking": "#ffaa00",
};

const PATTERN_ICONS: Record<string, string> = {
  escalation: "↗",
  contradiction: "⨉",
  "narrative-arc": "◇",
  "cherry-picking": "◫",
};

function TrustChart({ data }: { data: number[] }) {
  if (data.length === 0) return null;

  const w = 400;
  const h = 80;
  const padding = 2;
  const step = (w - padding * 2) / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => ({
    x: padding + i * step,
    y: h - padding - v * (h - padding * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const areaD = `${pathD} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`;

  function getColor(v: number): string {
    if (v >= 0.7) return "#00cc66";
    if (v >= 0.4) return "#ffaa00";
    return "#ff4400";
  }

  const avgValue = data.reduce((a, b) => a + b, 0) / data.length;
  const lineColor = getColor(avgValue);

  return (
    <div className="border border-[#222] p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-[#666]">
          Trust trajectory
        </span>
        <span
          className="text-[10px] font-semibold tabular-nums"
          style={{ color: lineColor }}
        >
          avg {Math.round(avgValue * 100)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="insightsTrustFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={padding}
          y1={h * 0.5}
          x2={w - padding}
          y2={h * 0.5}
          stroke="#222"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        />
        <path d={areaD} fill="url(#insightsTrustFill)" />
        <path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill={getColor(data[i])}
          />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[9px] text-[#444]">
        <span>start</span>
        <span>end</span>
      </div>
    </div>
  );
}

function pulseStripDotClass(entry: PulseEntry): string {
  const s = severityFromPulse(entry.result);
  if (s === "flag") return "bg-[#ff4400] ring-1 ring-[#ff4400]/50";
  if (s === "warn") return "bg-[#ffaa00] ring-1 ring-[#ffaa00]/50";
  return "bg-[#00cc66] ring-1 ring-[#00cc66]/40";
}

export default function InsightsPanel({
  entries,
  processingChunk,
  analysisResult,
  patternsResult,
  isAnalysisLoading,
  isPatternsLoading,
  onSeekTranscriptChunk,
}: {
  entries: PulseEntry[];
  processingChunk: string | null;
  analysisResult: AnalysisResult | null;
  patternsResult: PatternsResult | null;
  isAnalysisLoading: boolean;
  isPatternsLoading: boolean;
  onSeekTranscriptChunk: (chunkIndex: number) => void;
}) {
  const [appealOpen, setAppealOpen] = useState<
    "ethos" | "pathos" | "logos" | null
  >(null);

  const hasAnyPulse = entries.length > 0 || processingChunk;

  /** Newest segment first (left), older to the right — matches “live” reading order. */
  const pulseStripNewestFirst = useMemo(
    () =>
      [...entries]
        .map((entry, index) => ({ entry, index }))
        .reverse(),
    [entries]
  );

  return (
    <div className="h-full overflow-y-auto">
      {/* Live pulse strip */}
      <div className="sticky top-0 z-[1] border-b border-[#222] bg-[#141414] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            Live pulse
          </span>
          {hasAnyPulse && (
            <span className="text-[9px] uppercase tracking-wider text-[#444]">
              Newest left
            </span>
          )}
        </div>
        {!hasAnyPulse ? (
          <p className="text-[11px] text-[#444]">Waiting for audio or text…</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {processingChunk && (
              <div className="flex min-w-[100px] shrink-0 flex-col justify-center border border-dashed border-[#333] p-2">
                <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
                <span className="mt-2 text-[9px] uppercase tracking-wider text-[#444]">
                  Latest · analyzing…
                </span>
              </div>
            )}
            {pulseStripNewestFirst.map(({ entry, index: i }) => {
              const primaryFlag = entry.result.flags[0];
              return (
                <button
                  key={entry.id}
                  type="button"
                  title={`Chunk ${i + 1}: scroll transcript`}
                  onClick={() => onSeekTranscriptChunk(i)}
                  className="flex min-w-[120px] max-w-[200px] shrink-0 flex-col gap-2 border border-[#222] bg-[#0a0a0a] p-2 text-left transition-colors hover:border-[#333]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 shrink-0 rounded-full ${pulseStripDotClass(entry)}`}
                    />
                    <span className="text-[10px] tabular-nums text-[#444]">
                      #{i + 1}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[10px] leading-snug text-[#888]">
                    {entry.chunk.slice(0, 120)}
                    {entry.chunk.length > 120 ? "…" : ""}
                  </p>
                  {primaryFlag ? (
                    <div className="scale-90 origin-top-left">
                      <Flag flag={primaryFlag} />
                    </div>
                  ) : (
                    <span className="text-[9px] uppercase tracking-wider text-[#444]">
                      No flags
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* L2 summary */}
      <div className="border-b border-[#222] px-4 py-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
          Deep analysis
        </span>
        {isAnalysisLoading && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
            <span className="text-[10px] uppercase tracking-widest text-[#444]">
              Running verification…
            </span>
          </div>
        )}
        {!isAnalysisLoading && !analysisResult && (
          <p className="mt-2 text-[11px] text-[#444]">
            Voice: first deep pass at <span className="text-[#888]">8</span>{" "}
            chunks, then every <span className="text-[#888]">+4</span> on the
            full session. Paste/URL: after 4 segments (unchanged).
          </p>
        )}
        {analysisResult && (
          <div className="mt-3 space-y-4">
            <div className="border border-[#222] bg-[#0a0a0a] p-4">
              <p className="text-sm leading-relaxed text-[#e5e5e5]">
                {analysisResult.tldr}
              </p>
              <p className="mt-2 text-xs text-[#ff4400]">
                {analysisResult.underlyingStatement}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
                Core points
              </span>
              <ul className="mt-2 space-y-2">
                {analysisResult.corePoints.map((point, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-xs text-[#e5e5e5]"
                  >
                    <span className="text-[#666]">{i + 1}.</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
                Evidence
              </span>
              <div className="mt-2 space-y-2">
                {analysisResult.evidenceTable.map((row, i) => (
                  <div
                    key={i}
                    className="border-l-2 border-[#333] pl-3"
                  >
                    <p className="text-xs font-medium text-[#e5e5e5]">
                      {row.claim}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#666]">
                      {row.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {analysisResult.missing.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
                  Gaps to verify
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysisResult.missing.map((m, i) => (
                    <span
                      key={i}
                      className="inline-block border border-[#ff4400]/40 bg-[#ff4400]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#ff4400]"
                    >
                      {m.length > 80 ? `${m.slice(0, 80)}…` : m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.assumptions.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
                  Assumptions
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {analysisResult.assumptions.map((a, i) => (
                    <span
                      key={i}
                      className="inline-block border border-[#ffaa00]/40 bg-[#ffaa00]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#ffaa00]"
                    >
                      {a.length > 100 ? `${a.slice(0, 100)}…` : a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
                Rhetorical appeals
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["ethos", "pathos", "logos"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setAppealOpen((prev) => (prev === key ? null : key))
                    }
                    className={`border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      appealOpen === key
                        ? "border-[#e5e5e5] bg-[#e5e5e5] text-[#0a0a0a]"
                        : "border-[#333] text-[#888] hover:border-[#666] hover:text-[#e5e5e5]"
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {appealOpen && (
                <p className="mt-2 text-xs leading-relaxed text-[#e5e5e5]">
                  {analysisResult.appeals[appealOpen]}
                </p>
              )}
            </div>

            <div className="border border-[#00cc66]/40 bg-[#00cc66]/5 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#00cc66]">
                Steelman
              </span>
              <p className="mt-2 text-xs leading-relaxed text-[#e5e5e5]">
                {analysisResult.steelman}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* L3 patterns */}
      <div className="px-4 py-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
          Session patterns
        </span>
        {isPatternsLoading && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
            <span className="text-[10px] uppercase tracking-widest text-[#444]">
              Scanning full transcript…
            </span>
          </div>
        )}
        {!isPatternsLoading && !patternsResult && (
          <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-[#444]">
            <span className="text-[#666]">Voice:</span> first pass after{" "}
            <strong className="text-[#888]">6</strong> chunks (~24s), then{" "}
            <strong className="text-[#888]">every 4</strong> new chunks the
            full transcript is re-scanned (rolling tail). Stop with{" "}
            <strong className="text-[#888]">4+</strong> chunks runs a final
            pass if the tape grew since the last one.{" "}
            <span className="text-[#666]">Paste:</span> still at 6 segments.
          </p>
        )}
        {patternsResult && (
          <div className="mt-3 space-y-4">
            {patternsResult.trustTrajectory.length > 0 && (
              <TrustChart data={patternsResult.trustTrajectory} />
            )}
            {patternsResult.patterns.length > 0 && (
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
                  Detected patterns
                </span>
                <div className="mt-3 space-y-3">
                  {patternsResult.patterns.map((pattern, i) => {
                    const color = PATTERN_COLORS[pattern.type] ?? "#666";
                    const icon = PATTERN_ICONS[pattern.type] ?? "•";
                    return (
                      <div
                        key={i}
                        className="border-l-2 pl-3"
                        style={{ borderColor: color }}
                      >
                        <div className="flex items-center gap-2">
                          <span style={{ color }} className="text-xs">
                            {icon}
                          </span>
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color }}
                          >
                            {pattern.type}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[#e5e5e5]">
                          {pattern.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="border border-[#222] bg-[#0a0a0a] p-4">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
                Overall assessment
              </span>
              <p className="mt-2 text-sm leading-relaxed text-[#e5e5e5]">
                {patternsResult.overallAssessment}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
