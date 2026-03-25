"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type {
  AnalysisSnapshot, PipelineStageStatus,
  PulseEntry, PulseFlag, VerificationRun,
} from "@/lib/types";
import { severityFromPulse } from "@/lib/pulse-utils";
import TrustChart from "./TrustChart";

const EMA_ALPHA = 0.3;
const SEV_W = { ok: 1, warn: 0.7, flag: 0.4 } as const;

function computeEMA(entries: PulseEntry[]): number[] {
  if (entries.length === 0) return [];
  const v = entries.map(
    (e) => e.result.confidence * SEV_W[severityFromPulse(e.result)],
  );
  const out = [v[0]];
  for (let i = 1; i < v.length; i++)
    out.push(EMA_ALPHA * v[i] + (1 - EMA_ALPHA) * out[i - 1]);
  return out;
}

const FC: Record<PulseFlag["type"], string> = {
  logic: "#ff4400", contradiction: "#ff4400", stat: "#ff4400",
  attribution: "#ff4400", "emotional-appeal": "#ff4400",
  vague: "#ffaa00", prediction: "#ffaa00",
  "cognitive-bias": "#ffaa00", building: "#666",
};

const FL: Record<PulseFlag["type"], string> = {
  vague: "VAGUE", stat: "STAT", prediction: "PRED",
  attribution: "ATTR", logic: "LOGIC", contradiction: "CONTRA",
  "emotional-appeal": "EMOTION", "cognitive-bias": "BIAS",
  building: "DEVELOPING",
};

const FI: Record<PulseFlag["type"], string> = {
  logic: "!", contradiction: "!", stat: "!", attribution: "!",
  "emotional-appeal": "!", vague: "~", prediction: "~",
  "cognitive-bias": "~", building: "\u00B7",
};

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-widest text-[#666]">
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
                ? "border-[#e5e5e5] bg-[#e5e5e5] text-[#0a0a0a]"
                : "border-[#333] text-[#888] hover:border-[#666]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      {open && (
        <p className="mt-1.5 max-w-md text-[11px] leading-snug text-[#e5e5e5]">
          {appeals[open]}
        </p>
      )}
    </div>
  );
}

