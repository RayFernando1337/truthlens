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
  escalation: "\u2197",
  contradiction: "\u2A09",
  "narrative-arc": "\u25C7",
  "cherry-picking": "\u25EB",
};

function TrustChart({ data }: { data: number[] }) {
  if (data.length === 0) return null;

  const w = 400;
  const h = 60;
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
    <div className="border border-[#222] p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-[#666]">
          Trust trajectory
        </span>
        <span
          className="text-[9px] font-semibold tabular-nums"
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

  const analysis: AnalysisResult | null =
    patternsResult?.fullAnalysis ?? analysisResult;

  const analysisLoading = isAnalysisLoading || (isPatternsLoading && !analysis);

  const analysisSource: string | null = patternsResult?.fullAnalysis
    ? "Full transcript"
    : analysisResult
      ? "Partial \u00B7 updating when full transcript ready"
      : null;

  const pulseStripNewestFirst = useMemo(
    () =>
      [...entries]
        .map((entry, index) => ({ entry, index }))
        .reverse(),
    [entries]
  );

  return (
    <div className="h-full min-w-0 overflow-y-auto">
      {/* Live pulse strip */}
      <div className="sticky top-0 z-[1] border-b border-[#222] bg-[#141414] px-4 py-2">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
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
                  className="flex min-w-[120px] max-w-[200px] shrink-0 flex-col gap-1.5 border border-[#222] bg-[#0a0a0a] p-2 text-left transition-colors hover:border-[#333]"
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
                    {entry.chunk.length > 120 ? "\u2026" : ""}
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

      {/* Overall assessment + trust chart -- shown first so it's visible without scrolling */}
      {(patternsResult || isPatternsLoading) && (
        <div className="min-w-0 border-b border-[#222] px-4 py-3">
          {isPatternsLoading && !patternsResult && (
            <div className="flex items-center gap-2">
              <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
              <span className="text-[10px] uppercase tracking-widest text-[#444]">
                Scanning full transcript…
              </span>
            </div>
          )}
          {patternsResult && (
            <div className="space-y-3">
              <div className="border border-[#222] bg-[#0a0a0a] p-3">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">
                  Overall assessment
                </span>
                <p className="mt-1.5 min-w-0 text-sm leading-relaxed text-[#e5e5e5]">
                  {patternsResult.overallAssessment}
                </p>
              </div>
              {patternsResult.trustTrajectory.length > 0 && (
                <TrustChart data={patternsResult.trustTrajectory} />
              )}
              {patternsResult.patterns.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {patternsResult.patterns.map((pattern, i) => {
                    const color = PATTERN_COLORS[pattern.type] ?? "#666";
                    const icon = PATTERN_ICONS[pattern.type] ?? "\u2022";
                    return (
                      <div
                        key={i}
                        className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] border-l-2 pl-2"
                        style={{ borderColor: color }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span style={{ color }} className="text-[10px]">
                            {icon}
                          </span>
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wider"
                            style={{ color }}
                          >
                            {pattern.type}
                          </span>
                        </div>
                        <p className="mt-0.5 min-w-0 text-[11px] leading-snug text-[#ccc]">
                          {pattern.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Analysis -- TLDR + key findings */}
      <div className="min-w-0 border-b border-[#222] px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            {analysis ? "Deep analysis" : "Analysis"}
          </span>
          {analysisSource && (
            <span className="text-[9px] uppercase tracking-wider text-[#00cc66]">
              {analysisSource}
            </span>
          )}
        </div>
        {analysisLoading && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
            <span className="text-[10px] uppercase tracking-widest text-[#444]">
              {isAnalysisLoading
                ? "Running early-pass analysis..."
                : "Running full-transcript analysis…"}
            </span>
          </div>
        )}
        {!analysisLoading && !analysis && (
          <p className="mt-1.5 text-[11px] text-[#444]">
            Appears after more content is captured.
          </p>
        )}
        {analysis && (
          <div className="mt-2 min-w-0 space-y-3">
            {/* TLDR + underlying statement */}
            <div className="min-w-0 border border-[#222] bg-[#0a0a0a] p-3">
              <p className="min-w-0 text-xs leading-relaxed text-[#e5e5e5]">
                {analysis.tldr}
              </p>
              {analysis.underlyingStatement && (
                <p className="mt-1.5 min-w-0 text-[11px] leading-snug text-[#ff4400]">
                  {analysis.underlyingStatement}
                </p>
              )}
            </div>

            {/* Core points */}
            <div className="min-w-0">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">
                Core points
              </span>
              <ul className="mt-1.5 space-y-1">
                {analysis.corePoints.map((point, i) => (
                  <li
                    key={i}
                    className="min-w-0 text-[11px] leading-snug text-[#e5e5e5]"
                  >
                    <span className="mr-1.5 text-[#666]">{i + 1}.</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Evidence */}
            {analysis.evidenceTable.length > 0 && (
              <div className="min-w-0">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">
                  Evidence
                </span>
                <div className="mt-1.5 space-y-1.5">
                  {analysis.evidenceTable.map((row, i) => (
                    <div
                      key={i}
                      className="min-w-0 border-l-2 border-[#333] pl-2"
                    >
                      <p className="min-w-0 text-[11px] font-medium leading-snug text-[#e5e5e5]">
                        {row.claim}
                      </p>
                      <p className="mt-0.5 min-w-0 text-[10px] leading-snug text-[#666]">
                        {row.evidence}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gaps + Assumptions -- side by side when both present */}
            <div className="flex min-w-0 flex-wrap gap-3">
              {analysis.missing.length > 0 && (
                <div className="min-w-0 flex-1 basis-[200px]">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">
                    Gaps to verify
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {analysis.missing.map((m, i) => (
                      <span
                        key={i}
                        className="inline-block max-w-full truncate border border-[#ff4400]/40 bg-[#ff4400]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#ff4400]"
                        title={m}
                      >
                        {m.length > 50 ? `${m.slice(0, 50)}\u2026` : m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.assumptions.length > 0 && (
                <div className="min-w-0 flex-1 basis-[200px]">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">
                    Assumptions
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {analysis.assumptions.map((a, i) => (
                      <span
                        key={i}
                        className="inline-block max-w-full truncate border border-[#ffaa00]/40 bg-[#ffaa00]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#ffaa00]"
                        title={a}
                      >
                        {a.length > 60 ? `${a.slice(0, 60)}\u2026` : a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rhetorical appeals + Steelman -- compact row */}
            <div className="flex min-w-0 flex-wrap gap-3">
              <div className="min-w-0 shrink-0">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">
                  Rhetorical appeals
                </span>
                <div className="mt-1.5 flex gap-1.5">
                  {(["ethos", "pathos", "logos"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setAppealOpen((prev) => (prev === key ? null : key))
                      }
                      className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
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
                  <p className="mt-1.5 min-w-0 max-w-md text-[11px] leading-snug text-[#e5e5e5]">
                    {analysis.appeals[appealOpen]}
                  </p>
                )}
              </div>

              <div className="min-w-0 flex-1 basis-[200px] border border-[#00cc66]/30 bg-[#00cc66]/5 p-2.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-[#00cc66]">
                  Steelman
                </span>
                <p className="mt-1 min-w-0 text-[11px] leading-snug text-[#e5e5e5]">
                  {analysis.steelman}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session patterns empty state -- only when no patterns yet and not loading above */}
      {!patternsResult && !isPatternsLoading && (
        <div className="px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            Session patterns
          </span>
          <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-[#444]">
            <span className="text-[#666]">Voice:</span> first pass after{" "}
            <strong className="text-[#888]">6</strong> chunks (~24s), then{" "}
            <strong className="text-[#888]">every 4</strong> new chunks.
          </p>
        </div>
      )}
    </div>
  );
}
