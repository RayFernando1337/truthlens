"use client";

import { useState, useCallback } from "react";
import type { SessionHistoryEntry } from "@/lib/types";
import { loadSessions, deleteSession } from "@/lib/session-history";

const KIND_LABEL: Record<string, string> = {
  voice: "MIC", paste: "TXT", url: "URL",
};

function formatAge(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Props {
  onRestore: (entry: SessionHistoryEntry) => void;
}

export default function SessionHistory({ onRestore }: Props) {
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(() => setSessions(loadSessions()), []);

  const handleOpen = useCallback(() => { refresh(); setOpen(true); }, [refresh]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSession(id);
    refresh();
  };

  if (!open) {
    return (
      <button type="button" onClick={handleOpen}
        className="text-[10px] uppercase tracking-wider text-[#555] transition-colors hover:text-foreground">
        History
      </button>
    );
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(false)}
        className="text-[10px] uppercase tracking-wider text-foreground">
        History &#x25B4;
      </button>
      <div className="absolute right-0 top-full z-30 mt-1 max-h-[280px] w-[260px] overflow-y-auto border border-[#333] bg-surface shadow-lg">
        {sessions.length === 0 ? (
          <p className="px-3 py-4 text-center text-[10px] text-[#444]">No saved sessions.</p>
        ) : sessions.map((s) => (
          <button key={s.sessionId} type="button"
            onClick={() => { onRestore(s); setOpen(false); }}
            className="group flex w-full items-center gap-2 border-b border-[#1a1a1a] px-3 py-2 text-left transition-colors hover:bg-[#1a1a1a]">
            <span className="w-7 text-[8px] font-semibold uppercase tracking-wider text-[#555]">
              {KIND_LABEL[s.inputKind] ?? "?"}
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-[#ccc]">{s.title}</span>
            <span className="text-[9px] tabular-nums text-[#444]">{formatAge(s.createdAt)}</span>
            <span role="button" tabIndex={-1} onClick={(e) => handleDelete(s.sessionId, e)}
              className="ml-1 text-[10px] text-[#333] transition-colors hover:text-accent group-hover:text-[#555]">
              &times;
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
