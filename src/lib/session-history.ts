import type {
  AnalysisSnapshot, SessionHistoryEntry, TopicSegment,
  TranscriptSegment, TruthSession, VerificationRun, SessionTitleSource, PulseEntry,
} from "@/lib/types";

const STORAGE_KEY = "truthlens-sessions";
const HISTORY_UPDATED_EVENT = "truthlens-history-updated";
const MAX_SESSIONS = 20;

function emitHistoryUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
  }
}

function writeSessions(sessions: SessionHistoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  emitHistoryUpdated();
}

function normalizeSession(entry: SessionHistoryEntry): SessionHistoryEntry {
  return {
    ...entry,
    titleSource: entry.titleSource ?? "default",
    voiceTranscript: Array.isArray(entry.voiceTranscript) ? entry.voiceTranscript : [],
    pulseEntries: Array.isArray(entry.pulseEntries) ? entry.pulseEntries : [],
  };
}

function shouldPreserveTitle(entry: SessionHistoryEntry | undefined): boolean {
  return entry?.titleSource === "manual" || entry?.titleSource === "generated";
}

export function buildHistoryEntry(
  session: TruthSession,
  segments: TranscriptSegment[],
  voiceTranscript: string[],
  pulseEntries: PulseEntry[],
  snapshot: AnalysisSnapshot | null,
  verificationRun: VerificationRun | null,
  topicSegments: TopicSegment[] | null,
): SessionHistoryEntry {
  const title = session.sourceAsset?.title
    || (session.inputKind === "voice" ? "Voice session" : "Analysis");
  return {
    sessionId: session.sessionId, title, titleSource: "default", inputKind: session.inputKind,
    mode: session.mode, createdAt: session.createdAt,
    sourceAsset: session.sourceAsset,
    segments: segments.slice(),
    voiceTranscript: voiceTranscript.slice(),
    pulseEntries: pulseEntries.slice(),
    snapshot, verificationRun, topicSegments,
  };
}

export function saveSession(entry: SessionHistoryEntry): void {
  try {
    const sessions = loadSessions();
    const idx = sessions.findIndex((s) => s.sessionId === entry.sessionId);
    if (idx >= 0) {
      const existing = sessions[idx];
      sessions[idx] = shouldPreserveTitle(existing)
        ? { ...entry, title: existing.title, titleSource: existing.titleSource }
        : entry;
    } else {
      sessions.unshift(entry);
    }
    writeSessions(sessions.slice(0, MAX_SESSIONS));
  } catch {
    /* quota exceeded or unavailable */
  }
}

export function loadSessions(): SessionHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((entry) => normalizeSession(entry)) : [];
  } catch {
    return [];
  }
}

export function deleteSession(sessionId: string): void {
  try {
    const sessions = loadSessions().filter((s) => s.sessionId !== sessionId);
    writeSessions(sessions);
  } catch { /* ignore */ }
}

export function renameSession(
  sessionId: string,
  title: string,
  titleSource: SessionTitleSource,
): void {
  try {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const sessions = loadSessions().map((session) =>
      session.sessionId === sessionId
        ? { ...session, title: nextTitle, titleSource }
        : session
    );
    writeSessions(sessions);
  } catch { /* ignore */ }
}

export function subscribeSessionHistory(onUpdate: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onUpdate();
  window.addEventListener(HISTORY_UPDATED_EVENT, handler);
  return () => window.removeEventListener(HISTORY_UPDATED_EVENT, handler);
}
