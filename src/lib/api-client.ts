import type {
  ApiError,
  AnalysisMode,
  AnalysisSnapshot,
  ClaimCandidate,
  PostAnalysisQueryResult,
  PostQueryType,
  PulseResult,
  SegmentPulse,
  SessionSummary,
  TopicSegment,
  TranscriptSegment,
  VerificationFetchResult,
  VerificationRun,
} from "@/lib/types";

async function readApiError(
  response: Response,
  fallbackMessage: string
): Promise<ApiError> {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = await response.json() as { error?: unknown };
      if (typeof body.error === "string" && body.error.trim().length > 0) {
        return { message: body.error, status: response.status };
      }
    } else {
      const body = await response.text();
      if (body.trim().length > 0) {
        return { message: body, status: response.status };
      }
    }
  } catch {
    /* fallback below if error payload is unreadable */
  }

  return { message: fallbackMessage, status: response.status };
}

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
) : Promise<VerificationFetchResult | null> {
  if (claims.length === 0) return null;
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, claims }),
    });

    if (res.ok) {
      const data = await res.json() as VerificationRun;
      return { ok: true, data };
    }

    return {
      ok: false,
      error: await readApiError(
        res,
        "Verification could not complete right now."
      ),
    };
  } catch {
    return {
      ok: false,
      error: {
        message: "Verification could not reach the server.",
      },
    };
  }
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

export async function fetchTopicSegments(
  segments: TranscriptSegment[],
  flagData?: Array<{ segmentId: string; flags: string[] }>,
  summary?: SessionSummary
): Promise<TopicSegment[] | null> {
  try {
    const res = await fetch("/api/analyze/segments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segments, flagData, summary }),
    });
    if (res.ok) return res.json();
  } catch {
    /* network error */
  }
  return null;
}

export async function fetchPostAnalysisQuery(
  query: string,
  queryType: PostQueryType,
  segments: TranscriptSegment[],
  summary?: SessionSummary,
  topicSegments?: TopicSegment[]
): Promise<PostAnalysisQueryResult | null> {
  try {
    const res = await fetch("/api/analyze/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, queryType, segments, summary, topicSegments }),
    });
    if (res.ok) return res.json();
  } catch {
    /* network error */
  }
  return null;
}
