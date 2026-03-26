import type {
  AnalysisSnapshot, SessionHistoryEntry, TopicSegment,
  TranscriptSegment, TruthSession, VerificationRun,
} from "@/lib/types";

const STORAGE_KEY = "truthlens-sessions";
const MAX_SESSIONS = 20;

export function buildHistoryEntry(
  session: TruthSession,
  segments: TranscriptSegment[],
  snapshot: AnalysisSnapshot | null,
  verificationRun: VerificationRun | null,
  topicSegments: TopicSegment[] | null,
): SessionHistoryEntry {
  const title = session.sourceAsset?.title
    || (session.inputKind === "voice" ? "Voice session" : "Analysis");
  return {
    sessionId: session.sessionId, title, inputKind: session.inputKind,
    mode: session.mode, createdAt: session.createdAt,
    sourceAsset: session.sourceAsset,
    segments: segments.slice(),
    snapshot, verificationRun, topicSegments,
  };
}

export function saveSession(entry: SessionHistoryEntry): void {
  try {
    const sessions = loadSessions();
    const idx = sessions.findIndex((s) => s.sessionId === entry.sessionId);
    if (idx >= 0) sessions[idx] = entry;
    else sessions.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    /* quota exceeded or unavailable */
  }
}

export function loadSessions(): SessionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function deleteSession(sessionId: string): void {
  try {
    const sessions = loadSessions().filter((s) => s.sessionId !== sessionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch { /* ignore */ }
}
