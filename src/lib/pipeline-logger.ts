import type { InputKind, PipelineEvent, SessionTrace } from "@/lib/types";

const STORAGE_KEY = "truthlens-traces";
const MAX_TRACES = 30;

type TraceHandle = {
  downloadTrace: (sessionId: string) => void;
  downloadLatestTrace: () => void;
  listTraces: () => SessionTrace[];
};

function loadStoredTraces(): SessionTrace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredTraces(traces: SessionTrace[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(traces.slice(0, MAX_TRACES)));
  } catch {
    /* ignore quota issues during local capture */
  }
}

function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function printTraceSummary(trace: SessionTrace): void {
  console.groupCollapsed(
    `[truthlens trace] ${trace.sessionId} (${trace.inputKind}) ${trace.fixtureKey ?? "manual"}`,
  );
  console.table(
    trace.events.map((event) => ({
      stage: event.stage,
      status: event.status,
      durationMs: event.durationMs ?? null,
      error: event.error ?? "",
    })),
  );
  console.log(trace);
  console.groupEnd();
}

class PipelineLogger {
  private active = new Map<string, SessionTrace>();

  startSession(sessionId: string, inputKind: InputKind, fixtureKey?: string): void {
    this.active.set(sessionId, {
      sessionId,
      inputKind,
      fixtureKey,
      events: [],
      startedAt: Date.now(),
    });
    this.installGlobalHelpers();
  }

  record(event: PipelineEvent): void {
    const trace = this.active.get(event.sessionId);
    if (!trace) return;
    trace.events.push(event);
  }

  finishSession(sessionId: string): void {
    const trace = this.active.get(sessionId);
    if (!trace) return;
    trace.stoppedAt = Date.now();
    const traces = loadStoredTraces().filter((entry) => entry.sessionId !== sessionId);
    saveStoredTraces([trace, ...traces]);
    printTraceSummary(trace);
    this.active.delete(sessionId);
  }

  listTraces(): SessionTrace[] {
    return [...this.active.values(), ...loadStoredTraces()];
  }

  getTrace(sessionId: string): SessionTrace | undefined {
    return this.listTraces().find((trace) => trace.sessionId === sessionId);
  }

  downloadTrace(sessionId: string): void {
    const trace = this.getTrace(sessionId);
    if (!trace) return;
    downloadJson(`truthlens-trace-${sessionId}.json`, trace);
  }

  downloadLatestTrace(): void {
    const trace = this.listTraces()[0];
    if (!trace) return;
    this.downloadTrace(trace.sessionId);
  }

  private installGlobalHelpers(): void {
    if (typeof window === "undefined") return;
    const truthlens = window as Window & { truthlens?: TraceHandle };
    truthlens.truthlens = {
      downloadTrace: (sessionId) => this.downloadTrace(sessionId),
      downloadLatestTrace: () => this.downloadLatestTrace(),
      listTraces: () => this.listTraces(),
    };
  }
}

export const pipelineLogger = new PipelineLogger();

export function downloadTrace(sessionId: string): void {
  pipelineLogger.downloadTrace(sessionId);
}
