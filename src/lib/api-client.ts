import type {
  AnalysisMode,
  AnalysisSnapshot,
  ClaimCandidate,
  PulseResult,
  SegmentPulse,
  SessionSummary,
  TranscriptSegment,
  VerificationRun,
} from "@/lib/types";

export async function fetchPulse(
  segment: TranscriptSegment,
  previousSegments: TranscriptSegment[]
): Promise<PulseResult | null> {
  try {
    const res = await fetch("/api/analyze/pulse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment, previousSegments }),
    });
    if (res.ok) return res.json();
  } catch {
    /* network error — continue processing */
  }
  return null;
}

export async function fetchAnalysis(
  mode: AnalysisMode,
  segments: TranscriptSegment[],
  priorPulses?: SegmentPulse[],
  runningSummary?: SessionSummary
): Promise<AnalysisSnapshot | null> {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, segments, priorPulses, runningSummary }),
    });
    if (res.ok) return res.json();
  } catch {
    /* network error */
  }
  return null;
}

export async function fetchSummary(
  currentSummary: SessionSummary | undefined,
  segments: TranscriptSegment[]
): Promise<SessionSummary | null> {
  try {
    const res = await fetch("/api/analyze/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentSummary, segments }),
    });
    if (res.ok) return res.json();
  } catch {
    /* network error */
  }
  return null;
}

export async function fetchVerification(
  sessionId: string,
  claims: ClaimCandidate[]
): Promise<VerificationRun | null> {
  if (claims.length === 0) return null;
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, claims }),
    });
    if (res.ok) return res.json();
  } catch {
    /* network error */
  }
  return null;
}

export async function fetchUrlExtract(url: string): Promise<string | null> {
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.text ?? null;
    }
  } catch {
    /* network error */
  }
  return null;
}
