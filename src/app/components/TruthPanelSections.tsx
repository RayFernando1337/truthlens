"use client";

import type { AnalysisSnapshot, VerificationRun } from "@/lib/types";

export { AnalysisContent } from "./AnalysisContent";

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest text-text-secondary">
      {children}
    </span>
  );
}

function VerifyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="mt-2 border border-[#333] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground hover:border-foreground"
    >
      {label}
    </button>
  );
}

const VCOL: Record<string, string> = {
  supported: "#00cc66", refuted: "#ff4400",
  unverifiable: "#666", "partially-supported": "#ffaa00",
};
const VICON: Record<string, string> = {
  supported: "\u2713", refuted: "\u2717",
  unverifiable: "?", "partially-supported": "~",
};

export function VerdictsContent({ run, error, onVerify, isLoading }: {
  run: VerificationRun | null; error: string | null;
  onVerify: () => void; isLoading: boolean;
}) {
  if (isLoading) return (
    <div className="flex items-center gap-2 px-4 py-4">
      <span className="h-1 w-1 animate-pulse bg-foreground" />
      <span className="text-[10px] uppercase tracking-widest text-[#444]">
        Checking outside support&hellip;
      </span>
    </div>
  );
  if (error) return (
    <div className="px-4 py-3">
      <p className="text-[11px] text-[#ffb199]">{error}</p>
      <VerifyBtn label="Retry" onClick={onVerify} />
    </div>
  );
  if (!run) return (
    <div className="px-4 py-3">
      <p className="text-[11px] text-[#444]">No verdicts yet.</p>
      <VerifyBtn label="Verify claims" onClick={onVerify} />
    </div>
  );
  const all = [...run.llmResolved, ...run.webVerified];
  return (
    <div className="space-y-1.5 px-4 py-3">
      <div className="flex items-center gap-3 text-[10px] tabular-nums">
        <span className="text-green">{all.filter((v) => v.verdict === "supported").length} supported</span>
        <span className="text-[#333]">&middot;</span>
        <span className="text-accent">{all.filter((v) => v.verdict === "refuted").length} refuted</span>
        <span className="text-[#333]">&middot;</span>
        <span className="text-text-secondary">{run.unverified.length} unverified</span>
      </div>
      {all.map((v) => (
        <div key={v.claimId} className="border-l-2 pl-2" style={{ borderColor: VCOL[v.verdict] ?? "#666" }}>
          <p className="text-[11px] text-foreground">
            <span style={{ color: VCOL[v.verdict] }}>{VICON[v.verdict]}</span>{" "}{v.claim}
          </p>
          <p className="text-[10px] text-text-secondary">{v.explanation}</p>
        </div>
      ))}
      {run.unverified.map((u) => (
        <div key={u.claimId} className="border-l-2 border-[#333] pl-2">
          <p className="text-[11px] text-[#888]">? {u.claim}</p>
        </div>
      ))}
    </div>
  );
}

const PCOL: Record<string, string> = {
  escalation: "#ff4400", contradiction: "#ff4400",
  "narrative-arc": "#ffaa00", "cherry-picking": "#ffaa00",
};
const PICON: Record<string, string> = {
  escalation: "\u2197", contradiction: "\u2A09",
  "narrative-arc": "\u25C7", "cherry-picking": "\u25EB",
};

export function PatternsContent({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="space-y-3 px-4 py-3">
      {snapshot.overallAssessment && (
        <div className="border border-border bg-bg p-3">
          <Lbl>Overall assessment</Lbl>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            {snapshot.overallAssessment}
          </p>
        </div>
      )}
      {snapshot.patterns.length > 0
        ? snapshot.patterns.map((p, i) => {
            const color = PCOL[p.type] ?? "#666";
            return (
              <div key={i} className="border-l-2 pl-2" style={{ borderColor: color }}>
                <div className="flex items-center gap-1.5">
                  <span style={{ color }} className="text-[10px]">
                    {PICON[p.type] ?? "\u2022"}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color }}>
                    {p.type}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-[#ccc]">{p.description}</p>
              </div>
            );
          })
        : <p className="text-[11px] text-[#444]">No patterns detected yet.</p>}
    </div>
  );
}

export { TopicSegmentsContent, QueryContent } from "./TruthPanelExtras";