function AnalysisContent({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="space-y-3 px-4 py-3">
      <p className="text-xs leading-relaxed text-[#e5e5e5]">{snapshot.tldr}</p>
      {snapshot.speakerIntent && (
        <p className="border-l-2 border-[#ff4400] pl-2 text-[11px] italic leading-snug text-[#ff4400]">
          &ldquo;{snapshot.speakerIntent}&rdquo;
        </p>
      )}
      <div>
        <Lbl>Core points</Lbl>
        <ul className="mt-1 space-y-0.5">
          {snapshot.corePoints.map((p, i) => (
            <li key={i} className="text-[11px] leading-snug text-[#e5e5e5]">
              <span className="mr-1.5 text-[#666]">{i + 1}.</span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      {snapshot.evidenceTable.length > 0 && (
        <div>
          <Lbl>Evidence</Lbl>
          {snapshot.evidenceTable.map((r, i) => (
            <div key={i} className="mt-1 border-l-2 border-[#333] pl-2">
              <p className="text-[11px] font-medium text-[#e5e5e5]">{r.claim}</p>
              <p className="text-[10px] text-[#666]">{r.evidence}</p>
            </div>
          ))}
        </div>
      )}
      <GapsAndAssumptions snapshot={snapshot} />
      <AppealsToggle appeals={snapshot.appeals} />
      <div className="border border-[#00cc66]/30 bg-[#00cc66]/5 p-2.5">
        <Lbl>Steelman</Lbl>
        <p className="mt-1 text-[11px] leading-snug text-[#e5e5e5]">
          {snapshot.steelman}
        </p>
      </div>
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
                className="truncate border border-[#ff4400]/40 bg-[#ff4400]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#ff4400]"
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
                className="truncate border border-[#ffaa00]/40 bg-[#ffaa00]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#ffaa00]"
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

const VCOL: Record<string, string> = {
  supported: "#00cc66", refuted: "#ff4400",
  unverifiable: "#666", "partially-supported": "#ffaa00",
};
const VICON: Record<string, string> = {
  supported: "\u2713", refuted: "\u2717",
  unverifiable: "?", "partially-supported": "~",
};

function VerdictsContent({ run, error, onVerify, isLoading }: {
  run: VerificationRun | null; error: string | null;
  onVerify: () => void; isLoading: boolean;
}) {
  if (isLoading) return (
    <div className="flex items-center gap-2 px-4 py-4">
      <span className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
      <span className="text-[10px] uppercase tracking-widest text-[#444]">
        Checking outside support\u2026
      </span>
    </div>
  );
  if (error) return (
    <div className="px-4 py-3">
      <p className="text-[11px] text-[#ffb199]">{error}</p>
      <button type="button" onClick={onVerify}
        className="mt-2 border border-[#333] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#e5e5e5] hover:border-[#e5e5e5]">
        Retry
      </button>
    </div>
  );
  if (!run) return (
    <div className="px-4 py-3">
      <p className="text-[11px] text-[#444]">No verdicts yet.</p>
      <button type="button" onClick={onVerify}
        className="mt-2 border border-[#333] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#e5e5e5] hover:border-[#e5e5e5]">
        Verify claims
      </button>
    </div>
  );
  const all = [...run.llmResolved, ...run.webVerified];
  return (
    <div className="space-y-1.5 px-4 py-3">
      <div className="flex items-center gap-3 text-[10px] tabular-nums">
        <span className="text-[#00cc66]">{all.filter((v) => v.verdict === "supported").length} supported</span>
        <span className="text-[#333]">&middot;</span>
        <span className="text-[#ff4400]">{all.filter((v) => v.verdict === "refuted").length} refuted</span>
        <span className="text-[#333]">&middot;</span>
        <span className="text-[#666]">{run.unverified.length} unverified</span>
      </div>
      {all.map((v) => (
        <div key={v.claimId} className="border-l-2 pl-2" style={{ borderColor: VCOL[v.verdict] ?? "#666" }}>
          <p className="text-[11px] text-[#e5e5e5]">
            <span style={{ color: VCOL[v.verdict] }}>{VICON[v.verdict]}</span>{" "}{v.claim}
          </p>
          <p className="text-[10px] text-[#666]">{v.explanation}</p>
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

function PatternsContent({ snapshot }: { snapshot: AnalysisSnapshot }) {
  return (
    <div className="space-y-3 px-4 py-3">
      {snapshot.overallAssessment && (
        <div className="border border-[#222] bg-[#0a0a0a] p-3">
          <Lbl>Overall assessment</Lbl>
          <p className="mt-1 text-xs leading-relaxed text-[#e5e5e5]">
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
                  <span style={{ color }} className="text-[10px]">{PICON[p.type] ?? "\u2022"}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color }}>{p.type}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-snug text-[#ccc]">{p.description}</p>
              </div>
            );
          })
        : <p className="text-[11px] text-[#444]">No patterns detected yet.</p>}
    </div>
  );
}

type Disclosure = "analysis" | "verdicts" | "patterns";

export default function TruthPanel({
  pulseEntries: entries, snapshot, verificationRun, verificationError,
  pipelineStatus, processingChunk, isStreaming,
  onSeekTranscriptChunk, onTriggerVerification,
}: {
  pulseEntries: PulseEntry[];
  snapshot: AnalysisSnapshot | null;
  verificationRun: VerificationRun | null;
  verificationError: string | null;
  pipelineStatus: { analysis: PipelineStageStatus; verification: PipelineStageStatus };
  processingChunk: string | null;
  isStreaming: boolean;
  onSeekTranscriptChunk: (index: number) => void;
  onTriggerVerification: () => void;
}) {
  const [open, setOpen] = useState<Disclosure | null>(null);
  const autoRef = useRef(false);

  const ema = useMemo(() => computeEMA(entries), [entries]);
  const flatFlags = useMemo(
    () => entries
      .flatMap((e, i) => e.result.flags.map((f) => ({ flag: f, idx: i })))
      .reverse(),
    [entries],
  );
  const claimCount = useMemo(
    () => entries.reduce((s, e) => s + e.result.claims.length, 0),
    [entries],
  );
  const verifiedCount = verificationRun
    ? verificationRun.llmResolved.length + verificationRun.webVerified.length
    : 0;

  useEffect(() => {
    if (!snapshot) { autoRef.current = false; return; }
    if (!isStreaming && !autoRef.current) {
      setOpen("analysis");
      autoRef.current = true;
    }
  }, [snapshot, isStreaming]);

  if (entries.length === 0 && !processingChunk) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-[#555]">Real-time rhetorical analysis.</p>
        <p className="text-[11px] text-[#333]">
          Paste. Speak. See through the rhetoric.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[#222] bg-[#141414]">
        <TrustChart scores={ema} overlay={snapshot?.trustTrajectory} />
        <div className="flex items-center gap-3 border-t border-[#1a1a1a] px-4 py-1.5 font-mono text-[10px] tabular-nums">
          <span className="text-[#e5e5e5]">{claimCount} claims</span>
          <span className="text-[#333]">&middot;</span>
          <span style={{ color: flatFlags.length > 0 ? "#ff4400" : "#666" }}>
            {flatFlags.length} flagged
          </span>
          <span className="text-[#333]">&middot;</span>
          <span style={{ color: verifiedCount > 0 ? "#00cc66" : "#666" }}>
            {verifiedCount} verified
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {processingChunk && (
          <div className="flex items-center gap-2 border-b border-[#1a1a1a] px-4 py-1.5">
            <span className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
            <span className="text-[10px] uppercase tracking-widest text-[#444]">
              Analyzing\u2026
            </span>
          </div>
        )}

        {flatFlags.map((f, i) => (
          <button
            key={i} type="button"
            onClick={() => onSeekTranscriptChunk(f.idx)}
            className="flex w-full items-center gap-2.5 border-b border-[#1a1a1a] px-4 py-1.5 text-left transition-colors hover:bg-[#1a1a1a]"
          >
            <span className="text-xs font-bold" style={{ color: FC[f.flag.type] }}>
              {FI[f.flag.type]}
            </span>
            <span
              className="w-16 shrink-0 text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: FC[f.flag.type] }}
            >
              {FL[f.flag.type]}
            </span>
            <span className="min-w-0 truncate text-[11px] text-[#ccc]">
              {f.flag.label}
            </span>
          </button>
        ))}

        {flatFlags.length === 0 && entries.length > 0 && (
          <p className="px-4 py-3 text-[11px] text-[#00cc66]/70">
            No flags so far. The argument looks straight.
          </p>
        )}

        <div className="flex border-t border-[#222]">
          {(["analysis", "verdicts", "patterns"] as const).map((tab) => (
            <button
              key={tab} type="button"
              onClick={() => setOpen((o) => (o === tab ? null : tab))}
              className={`flex-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                open === tab
                  ? "bg-[#1a1a1a] text-[#e5e5e5]"
                  : "text-[#555] hover:text-[#888]"
              }`}
            >
              {open === tab ? "\u25BE" : "\u25B8"} {tab}
            </button>
          ))}
        </div>

        {open === "analysis" && (
          snapshot
            ? <AnalysisContent snapshot={snapshot} />
            : <div className="flex items-center gap-2 px-4 py-4">
                <span className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
                <span className="text-[10px] uppercase tracking-widest text-[#444]">
                  {pipelineStatus.analysis === "running" ? "Analyzing\u2026" : "Appears after more content."}
                </span>
              </div>
        )}
        {open === "verdicts" && (
          <VerdictsContent
            run={verificationRun} error={verificationError}
            onVerify={onTriggerVerification}
            isLoading={pipelineStatus.verification === "running"}
          />
        )}
        {open === "patterns" && (
          snapshot
            ? <PatternsContent snapshot={snapshot} />
            : <p className="px-4 py-3 text-[11px] text-[#444]">No patterns detected yet.</p>
        )}
      </div>
    </div>
  );
}
