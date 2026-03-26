// ─── Session ──────────────────────────────────────────

export type SessionMode = "streaming" | "batch";
export type InputKind = "voice" | "paste" | "url";
export type TranscriptInputMode = "text" | "url" | "voice";
export type { DemoFixture, DemoInputMode, PipelineEvent, SessionTrace, TraceStage, TraceStatus } from "@/lib/harness-types";

export interface TruthSession {
  sessionId: string;
  mode: SessionMode;
  inputKind: InputKind;
  createdAt: number;
  stoppedAt?: number;
  sourceAsset?: SourceAsset;
}

export interface SourceAsset {
  url: string;
  title?: string;
  excerpt?: string;
}
// ─── Transcript ───────────────────────────────────────
export interface TranscriptSegment {
  segmentId: string;
  text: string;
  index: number;
  startMs?: number;
  endMs?: number;
}
// ─── L1 Pulse ─────────────────────────────────────────
export type PulseFlagType =
  | "vague"
  | "stat"
  | "prediction"
  | "attribution"
  | "logic"
  | "contradiction"
  | "emotional-appeal"
  | "cognitive-bias"
  | "building";

export interface PulseFlag {
  type: PulseFlagType;
  label: string;
}

export interface SegmentPulse {
  segmentId: string;
  claims: string[];
  flags: PulseFlag[];
  tone: string;
  confidence: number;
}

export interface PulseRequest {
  segment: TranscriptSegment;
  previousSegments?: TranscriptSegment[];
}

/** @deprecated Use SegmentPulse keyed by segmentId. Kept for migration. */
export interface PulseResult {
  claims: string[];
  flags: PulseFlag[];
  tone: string;
  confidence: number;
}

/** @deprecated Will be replaced by TranscriptSegment + SegmentPulse. */
export interface PulseEntry {
  id: string;
  chunk: string;
  result: PulseResult;
}

// ─── Enriched Analysis Fields ─────────────────────────

export interface EmotionalAppeal {
  type: string;
  quote: string;
  technique: string;
}

export interface NamedFallacy {
  name: string;
  quote: string;
  impact: string;
}

export interface CognitiveBias {
  name: string;
  quote: string;
  influence: string;
}

export interface EvidenceRow {
  claim: string;
  evidence: string;
  quote: string;
}

export interface Appeals {
  ethos: string;
  pathos: string;
  logos: string;
}

export interface PatternEntry {
  type: "escalation" | "contradiction" | "narrative-arc" | "cherry-picking";
  description: string;
}

export interface FlagRevision {
  segmentId: string;
  originalType: PulseFlagType;
  revisedType: PulseFlagType | null;
  action: "upgrade" | "downgrade" | "dismiss" | "reclassify";
  reason: string;
}

export type AnalysisProvenanceHorizon =
  | "sliding-window"
  | "full-transcript"
  | "batch-document";

export interface AnalysisProvenance {
  horizon: AnalysisProvenanceHorizon;
  usesRunningSummary: boolean;
  summarySegmentsCovered: number;
  analyzedSegmentCount: number;
}

// ─── Analysis Snapshot ────────────────────────────────

export type AnalysisMode = "streaming" | "full" | "batch";

export interface AnalysisSnapshot {
  tldr: string;
  corePoints: string[];
  speakerIntent: string;
  evidenceTable: EvidenceRow[];
  appeals: Appeals;
  emotionalAppeals: EmotionalAppeal[];
  namedFallacies: NamedFallacy[];
  cognitiveBiases: CognitiveBias[];
  assumptions: string[];
  steelman: string;
  missing: string[];
  patterns: PatternEntry[];
  trustTrajectory: number[];
  overallAssessment: string;
  flagRevisions: FlagRevision[];
  mode: AnalysisMode;
  windowStart?: number;
  windowEnd?: number;
  segmentIds: string[];
  provenance: AnalysisProvenance;
  timestamp: number;
}

export interface AnalysisRequest {
  mode: AnalysisMode;
  segments: TranscriptSegment[];
  runningSummary?: SessionSummary;
  priorPulses?: SegmentPulse[];
}

// ─── Summary ──────────────────────────────────────────

export interface SessionSummary {
  text: string;
  segmentsCovered: number;
  lastSegmentId: string;
  developingThreads: string[];
  timestamp: number;
}

export interface SummaryRequest {
  currentSummary?: SessionSummary;
  segments: TranscriptSegment[];
}

// ─── Verification ─────────────────────────────────────

export interface ClaimCandidate {
  claimId: string;
  text: string;
  segmentIds: string[];
  priority: number;
  dedupeKey: string;
  verifiable: boolean;
  triageReason?: string;
  triageConfidence?: number;
}

