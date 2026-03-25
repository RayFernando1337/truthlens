"use client";

import { useState } from "react";
import type { PostAnalysisQueryResult, PostQueryType, TopicSegment } from "@/lib/types";

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest text-text-secondary">
      {children}
    </span>
  );
}

const SCOL: Record<string, string> = {
  "argument-development": "#e5e5e5", "evidence-presentation": "#00cc66",
  "emotional-appeal": "#ff4400", "topic-shift": "#ffaa00",
  "qa-exchange": "#888", "philosophical-tangent": "#9966ff",
  "anecdote": "#44aaff", "summary-recap": "#666",
};

export function TopicSegmentsContent({ segments, onGenerate, isLoading }: {
  segments: TopicSegment[] | null; onGenerate: () => void; isLoading?: boolean;
}) {
  if (!segments) {
    if (isLoading) return (
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="h-1 w-1 animate-pulse bg-foreground" />
        <span className="text-[10px] uppercase tracking-widest text-[#444]">
          Mapping topic structure&hellip;
        </span>
      </div>
    );
    return (
      <div className="px-4 py-3">
        <p className="text-[11px] text-[#444]">No topic segments yet.</p>
        <button type="button" onClick={onGenerate}
          className="mt-2 border border-[#333] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground hover:border-foreground">
          Generate segments
        </button>
      </div>
    );
  }
  return (
    <div className="space-y-1 px-4 py-3">
      {segments.map((seg, i) => {
        const color = SCOL[seg.segmentType] ?? "#666";
        return (
          <div key={i} className="border-l-2 py-1 pl-2" style={{ borderColor: color }}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color }}>
                {seg.segmentType.replace(/-/g, " ")}
              </span>
              <span className="text-[9px] tabular-nums text-[#444]">
                [{seg.startSegmentIndex}&ndash;{seg.endSegmentIndex}]
              </span>
            </div>
            <p className="text-[11px] text-foreground">{seg.topic}</p>
            {seg.claimCount > 0 && (
              <span className="text-[9px] tabular-nums text-[#555]">
                {seg.claimCount} claims &middot; conf {Math.round(seg.avgConfidence * 100)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const QUERY_TYPES: { id: PostQueryType; label: string }[] = [
  { id: "theme", label: "Theme" },
  { id: "deep-dive", label: "Deep dive" },
  { id: "cross-topic", label: "Cross-topic" },
  { id: "freeform", label: "Freeform" },
];

function QueryResultDisplay({ result }: { result: PostAnalysisQueryResult }) {
  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-foreground">{result.answer}</p>
      {result.evidence.length > 0 && (
        <div>
          <Lbl>Evidence</Lbl>
          {result.evidence.map((ev, i) => (
            <div key={i} className="mt-1 border-l-2 border-[#333] pl-2">
              <p className="text-[10px] text-[#888]">[{ev.segmentId}]</p>
              <p className="text-[11px] italic text-[#ccc]">&ldquo;{ev.quote}&rdquo;</p>
              <p className="text-[10px] text-text-secondary">{ev.relevance}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QueryContent({ result, onSubmit }: {
  result: PostAnalysisQueryResult | null;
  onSubmit: (query: string, queryType: PostQueryType) => void;
}) {
  const [query, setQuery] = useState("");
  const [queryType, setQueryType] = useState<PostQueryType>("freeform");
  const [loading, setLoading] = useState(false);
  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    await onSubmit(query.trim(), queryType);
    setLoading(false);
  };
  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex gap-1.5">
        {QUERY_TYPES.map((qt) => (
          <button key={qt.id} type="button" onClick={() => setQueryType(qt.id)}
            className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
              queryType === qt.id
                ? "border-foreground bg-foreground text-bg"
                : "border-[#333] text-[#888] hover:border-text-secondary"
            }`}>{qt.label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} disabled={loading}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Ask about the transcript..."
          className="flex-1 border border-[#333] bg-transparent px-2 py-1.5 text-[11px] text-foreground placeholder:text-[#444] focus:border-text-secondary focus:outline-none" />
        <button type="button" onClick={handleSubmit} disabled={loading || !query.trim()}
          className="border border-[#333] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground hover:border-foreground disabled:opacity-30">
          {loading ? "\u2026" : "Ask"}
        </button>
      </div>
      {result && <QueryResultDisplay result={result} />}
    </div>
  );
}
