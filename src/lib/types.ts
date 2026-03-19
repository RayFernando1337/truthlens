export interface PulseFlag {
  type:
    | "vague"
    | "stat"
    | "prediction"
    | "attribution"
    | "logic"
    | "contradiction";
  label: string;
}

export interface PulseResult {
  claims: string[];
  flags: PulseFlag[];
  tone: string;
  confidence: number;
}

export interface PulseEntry {
  id: string;
  chunk: string;
  result: PulseResult;
}

export interface EvidenceRow {
  claim: string;
  evidence: string;
}

export interface Appeals {
  ethos: string;
  pathos: string;
  logos: string;
}

export interface TavilySource {
  query: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export interface AnalysisResult {
  tldr: string;
  corePoints: string[];
  underlyingStatement: string;
  evidenceTable: EvidenceRow[];
  appeals: Appeals;
  assumptions: string[];
  steelman: string;
  missing: string[];
  /** Tavily sources that were searched to verify claims (populated by L2 route). */
  sources?: TavilySource[];
}

export interface PatternEntry {
  type: "escalation" | "contradiction" | "narrative-arc" | "cherry-picking";
  description: string;
}

export interface PatternsResult {
  patterns: PatternEntry[];
  trustTrajectory: number[];
  overallAssessment: string;
  /** Full-transcript rhetorical breakdown (merged into L3 since it has the complete context). */
  fullAnalysis?: AnalysisResult;
}
