import type {
  AnalysisResult,
  AnalysisSnapshot,
  PatternsResult,
} from "@/lib/types";

export function toAnalysisResult(snapshot: AnalysisSnapshot): AnalysisResult {
  return {
    tldr: snapshot.tldr,
    corePoints: snapshot.corePoints,
    underlyingStatement: snapshot.speakerIntent,
    evidenceTable: snapshot.evidenceTable,
    appeals: snapshot.appeals,
    assumptions: snapshot.assumptions,
    steelman: snapshot.steelman,
    missing: snapshot.missing,
  };
}

export function toPatternsResult(snapshot: AnalysisSnapshot): PatternsResult {
  return {
    patterns: snapshot.patterns,
    trustTrajectory: snapshot.trustTrajectory,
    overallAssessment: snapshot.overallAssessment,
    fullAnalysis: toAnalysisResult(snapshot),
  };
}
