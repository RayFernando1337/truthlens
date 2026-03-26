import type {
  AnalysisProvenance,
  AnalysisMode,
  AnalysisRequest,
  AnalysisSnapshot,
  SegmentPulse,
  SessionSummary,
  SummaryRequest,
  TranscriptSegment,
} from "@/lib/types";

type AnalysisBody = Omit<
  AnalysisSnapshot,
  "mode" | "windowStart" | "windowEnd" | "segmentIds" | "provenance" | "timestamp"
>;

type SummaryBody = Omit<
  SessionSummary,
  "segmentsCovered" | "lastSegmentId" | "timestamp"
>;

function formatSegments(segments: TranscriptSegment[]): string {
  return segments
    .map(
      (segment) =>
        `[${segment.index}:${segment.segmentId}] ${segment.text}${
          segment.startMs !== undefined || segment.endMs !== undefined
            ? ` (${segment.startMs ?? "?"}-${segment.endMs ?? "?"}ms)`
            : ""
        }`
    )
    .join("\n");
}

function formatPriorPulses(priorPulses?: SegmentPulse[]): string {
  if (!priorPulses || priorPulses.length === 0) return "None provided.";

  return priorPulses
    .map((pulse) => {
      const flags =
        pulse.flags.length > 0
          ? pulse.flags.map((flag) => `${flag.type}: ${flag.label}`).join("; ")
          : "none";

      return [
        `- ${pulse.segmentId}`,
        `  claims: ${pulse.claims.join(" | ") || "none"}`,
        `  flags: ${flags}`,
        `  tone: ${pulse.tone}`,
        `  confidence: ${pulse.confidence}`,
      ].join("\n");
    })
    .join("\n");
}

function formatRunningSummary(summary?: SessionSummary): string {
  if (!summary) return "No running summary yet.";

  return [
    summary.text,
    `Developing threads: ${summary.developingThreads.join(" | ") || "none"}`,
    `Segments covered: ${summary.segmentsCovered}`,
    `Last segment: ${summary.lastSegmentId}`,
  ].join("\n");
}

export function buildAnalysisPrompt(request: AnalysisRequest): string {
  return [
    `Analysis mode: ${request.mode}`,
    "Mode semantics:",
    "- streaming = sliding-window analysis of the provided recent segments only; use runningSummary as off-window context when present.",
    "- full = whole-session pass for this moment; treat the provided segments as the full raw transcript span for the pass, with runningSummary as optional summary-backed context for earlier material.",
    "- batch = one-pass analysis of the submitted pasted text or extracted article; do not invent rolling-window semantics.",
    "",
    "Running summary:",
    formatRunningSummary(request.runningSummary),
    "",
    "Transcript segments:",
    formatSegments(request.segments),
    "",
    "Prior L1 pulses:",
    formatPriorPulses(request.priorPulses),
    "",
    "Return a complete structured analysis for the provided segments only.",
    "Every evidenceTable row must include the exact supporting quote from the provided text.",
    request.mode === "batch"
      ? "The trustTrajectory array should contain a single overall trust score for the document (one value)."
      : `The trustTrajectory array must contain exactly ${request.segments.length} values.`,
  ].join("\n");
}

function getAnalysisHorizon(mode: AnalysisMode): AnalysisProvenance["horizon"] {
  switch (mode) {
    case "streaming":
      return "sliding-window";
    case "full":
      return "full-transcript";
    case "batch":
      return "batch-document";
  }
}

function getWindowStart(
  mode: AnalysisMode,
  segments: TranscriptSegment[]
): number | undefined {
  if (mode === "batch" || segments.length === 0) return undefined;
  return segments[0]?.startMs;
}

function getWindowEnd(
  mode: AnalysisMode,
  segments: TranscriptSegment[]
): number | undefined {
  if (mode === "batch" || segments.length === 0) return undefined;
  return segments[segments.length - 1]?.endMs;
}

function buildAnalysisProvenance(request: AnalysisRequest): AnalysisProvenance {
  return {
    horizon: getAnalysisHorizon(request.mode),
    usesRunningSummary: request.runningSummary !== undefined,
    summarySegmentsCovered: request.runningSummary?.segmentsCovered ?? 0,
    analyzedSegmentCount: request.segments.length,
  };
}

function resampleTrajectory(src: number[], targetLen: number): number[] {
  if (src.length === targetLen) return src;
  if (src.length === 0) {
    throw new Error(
      `Analysis contract violation: expected trustTrajectory length ${targetLen}, received 0`
    );
  }
  // Single value can be replicated to fill any target length (common in batch mode)
  if (src.length === 1) return Array.from({ length: targetLen }, () => src[0]);
  const out: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    const pos = (i / (targetLen - 1)) * (src.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.min(lo + 1, src.length - 1);
    const frac = pos - lo;
    out.push(src[lo] * (1 - frac) + src[hi] * frac);
  }
  return out;
}

export function finalizeAnalysisSnapshot(
  body: AnalysisBody,
  request: AnalysisRequest
): AnalysisSnapshot {
  const expected = request.segments.length;
  let trajectory = body.trustTrajectory;
  if (trajectory.length !== expected) {
    console.warn(
      `[analysis] trustTrajectory length ${trajectory.length} → resampled to ${expected}`
    );
    trajectory = resampleTrajectory(trajectory, expected);
  }

  return {
    ...body,
    trustTrajectory: trajectory,
    mode: request.mode,
    windowStart: getWindowStart(request.mode, request.segments),
    windowEnd: getWindowEnd(request.mode, request.segments),
    segmentIds: request.segments.map((segment) => segment.segmentId),
    provenance: buildAnalysisProvenance(request),
    timestamp: Date.now(),
  };
}

export function buildSummaryPrompt(request: SummaryRequest): string {
  return [
    "Current summary:",
    request.currentSummary?.text ?? "No prior summary yet.",
    "",
    "Existing developing threads:",
    request.currentSummary?.developingThreads.join(" | ") || "none",
    "",
    "New transcript segments:",
    formatSegments(request.segments),
  ].join("\n");
}

export function finalizeSessionSummary(
  body: SummaryBody,
  request: SummaryRequest
): SessionSummary {
  const lastSegment = request.segments[request.segments.length - 1];
  const previousCount = request.currentSummary?.segmentsCovered ?? 0;

  return {
    ...body,
    segmentsCovered: previousCount + request.segments.length,
    lastSegmentId: lastSegment.segmentId,
    timestamp: Date.now(),
  };
}
