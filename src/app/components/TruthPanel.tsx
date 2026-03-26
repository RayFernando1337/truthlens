"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type {
  AnalysisSnapshot, PipelineStageStatus, PostAnalysisQueryResult,
  PostQueryType, PulseEntry, PulseFlag, TopicSegment, VerificationRun,
} from "@/lib/types";
import { severityFromPulse } from "@/lib/pulse-utils";
import type { ShareFrameData } from "@/lib/types";
import TrustChart from "./TrustChart";
import ShareButton from "./ShareCapture";
import {
  AnalysisContent, VerdictsContent, PatternsContent,
  TopicSegmentsContent, QueryContent,
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
type Disclosure = "analysis" | "verdicts" | "patterns" | "segments" | "query";

interface TruthPanelProps {
  pulseEntries: PulseEntry[];
  snapshot: AnalysisSnapshot | null;
  verificationRun: VerificationRun | null;
  verificationError: string | null;
  analysisError: string | null;
  topicSegments: TopicSegment[] | null;
  queryResult: PostAnalysisQueryResult | null;
  pipelineStatus: {
    analysis: PipelineStageStatus;
    verification: PipelineStageStatus;
    topics: PipelineStageStatus;
  };
  processingChunk: string | null;
  isStreaming: boolean;
  sourceTitle?: string;
  onSeekTranscriptChunk: (index: number) => void;
  onTriggerVerification: () => void;
  onTriggerTopicSegmentation: () => void;
  onRetryAnalysis: () => void;
  onSubmitQuery: (query: string, queryType: PostQueryType) => void;
}

function StatsBar(
  { claims, flags, verified }: { claims: number; flags: number; verified: number },
) {
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest tabular-nums">
      <span className="text-foreground">{claims} claims</span>
      <span className="text-muted-foreground/40">&middot;</span>
      <span style={{ color: flags > 0 ? "#ff4400" : "#666" }}>{flags} flagged</span>
      <span className="text-muted-foreground/40">&middot;</span>
      <span style={{ color: verified > 0 ? "#00cc66" : "#666" }}>
        {verified > 0 && <span className="mr-0.5 opacity-70">{"\u2713"}</span>}
        {verified} verified
      </span>
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
          className="flex w-full items-center gap-2.5 border-b border-border border-l-2 px-4 py-1.5 text-left transition-colors hover:bg-muted"
          style={{ borderLeftColor: FC[f.flag.type] }}
        >
          <span className="text-sm font-bold" style={{ color: FC[f.flag.type] }}>
            {FI[f.flag.type]}
          </span>
          <span className="w-16 shrink-0 text-sm font-semibold uppercase tracking-widest" style={{ color: FC[f.flag.type] }}>
            {FL[f.flag.type]}
          </span>
          <span className="min-w-0 truncate text-base text-foreground">{f.flag.label}</span>
        </button>
      ))}
    </>
  );
}

function LoadingHint({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-4">
      <span className="h-1.5 w-1.5 animate-pulse bg-foreground" />
      <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/50">{text}</span>
    </div>
  );
}

function DisclosureTabs(
  { active, onToggle, tabs }: {
    active: Disclosure | null;
    onToggle: (t: Disclosure) => void;
    tabs: readonly Disclosure[];
  },
) {
  return (
    <div className="sticky top-0 z-5 flex border-y border-border bg-background">
      {tabs.map((tab) => (
        <button
          key={tab} type="button" onClick={() => onToggle(tab)}
          className={cn(
            "flex-1 py-2.5 text-center text-sm font-semibold uppercase tracking-widest transition-colors",
            active === tab
              ? "bg-muted text-foreground"
              : "text-text-secondary hover:text-muted-foreground",
          )}
        >
          {active === tab ? "\u25BE" : "\u25B8"} {tab}
        </button>
      ))}
    </div>
  );
}

function AnalysisErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="px-4 py-3">
      <p className="text-base text-brand-muted">{error}</p>
      <button type="button" onClick={onRetry}
        className="mt-2 border border-input px-3 py-1 text-sm font-semibold uppercase tracking-widest text-foreground hover:border-foreground">
        Retry
      </button>
    </div>
  );
}

function DisclosureBody(
  { active, snapshot, verificationRun, verificationError, analysisError, topicSegments, queryResult,
    pipelineStatus, onTriggerVerification, onTriggerTopicSegmentation, onRetryAnalysis, onSubmitQuery,
  }: Pick<TruthPanelProps, "snapshot" | "verificationRun" | "verificationError" | "analysisError" |
    "topicSegments" | "queryResult" | "pipelineStatus" | "onTriggerVerification" |
    "onTriggerTopicSegmentation" | "onRetryAnalysis" | "onSubmitQuery"> & { active: Disclosure | null },
) {
  switch (active) {
    case "analysis":
      if (snapshot) return <AnalysisContent snapshot={snapshot} />;
      if (analysisError) return <AnalysisErrorState error={analysisError} onRetry={onRetryAnalysis} />;
      return <LoadingHint text={pipelineStatus.analysis === "running" ? "Analyzing\u2026" : "Appears after more content."} />;
    case "verdicts": return (
      <VerdictsContent run={verificationRun} error={verificationError}
        onVerify={onTriggerVerification} isLoading={pipelineStatus.verification === "running"} />
    );
    case "patterns": return snapshot
      ? <PatternsContent snapshot={snapshot} />
      : <p className="px-4 py-3 text-base text-muted-foreground/50">No patterns detected yet.</p>;
    case "segments": return <TopicSegmentsContent segments={topicSegments} onGenerate={onTriggerTopicSegmentation} isLoading={pipelineStatus.topics === "running"} />;
    case "query": return <QueryContent result={queryResult} onSubmit={onSubmitQuery} />;
    default: return null;
  }
}