export interface PreVerifyRequest {
  claims: ClaimCandidate[];
}

export interface ClaimTriageResult {
  claimId: string;
  verifiable: boolean;
  priority: number;
  confidence: number;
  reason: string;
}

export type ClaimVerdictResult =
  | "supported"
  | "refuted"
  | "unverifiable"
  | "partially-supported";

export type ClaimVerdictSource = "llm-knowledge" | "exa-web" | "unverified";

export interface ClaimVerdict {
  claimId: string;
  claim: string;
  verdict: ClaimVerdictResult;
  confidence: number;
  explanation: string;
  source: ClaimVerdictSource;
  citations?: Array<{ title: string; url: string; snippet: string }>;
}

export interface LLMPreVerdict {
  claimId: string;
  claim: string;
  verifiable: boolean;
  confidence: number;
  verdict: "supported" | "refuted" | "uncertain" | "not-verifiable";
  explanation: string;
  needsWebSearch: boolean;
}

export interface UnverifiedClaim {
  claimId: string;
  claim: string;
  reason: "needs-web" | "not-verifiable" | "cap-exceeded";
}

export type VerificationStatus =
  | "queued"
  | "model-assessed"
  | "web-verified"
  | "skipped"
  | "cap-exceeded";

export interface VerificationRun {
  sessionId: string;
  status: VerificationStatus;
  llmResolved: ClaimVerdict[];
  webVerified: ClaimVerdict[];
  unverified: UnverifiedClaim[];
  stats: {
    totalClaims: number;
    llmChecked: number;
    webSearched: number;
    capped: number;
  };
  timestamp: number;
}

export interface ApiError {
  message: string;
  status?: number;
}

export type VerificationFetchResult =
  | { ok: true; data: VerificationRun }
  | { ok: false; error: ApiError };

export interface VerifyRequest {
  sessionId: string;
  claims: ClaimCandidate[];
  maxWebSearches?: number;
}

// ─── Pipeline ─────────────────────────────────────────

export type PipelineStageStatus = "idle" | "running" | "success" | "error";

// ─── Topic Segmentation ──────────────────────────────

export type TopicSegmentType =
  | "argument-development"
  | "evidence-presentation"
  | "emotional-appeal"
  | "topic-shift"
  | "qa-exchange"
  | "philosophical-tangent"
  | "anecdote"
  | "summary-recap";

export interface TopicSegment {
  startSegmentIndex: number;
  endSegmentIndex: number;
  startTime?: string;
  endTime?: string;
  topic: string;
  segmentType: TopicSegmentType;
  flagsDuringSegment: string[];
  claimCount: number;
  avgConfidence: number;
}

export interface TopicSegmentRequest {
  segments: TranscriptSegment[];
  flagData?: Array<{ segmentId: string; flags: string[] }>;
  summary?: SessionSummary;
}

// ─── Post-Analysis Queries ───────────────────────────

export type PostQueryType = "theme" | "deep-dive" | "cross-topic" | "freeform";

export interface QueryEvidence {
  segmentId: string;
  quote: string;
  relevance: string;
}

export interface PostAnalysisQuery {
  query: string;
  queryType: PostQueryType;
  segments: TranscriptSegment[];
  summary?: SessionSummary;
  topicSegments?: TopicSegment[];
}

export interface PostAnalysisQueryResult {
  answer: string;
  relevantSegmentIds: string[];
  evidence: QueryEvidence[];
}

// ─── Extract ──────────────────────────────────────────

export interface ExtractResult { title: string; text: string; excerpt: string; }

export type SessionTitleSource = "default" | "generated" | "manual";

export interface SessionTitleContext { tldr: string; corePoints: string[]; speakerIntent: string; overallAssessment: string; }

export interface SessionTitleRequest { inputKind: InputKind; sourceTitle?: string; context: SessionTitleContext; }

export interface SessionTitleResult { title: string; }

// ─── Session History ──────────────────────────────────

export interface SessionHistoryEntry {
  sessionId: string;
  title: string;
  titleSource: SessionTitleSource;
  inputKind: InputKind;
  mode: SessionMode;
  createdAt: number;
  sourceAsset?: SourceAsset;
  segments: TranscriptSegment[];
  voiceTranscript: string[];
  pulseEntries: PulseEntry[];
  snapshot: AnalysisSnapshot | null;
  verificationRun: VerificationRun | null;
  topicSegments: TopicSegment[] | null;
}

// ─── Share ────────────────────────────────────────────

export interface ShareFrameData {
  scores: number[]; latestFlag?: PulseFlag; sourceTitle?: string; tldr?: string;
  flagCount: number; claimCount: number; verifiedCount: number;
}
