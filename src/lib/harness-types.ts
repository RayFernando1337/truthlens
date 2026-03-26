export type DemoInputMode = "text" | "url" | "voice-prompt";

export interface DemoFixture {
  key: string;
  label: string;
  inputMode: DemoInputMode;
  content: string;
  description: string;
  expectedTraits: string[];
}

export type TraceStage =
  | "pulse"
  | "analysis"
  | "verification"
  | "summary"
  | "topics"
  | "extract";

export type TraceStatus = "start" | "success" | "error";

export interface PipelineEvent {
  sessionId: string;
  stage: TraceStage;
  status: TraceStatus;
  timestamp: number;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export interface SessionTrace {
  sessionId: string;
  inputKind: "voice" | "paste" | "url";
  fixtureKey?: string;
  events: PipelineEvent[];
  startedAt: number;
  stoppedAt?: number;
}
