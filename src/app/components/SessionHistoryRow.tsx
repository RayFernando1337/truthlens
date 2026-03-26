"use client";

import type { SessionHistoryEntry } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  voice: "MIC",
  paste: "TXT",
  url: "URL",
};

function formatAge(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-sm font-semibold uppercase tracking-widest text-text-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-text-secondary"
    >
      {label}
    </button>
  );
}

function SessionTitleField({
  draftTitle,
  disabled,
  onCancel,
  onChange,
  onCommit,
}: {
  draftTitle: string;
  disabled: boolean;
  onCancel: () => void;
  onChange: (value: string) => void;
  onCommit: () => void;
}) {
  return (
    <input
      autoFocus
      value={draftTitle}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit();
        if (e.key === "Escape") onCancel();
      }}
      className="w-full border border-border bg-background px-2 py-1 text-base text-foreground focus:outline-none disabled:opacity-50"
    />
  );
}

function SessionTitleButton({
  disabled,
  session,
  onRestore,
}: {
  disabled: boolean;
  session: SessionHistoryEntry;
  onRestore: (session: SessionHistoryEntry) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onRestore(session)}
      disabled={disabled}
      className="block w-full truncate text-left text-base text-text-secondary transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-text-secondary"
    >
      {session.title}
    </button>
  );
}

function SessionRowActions({
  autoPending,
  canAutoTitle,
  disabled,
  isEditing,
  saveDisabled,
  onAuto,
  onDelete,
  onStartEditing,
  onCommitRename,
  onCancelEditing,
}: {
  autoPending: boolean;
  canAutoTitle: boolean;
  disabled: boolean;
  isEditing: boolean;
  saveDisabled: boolean;
  onAuto: () => void;
  onDelete: () => void;
  onStartEditing: () => void;
  onCommitRename: () => void;
  onCancelEditing: () => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-end gap-3">
      {isEditing ? (
        <>
          <ActionButton label="Save" disabled={saveDisabled} onClick={onCommitRename} />
          <ActionButton label="Cancel" onClick={onCancelEditing} />
        </>
      ) : (
        <>
          <ActionButton
            label={autoPending ? "Naming..." : "Auto"}
            disabled={disabled || !canAutoTitle || autoPending}
            onClick={onAuto}
          />
          <ActionButton label="Rename" disabled={disabled} onClick={onStartEditing} />
          <ActionButton label="Delete" disabled={disabled} onClick={onDelete} />
        </>
      )}
    </div>
  );
}

function SessionRowSummary({
  disabled,
  draftTitle,
  isEditing,
  onCancelEditing,
  onDraftTitleChange,
  onCommitRename,
  onRestore,
  session,
}: {
  disabled: boolean;
  draftTitle: string;
  isEditing: boolean;
  onCancelEditing: () => void;
  onDraftTitleChange: (value: string) => void;
  onCommitRename: () => void;
  onRestore: (session: SessionHistoryEntry) => void;
  session: SessionHistoryEntry;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-7 shrink-0 pt-1 text-sm font-semibold uppercase tracking-widest text-text-secondary">
        {KIND_LABEL[session.inputKind] ?? "?"}
      </span>
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <SessionTitleField
            draftTitle={draftTitle}
            disabled={disabled}
            onCancel={onCancelEditing}
            onChange={onDraftTitleChange}
            onCommit={onCommitRename}
          />
        ) : (
          <SessionTitleButton disabled={disabled} session={session} onRestore={onRestore} />
        )}
        <span className="mt-1 block text-sm tabular-nums text-muted-foreground/50">{formatAge(session.createdAt)}</span>
      </div>
    </div>
  );
}

interface SessionHistoryRowProps {
  session: SessionHistoryEntry;
  disabled: boolean;
  isEditing: boolean;
  draftTitle: string;
  autoPending: boolean;
  canAutoTitle: boolean;
  onAuto: (session: SessionHistoryEntry) => void;
  onDelete: (session: SessionHistoryEntry) => void;
  onDraftTitleChange: (value: string) => void;
  onStartEditing: (session: SessionHistoryEntry) => void;
  onCommitRename: () => void;
  onCancelEditing: () => void;
  onRestore: (session: SessionHistoryEntry) => void;
}

export default function SessionHistoryRow({
  session,
  disabled,
  isEditing,
  draftTitle,
  autoPending,
  canAutoTitle,
  onAuto,
  onDelete,
  onDraftTitleChange,
  onStartEditing,
  onCommitRename,
  onCancelEditing,
  onRestore,
}: SessionHistoryRowProps) {
  return (
    <div className="border-b border-border px-3 py-2">
      <SessionRowSummary
        disabled={disabled}
        draftTitle={draftTitle}
        isEditing={isEditing}
        onCancelEditing={onCancelEditing}
        onDraftTitleChange={onDraftTitleChange}
        onCommitRename={onCommitRename}
        onRestore={onRestore}
        session={session}
      />
      <SessionRowActions
        autoPending={autoPending}
        canAutoTitle={canAutoTitle}
        disabled={disabled}
        isEditing={isEditing}
        saveDisabled={disabled || !draftTitle.trim()}
        onAuto={() => onAuto(session)}
        onDelete={() => onDelete(session)}
        onStartEditing={() => onStartEditing(session)}
        onCommitRename={onCommitRename}
        onCancelEditing={onCancelEditing}
      />
    </div>
  );
}
