"use client";

import { useState } from "react";
import type { AnalysisSnapshot, VerificationRun } from "@/lib/types";

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest text-text-secondary">
      {children}
    </span>
  );
}

function AppealsToggle({ appeals }: { appeals: AnalysisSnapshot["appeals"] }) {
  const [open, setOpen] = useState<"ethos" | "pathos" | "logos" | null>(null);
  return (
    <div>
      <Lbl>Appeals</Lbl>
      <div className="mt-1 flex gap-1.5">
        {(["ethos", "pathos", "logos"] as const).map((k) => (
          <button
            key={k} type="button"
            onClick={() => setOpen((o) => (o === k ? null : k))}
            className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider transition-colors ${
              open === k
                ? "border-foreground bg-foreground text-bg"
                : "border-[#333] text-[#888] hover:border-text-secondary"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      {open && (
        <p className="mt-1.5 max-w-md text-[11px] leading-snug text-foreground">
          {appeals[open]}
        </p>
      )}
    </div>
  );
}

function GapsAndAssumptions({ snapshot }: { snapshot: AnalysisSnapshot }) {
  if (snapshot.missing.length === 0 && snapshot.assumptions.length === 0)
    return null;
  return (
    <div className="flex flex-wrap gap-3">
      {snapshot.missing.length > 0 && (
        <div className="flex-1 basis-[180px]">
          <Lbl>Gaps</Lbl>
          <div className="mt-1 flex flex-wrap gap-1">
            {snapshot.missing.map((m, i) => (
              <span
                key={i} title={m}
                className="truncate border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent"
              >
                {m.length > 50 ? m.slice(0, 50) + "\u2026" : m}
              </span>
            ))}
          </div>
        </div>
      )}
      {snapshot.assumptions.length > 0 && (
        <div className="flex-1 basis-[180px]">
          <Lbl>Assumptions</Lbl>
          <div className="mt-1 flex flex-wrap gap-1">
            {snapshot.assumptions.map((a, i) => (
              <span
                key={i} title={a}
                className="truncate border border-yellow/40 bg-yellow/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-yellow"
              >
                {a.length > 60 ? a.slice(0, 60) + "\u2026" : a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AnalysisContent({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="space-y-3 px-4 py-3">
      <p className="text-xs leading-relaxed text-foreground">{snapshot.tldr}</p>
      {snapshot.speakerIntent && (
        <p className="border-l-2 border-accent pl-2 text-[11px] italic leading-snug text-accent">
          &ldquo;{snapshot.speakerIntent}&rdquo;
        </p>
      )}
      <div>
        <Lbl>Core points</Lbl>
        <ul className="mt-1 space-y-0.5">
          {snapshot.corePoints.map((p, i) => (
            <li key={i} className="text-[11px] leading-snug text-foreground">
              <span className="mr-1.5 text-text-secondary">{i + 1}.</span>{p}
            </li>
          ))}
        </ul>
      </div>
      {snapshot.evidenceTable.length > 0 && (
        <div>
          <Lbl>Evidence</Lbl>
          {snapshot.evidenceTable.map((r, i) => (
            <div key={i} className="mt-1 border-l-2 border-[#333] pl-2">
              <p className="text-[11px] font-medium text-foreground">{r.claim}</p>
              <p className="text-[10px] text-text-secondary">{r.evidence}</p>
            </div>
          ))}
        </div>
      )}
      <GapsAndAssumptions snapshot={snapshot} />
      <AppealsToggle appeals={snapshot.appeals} />
      <div className="border border-green/30 bg-green/5 p-2.5">
        <Lbl>Steelman</Lbl>
        <p className="mt-1 text-[11px] leading-snug text-foreground">
          {snapshot.steelman}
        </p>
      </div>
    </div>
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
