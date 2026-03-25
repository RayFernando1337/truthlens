import { z } from "zod";

// ─── Shared Enums ─────────────────────────────────────

export const pulseFlagTypeEnum = z.enum([
  "vague",
  "stat",
  "prediction",
  "attribution",
  "logic",
  "contradiction",
  "emotional-appeal",
  "cognitive-bias",
  "building",
]);

// ─── L1 Pulse ─────────────────────────────────────────

export const pulseSchema = z.object({
  claims: z.array(z.string()).describe("Factual claims made in the segment"),
  flags: z.array(
    z.object({
      type: pulseFlagTypeEnum,
      label: z.string().describe("Short description of the issue"),
    })
  ),
  tone: z.string().describe("Overall tone of the segment"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Trust score for this segment (0.0 = highly suspect, 1.0 = well-supported)"),
});

// ─── Rhetorical Core (shared by all analysis responses)

export const rhetoricalCoreSchema = z.object({
  tldr: z.string().describe("1-2 sentence summary of the core argument"),
  corePoints: z.array(z.string()).describe("Key arguments stripped of rhetoric"),
  speakerIntent: z.string().describe(
    "Unstated persuasive goal: 'I want you to feel X so you'll do Y'"
  ),
  evidenceTable: z.array(
    z.object({
      claim: z.string(),
      evidence: z.string().describe("Supporting evidence, or 'assertion only' / 'unnamed source'"),
      quote: z.string().optional().describe("Exact words from the source text"),
    })
  ),
  appeals: z.object({
    ethos: z.string().describe("How they establish credibility"),
    pathos: z.string().describe("Emotional language and framing"),
    logos: z.string().describe("The actual logical chain"),
  }),
  emotionalAppeals: z.array(
    z.object({
      type: z.string().describe("Named emotion: fear, guilt, outrage, flattery, urgency"),
      quote: z.string().describe("Triggering quote from the text"),
      technique: z.string().describe("How the emotion serves the argument"),
    })
  ).describe("Specific emotional techniques deployed"),
  namedFallacies: z.array(
    z.object({
      name: z.string().describe("Specific fallacy: straw man, false dichotomy, ad hominem"),
      quote: z.string().describe("Triggering quote from the text"),
      impact: z.string().describe("How it weakens the argument"),
    })
  ).describe("Logical fallacies detected (only genuine ones)"),
  cognitiveBiases: z.array(
    z.object({
      name: z.string().describe("Named bias: anchoring, false consensus, availability heuristic"),
      quote: z.string().describe("Triggering quote from the text"),
      influence: z.string().describe("How the bias shapes the argument"),
    })
  ).describe("Cognitive biases the argument relies on or exploits"),
  assumptions: z.array(z.string()).describe("Premises taken for granted but not proven"),
  steelman: z.string().describe(
    "Strongest, most defensible version of the argument (mandatory)"
  ),
  missing: z.array(z.string()).describe("Evidence needed to fully evaluate the claims"),
});

// ─── Analysis Snapshot (full LLM analysis output) ─────

export const analysisSnapshotSchema = rhetoricalCoreSchema.extend({
  patterns: z.array(
    z.object({
      type: z.enum(["escalation", "contradiction", "narrative-arc", "cherry-picking"]),
      description: z.string(),
    })
  ).describe("Cross-argument rhetorical patterns"),
  trustTrajectory: z
    .array(z.number().min(0).max(1))
    .describe("Trust level at each analyzed segment (0.0-1.0)"),
  overallAssessment: z.string().describe("Concise reliability summary"),
  flagRevisions: z.array(
    z.object({
      segmentId: z.string(),
      originalType: pulseFlagTypeEnum,
      revisedType: pulseFlagTypeEnum.optional(),
      action: z.enum(["upgrade", "downgrade", "dismiss", "reclassify"]),
      reason: z.string(),
    })
  ).describe("Earlier L1 flags revised given fuller context"),
});

// ─── Verification ─────────────────────────────────────

export const llmPreVerdictSchema = z.object({
  claim: z.string(),
  verifiable: z.boolean().describe("Whether this claim can be objectively fact-checked"),
  confidence: z.number().min(0).max(1),
  verdict: z.enum(["supported", "refuted", "uncertain", "not-verifiable"]),
  explanation: z.string().describe("One-sentence justification"),
  needsWebSearch: z.boolean().describe("True if web search would resolve uncertainty"),
});

export const claimVerdictSchema = z.object({
  claim: z.string(),
  verdict: z.enum(["supported", "refuted", "unverifiable", "partially-supported"]),
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  source: z.enum(["llm-knowledge", "exa-web", "unverified"]),
  citations: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string(),
    })
  ).optional(),
});

// ─── Summary ──────────────────────────────────────────

export const sessionSummarySchema = z.object({
  text: z.string().describe("Compressed summary of content so far (~500 tokens max)"),
  developingThreads: z.array(z.string()).describe(
    "Arguments still being built, not yet complete"
  ),
});

// ─── Segment ──────────────────────────────────────────

export const transcriptSegmentSchema = z.object({
  segmentId: z.string(),
  text: z.string(),
  index: z.number(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
});

// ─── Deprecated (remove after Phase 2A migration) ─────

/** @deprecated Use analysisSnapshotSchema. */
export const analysisSchema = z.object({
  tldr: z.string().describe("1-2 sentence summary of the core claim"),
  corePoints: z.array(z.string()).describe("Key points being made"),
  underlyingStatement: z.string().describe("What they actually want you to believe"),
  evidenceTable: z.array(
    z.object({
      claim: z.string(),
      evidence: z.string().describe("Supporting evidence or lack thereof"),
    })
  ),
  appeals: z.object({
    ethos: z.string().describe("Appeal to authority/credibility"),
    pathos: z.string().describe("Appeal to emotion"),
    logos: z.string().describe("Appeal to logic/reason"),
  }),
  assumptions: z.array(z.string()).describe("Unstated assumptions being made"),
  steelman: z.string().describe("Strongest version of the argument"),
  missing: z.array(z.string()).describe("Evidence that would be needed to fully evaluate"),
});

/** @deprecated Use analysisSnapshotSchema. */
export const patternsSchema = z.object({
  patterns: z.array(
    z.object({
      type: z.enum(["escalation", "contradiction", "narrative-arc", "cherry-picking"]),
      description: z.string(),
    })
  ),
  trustTrajectory: z
    .array(z.number().min(0).max(1))
    .describe("Confidence values across the transcript segments"),
  overallAssessment: z.string().describe("Concise reliability summary"),
  fullAnalysis: z.object({
    tldr: z.string(),
    corePoints: z.array(z.string()),
    underlyingStatement: z.string(),
    evidenceTable: z.array(z.object({ claim: z.string(), evidence: z.string() })),
    appeals: z.object({ ethos: z.string(), pathos: z.string(), logos: z.string() }),
    assumptions: z.array(z.string()),
    steelman: z.string(),
    missing: z.array(z.string()),
  }).describe("Full rhetorical analysis using the complete transcript"),
});