function usePanelDerived(
  entries: PulseEntry[], snapshot: AnalysisSnapshot | null,
  verificationRun: VerificationRun | null, isStreaming: boolean,
) {
  const ema = useMemo(() => computeEMA(entries), [entries]);
  const traj = snapshot?.trustTrajectory;
  const hasTraj = !!traj && traj.length > 1;
  const batch = entries.length === 0 && !!snapshot;
  const flatFlags = useMemo<FlatFlag[]>(
    () => entries.flatMap((e, i) => e.result.flags.map((f) => ({ flag: f, idx: i }))).reverse(), [entries],
  );
  const claims = useMemo(
    () => batch ? (snapshot?.evidenceTable.length ?? 0) : entries.reduce((s, e) => s + e.result.claims.length, 0),
    [entries, snapshot, batch],
  );
  const verified = verificationRun ? verificationRun.llmResolved.length + verificationRun.webVerified.length : 0;
  const tabs = useMemo<readonly Disclosure[]>(
    () => isStreaming ? ["analysis", "verdicts", "patterns"] : ["analysis", "verdicts", "patterns", "segments", "query"],
    [isStreaming],
  );
  const scores = batch ? (traj ?? []) : (hasTraj ? traj! : ema);
  const overlay = batch ? undefined : (hasTraj ? ema : traj);
  const flagged = batch ? (snapshot?.namedFallacies.length ?? 0) + (snapshot?.patterns.length ?? 0) : flatFlags.length;
  return { batch, flatFlags, claims, verified, tabs, scores, overlay, flagged };
}

function EmptyState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  if (error) return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-base text-brand-muted">{error}</p>
      <button type="button" onClick={onRetry}
        className="border border-input px-3 py-1 text-sm font-semibold uppercase tracking-widest text-foreground hover:border-foreground">
        Retry analysis
      </button>
    </div>
  );
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <p className="text-base text-text-secondary">Real-time rhetorical analysis.</p>
      <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/40">Paste. Speak. See through the rhetoric.</p>
    </div>
  );
}

export default function TruthPanel({
  pulseEntries: entries, snapshot, verificationRun, verificationError, analysisError,
  topicSegments, queryResult, pipelineStatus, processingChunk, isStreaming,
  sourceTitle, onSeekTranscriptChunk, onTriggerVerification, onTriggerTopicSegmentation, onRetryAnalysis, onSubmitQuery,
}: TruthPanelProps) {
  const [os, setOs] = useState({ tab: null as Disclosure | null, autoTs: null as number | null });
  const d = usePanelDerived(entries, snapshot, verificationRun, isStreaming);
  const autoOpen = !!snapshot && !isStreaming && os.tab === null && os.autoTs !== snapshot.timestamp;
  const active: Disclosure | null = autoOpen ? "analysis" : os.tab;
  const toggle = (tab: Disclosure) => setOs({ tab: active === tab ? null : tab, autoTs: snapshot?.timestamp ?? null });
  const shareData: ShareFrameData | null = snapshot && d.scores.length > 0 ? {
    scores: d.scores, latestFlag: d.flatFlags[0]?.flag, sourceTitle,
    tldr: snapshot.tldr, flagCount: d.flagged, claimCount: d.claims, verifiedCount: d.verified,
  } : null;

  if (entries.length === 0 && !processingChunk && !snapshot) {
    return <EmptyState error={analysisError} onRetry={onRetryAnalysis} />;
  }
  return (
    <div className="flex h-full flex-col" data-testid="truth-panel">
      <div className="sticky top-0 z-10 border-b border-border bg-card">
        <TrustChart scores={d.scores} overlay={d.overlay} />
        <div className="flex items-center justify-between">
          <StatsBar claims={d.claims} flags={d.flagged} verified={d.verified} />
          {shareData && <div className="pr-4"><ShareButton data={shareData} /></div>}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {processingChunk && <LoadingHint text="Analyzing\u2026" />}
        {!d.batch && <FlagFeed flags={d.flatFlags} onSeek={onSeekTranscriptChunk} />}
        {!d.batch && d.flatFlags.length === 0 && entries.length > 0 && (
          <p className="px-4 py-3 text-base text-green/70">No flags so far. The argument looks straight.</p>
        )}
        <DisclosureTabs active={active} onToggle={toggle} tabs={d.tabs} />
        <DisclosureBody active={active} snapshot={snapshot} verificationRun={verificationRun}
          verificationError={verificationError} analysisError={analysisError}
          topicSegments={topicSegments} queryResult={queryResult}
          pipelineStatus={pipelineStatus} onTriggerVerification={onTriggerVerification}
          onTriggerTopicSegmentation={onTriggerTopicSegmentation} onRetryAnalysis={onRetryAnalysis}
          onSubmitQuery={onSubmitQuery} />
      </div>
    </div>
  );
}
