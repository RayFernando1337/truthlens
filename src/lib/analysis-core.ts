import type {
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
  "mode" | "windowStart" | "windowEnd" | "segmentIds" | "timestamp"
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
    `The trustTrajectory array must contain exactly ${request.segments.length} values.`,
  ].join("\n");
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

export function finalizeAnalysisSnapshot(
  body: AnalysisBody,
  request: AnalysisRequest
): AnalysisSnapshot {
  return {
    ...body,
    mode: request.mode,
    windowStart: getWindowStart(request.mode, request.segments),
    windowEnd: getWindowEnd(request.mode, request.segments),
    segmentIds: request.segments.map((segment) => segment.segmentId),
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
