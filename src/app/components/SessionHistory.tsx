"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchSessionTitle } from "@/lib/api-client";
import type { SessionHistoryEntry, SessionTitleRequest } from "@/lib/types";
import SessionHistoryRow from "./SessionHistoryRow";
import {
  loadSessions,
  deleteSession,
  renameSession,
  subscribeSessionHistory,
} from "@/lib/session-history";

function buildTitleRequest(entry: SessionHistoryEntry): SessionTitleRequest | null {
  if (!entry.snapshot) return null;
  return {
    inputKind: entry.inputKind,
    sourceTitle: entry.sourceAsset?.title,
    context: {
      tldr: entry.snapshot.tldr,
      corePoints: entry.snapshot.corePoints.slice(0, 6),
      speakerIntent: entry.snapshot.speakerIntent,
      overallAssessment: entry.snapshot.overallAssessment,
    },
  };
}

interface Props {
  onRestore: (entry: SessionHistoryEntry) => void;
  disabled?: boolean;
}

function useSessionHistoryState() {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [autoTitleId, setAutoTitleId] = useState<string | null>(null);
  const refresh = useCallback(() => setSessions(loadSessions()), []);
  useEffect(() => subscribeSessionHistory(refresh), [refresh]);
  const resetEditing = useCallback(() => {
    setEditingId(null);
    setDraftTitle("");
  }, []);
  return {
    sessions, open, editingId, draftTitle, autoTitleId,
    setAutoTitleId, setDraftTitle, setEditingId, setOpen, refresh, resetEditing,
  };
}

function useSessionHistoryHandlers(
  disabled: boolean,
  state: ReturnType<typeof useSessionHistoryState>,
) {
  const { editingId, draftTitle, refresh, resetEditing, setAutoTitleId, setDraftTitle, setEditingId, setOpen } = state;
  const handleOpen = useCallback(() => { refresh(); setOpen(true); }, [refresh, setOpen]);
  const handleClose = useCallback(() => {
    setOpen(false);
    resetEditing();
  }, [resetEditing, setOpen]);
  const handleDelete = useCallback((session: SessionHistoryEntry) => {
    if (disabled) return;
    if (!window.confirm(`Delete "${session.title}" from history?`)) return;
    deleteSession(session.sessionId);
    if (editingId === session.sessionId) resetEditing();
    refresh();
  }, [disabled, editingId, refresh, resetEditing]);
  const handleStartEditing = useCallback((session: SessionHistoryEntry) => {
    if (disabled) return;
    setEditingId(session.sessionId);
    setDraftTitle(session.title);
  }, [disabled, setDraftTitle, setEditingId]);
  const handleCommitRename = useCallback(() => {
    if (!editingId || disabled) return;
    renameSession(editingId, draftTitle, "manual");
    resetEditing();
    refresh();
  }, [disabled, draftTitle, editingId, refresh, resetEditing]);
  const handleAutoTitle = useCallback(async (session: SessionHistoryEntry) => {
    if (disabled) return;
    const request = buildTitleRequest(session);
    if (!request) return;
    setAutoTitleId(session.sessionId);
    const result = await fetchSessionTitle(request);
    setAutoTitleId(null);
    if (!result) return;
    renameSession(session.sessionId, result.title, "generated");
    if (editingId === session.sessionId) resetEditing();
    refresh();
  }, [disabled, editingId, refresh, resetEditing, setAutoTitleId]);
  return { handleAutoTitle, handleClose, handleCommitRename, handleDelete, handleOpen, handleStartEditing };
}

export default function SessionHistory({ onRestore, disabled = false }: Props) {
  const state = useSessionHistoryState();
  const { sessions, open, editingId, draftTitle, autoTitleId, setDraftTitle, resetEditing } = state;
  const { handleAutoTitle, handleClose, handleCommitRename, handleDelete, handleOpen, handleStartEditing } =
    useSessionHistoryHandlers(disabled, state);

  if (!open) {
    return (
      <button type="button" onClick={handleOpen} disabled={disabled}
        className="text-[10px] uppercase tracking-wider text-[#555] transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-[#555]">
        History
      </button>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={handleClose}
        className="text-[10px] uppercase tracking-wider text-foreground">
        History &#x25B4;
      </button>
      <div className="absolute right-0 top-full z-30 mt-1 max-h-[320px] w-[320px] overflow-y-auto border border-[#333] bg-surface shadow-lg">
        {sessions.length === 0
          ? <p className="px-3 py-4 text-center text-[10px] text-[#444]">No saved sessions.</p>
          : sessions.map((session) => (
            <SessionHistoryRow
              key={session.sessionId}
              session={session}
              disabled={disabled}
              isEditing={editingId === session.sessionId}
              draftTitle={editingId === session.sessionId ? draftTitle : session.title}
              autoPending={autoTitleId === session.sessionId}
              canAutoTitle={!!buildTitleRequest(session)}
              onAuto={handleAutoTitle}
              onDelete={handleDelete}
              onDraftTitleChange={setDraftTitle}
              onStartEditing={handleStartEditing}
              onCommitRename={handleCommitRename}
              onCancelEditing={resetEditing}
              onRestore={(entry) => {
                onRestore(entry);
                handleClose();
              }}
            />
          ))}
      </div>
    </div>
  );
}
