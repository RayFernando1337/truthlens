"use client";

import { useState, useMemo } from "react";
import type {
  AnalysisSnapshot, PipelineStageStatus,
  PulseEntry, PulseFlag, VerificationRun,
} from "@/lib/types";
import { severityFromPulse } from "@/lib/pulse-utils";
import TrustChart from "./TrustChart";
import {
  AnalysisContent, VerdictsContent, PatternsContent,
} from "./TruthPanelSections";

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

type FlatFlag = { flag: PulseFlag; idx: number };
type Disclosure = "analysis" | "verdicts" | "patterns";

interface TruthPanelProps {
  pulseEntries: PulseEntry[];
  snapshot: AnalysisSnapshot | null;
  verificationRun: VerificationRun | null;
  verificationError: string | null;
  pipelineStatus: {
    analysis: PipelineStageStatus;
    verification: PipelineStageStatus;
  };
  processingChunk: string | null;
  isStreaming: boolean;
  onSeekTranscriptChunk: (index: number) => void;
  onTriggerVerification: () => void;
}

function StatsBar(
  { claims, flags, verified }: { claims: number; flags: number; verified: number },
) {
  return (
    <div className="flex items-center gap-3 border-t border-[#1a1a1a] px-4 py-1.5 font-mono text-[10px] tabular-nums">
      <span className="text-[#e5e5e5]">{claims} claims</span>
      <span className="text-[#333]">&middot;</span>
      <span style={{ color: flags > 0 ? "#ff4400" : "#666" }}>{flags} flagged</span>
      <span className="text-[#333]">&middot;</span>
      <span style={{ color: verified > 0 ? "#00cc66" : "#666" }}>{verified} verified</span>
    </div>
  );
}

function FlagFeed(
  { flags, onSeek }: { flags: FlatFlag[]; onSeek: (idx: number) => void },
) {
  return (
    <>
      {flags.map((f, i) => (
        <button
          key={i} type="button" onClick={() => onSeek(f.idx)}
          className="flex w-full items-center gap-2.5 border-b border-[#1a1a1a] px-4 py-1.5 text-left transition-colors hover:bg-[#1a1a1a]"
        >
          <span className="text-xs font-bold" style={{ color: FC[f.flag.type] }}>
            {FI[f.flag.type]}
          </span>
          <span className="w-16 shrink-0 text-[9px] font-semibold uppercase tracking-wider" style={{ color: FC[f.flag.type] }}>
            {FL[f.flag.type]}
          </span>
          <span className="min-w-0 truncate text-[11px] text-[#ccc]">{f.flag.label}</span>
        </button>
      ))}
    </>
  );
}

function LoadingHint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-4">
      <span className="h-1 w-1 animate-pulse bg-[#e5e5e5]" />
      <span className="text-[10px] uppercase tracking-widest text-[#444]">{text}</span>
    </div>
  );
}

function DisclosureTabs(
  { active, onToggle }: { active: Disclosure | null; onToggle: (t: Disclosure) => void },
) {
  return (
    <div className="flex border-t border-[#222]">
      {(["analysis", "verdicts", "patterns"] as const).map((tab) => (
        <button
          key={tab} type="button" onClick={() => onToggle(tab)}
          className={`flex-1 py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest transition-colors ${
            active === tab ? "bg-[#1a1a1a] text-[#e5e5e5]" : "text-[#555] hover:text-[#888]"
          }`}
        >
          {active === tab ? "\u25BE" : "\u25B8"} {tab}
        </button>
      ))}
    </div>
  );
}

export default function TruthPanel({
  pulseEntries: entries, snapshot, verificationRun, verificationError,
  pipelineStatus, processingChunk, isStreaming, onSeekTranscriptChunk, onTriggerVerification,
}: TruthPanelProps) {
  const [os, setOs] = useState({ tab: null as Disclosure | null, autoTs: null as number | null });
  const ema = useMemo(() => computeEMA(entries), [entries]);
  const flatFlags = useMemo<FlatFlag[]>(() => entries.flatMap((e, i) => e.result.flags.map((f) => ({ flag: f, idx: i }))).reverse(), [entries]);
  const claimCount = useMemo(() => entries.reduce((s, e) => s + e.result.claims.length, 0), [entries]);
  const verifiedCount = verificationRun ? verificationRun.llmResolved.length + verificationRun.webVerified.length : 0;
  const autoOpen = !!snapshot && !isStreaming && os.tab === null && os.autoTs !== snapshot.timestamp;
  const active: Disclosure | null = autoOpen ? "analysis" : os.tab;
  const toggle = (tab: Disclosure) => setOs({ tab: active === tab ? null : tab, autoTs: snapshot?.timestamp ?? null });
  if (entries.length === 0 && !processingChunk) return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm text-[#555]">Real-time rhetorical analysis.</p>
      <p className="text-[11px] text-[#333]">Paste. Speak. See through the rhetoric.</p>
    </div>
  );
  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[#222] bg-[#141414]">
        <TrustChart scores={ema} overlay={snapshot?.trustTrajectory} />
        <StatsBar claims={claimCount} flags={flatFlags.length} verified={verifiedCount} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {processingChunk && <LoadingHint text="Analyzing\u2026" />}
        <FlagFeed flags={flatFlags} onSeek={onSeekTranscriptChunk} />
        {flatFlags.length === 0 && entries.length > 0 && (
          <p className="px-4 py-3 text-[11px] text-[#00cc66]/70">No flags so far. The argument looks straight.</p>
        )}
        <DisclosureTabs active={active} onToggle={toggle} />
        {active === "analysis" && (snapshot
          ? <AnalysisContent snapshot={snapshot} />
          : <LoadingHint text={pipelineStatus.analysis === "running" ? "Analyzing\u2026" : "Appears after more content."} />
        )}
        {active === "verdicts" && (
          <VerdictsContent run={verificationRun} error={verificationError}
            onVerify={onTriggerVerification} isLoading={pipelineStatus.verification === "running"} />
        )}
        {active === "patterns" && (snapshot
          ? <PatternsContent snapshot={snapshot} />
          : <p className="px-4 py-3 text-[11px] text-[#444]">No patterns detected yet.</p>
        )}
      </div>
    </div>
  );
}
