"use client";

import type { PatternsResult } from "@/lib/types";

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
          <linearGradient id="trustFill" x1="0" y1="0" x2="0" y2="1">
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
        <path d={areaD} fill="url(#trustFill)" />
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

export default function PatternsPanel({
  result,
  isLoading,
}: {
  result: PatternsResult | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
          <span className="text-[10px] uppercase tracking-widest text-[#444]">
            Detecting patterns across full transcript
          </span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[11px] uppercase tracking-widest text-[#333]">
          Triggers after 6+ chunks
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <TrustChart data={result.trustTrajectory} />
      </div>

      {result.patterns.length > 0 && (
        <div className="border-t border-[#222] px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
            Detected Patterns
          </span>
          <div className="mt-3 space-y-3">
            {result.patterns.map((pattern, i) => {
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

      <div className="border-t border-[#222] px-4 py-4">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#666]">
          Overall Assessment
        </span>
        <p className="mt-2 text-sm leading-relaxed text-[#e5e5e5]">
          {result.overallAssessment}
        </p>
      </div>
    </div>
  );
}
