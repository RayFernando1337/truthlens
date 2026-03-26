"use client";

import type { AnalysisSnapshot, VerificationRun } from "@/lib/types";

export { AnalysisContent } from "./AnalysisContent";

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-semibold uppercase tracking-widest text-text-secondary">
      {children}
    </span>
  );
}

function VerifyBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="mt-2 border border-input px-3 py-1 text-sm font-semibold uppercase tracking-widest text-foreground hover:border-foreground"
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
      <span className="h-1.5 w-1.5 animate-pulse bg-foreground" />
      <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50">
        Checking outside support&hellip;
      </span>
    </div>
  );
  if (error) return (
    <div className="px-4 py-3">
      <p className="text-base text-brand-muted">{error}</p>
      <VerifyBtn label="Retry" onClick={onVerify} />
    </div>
  );
  if (!run) return (
    <div className="px-4 py-3">
      <p className="text-base text-muted-foreground/50">No verdicts yet.</p>
      <VerifyBtn label="Verify claims" onClick={onVerify} />
    </div>
  );
  const all = [...run.llmResolved, ...run.webVerified];
  return (
    <div className="space-y-1.5 px-4 py-3">
      <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest tabular-nums">
        <span className="text-green">{all.filter((v) => v.verdict === "supported").length} supported</span>
        <span className="text-muted-foreground/40">&middot;</span>
        <span className="text-brand">{all.filter((v) => v.verdict === "refuted").length} refuted</span>
        <span className="text-muted-foreground/40">&middot;</span>
        <span className="text-text-secondary">{run.unverified.length} unverified</span>
      </div>
      {all.map((v) => (
        <div key={v.claimId} className="border-l-2 pl-2" style={{ borderColor: VCOL[v.verdict] ?? "#666" }}>
          <p className="text-base text-foreground">
            <span style={{ color: VCOL[v.verdict] }}>{VICON[v.verdict]}</span>{" "}{v.claim}
          </p>
          <p className="text-sm text-text-secondary">{v.explanation}</p>
        </div>
      ))}
      {run.unverified.map((u) => (
        <div key={u.claimId} className="border-l-2 border-input pl-2">
          <p className="text-base text-muted-foreground">? {u.claim}</p>
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
        <div className="border border-border bg-background p-3">
          <Lbl>Overall assessment</Lbl>
          <p className="mt-1 text-base leading-relaxed text-foreground">
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
                  <span style={{ color }} className="text-sm">
                    {PICON[p.type] ?? "\u2022"}
                  </span>
                  <span className="text-sm font-semibold uppercase tracking-widest" style={{ color }}>
                    {p.type}
                  </span>
                </div>
                <p className="mt-0.5 text-base leading-snug text-foreground">{p.description}</p>
              </div>
            );
          })
        : <p className="text-base text-muted-foreground/50">No patterns detected yet.</p>}
    </div>
  );
}

export { TopicSegmentsContent, QueryContent } from "./TruthPanelExtras";
