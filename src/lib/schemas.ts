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

export const analysisModeEnum = z.enum(["streaming", "full", "batch"]);

export const patternTypeEnum = z.enum([
  "escalation",
  "contradiction",
  "narrative-arc",
  "cherry-picking",
]);

export const flagRevisionActionEnum = z.enum([
  "upgrade",
  "downgrade",
  "dismiss",
  "reclassify",
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

export const transcriptSegmentSchema = z.object({
  segmentId: z.string(),
  text: z.string(),
  index: z.number(),
  startMs: z.number().optional(),
  endMs: z.number().optional(),
});

export const segmentPulseSchema = pulseSchema.extend({
  segmentId: z.string(),
});

export const pulseRequestSchema = z.object({
  segment: transcriptSegmentSchema,
  previousSegments: z.array(transcriptSegmentSchema).max(3).default([]),
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
      type: patternTypeEnum,
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
      action: flagRevisionActionEnum,
      reason: z.string(),
    })
  ).describe("Earlier L1 flags revised given fuller context"),
  mode: analysisModeEnum,
  windowStart: z.number().optional(),
  windowEnd: z.number().optional(),
  segmentIds: z.array(z.string()),
  timestamp: z.number(),
});

export const analysisModelSchema = analysisSnapshotSchema.omit({
  mode: true,
  windowStart: true,
  windowEnd: true,
  segmentIds: true,
  timestamp: true,
});

export const analysisRequestSchema = z.object({
  mode: analysisModeEnum,
  segments: z.array(transcriptSegmentSchema).min(1),
  runningSummary: z.lazy(() => sessionSummarySchema).optional(),
  priorPulses: z.array(segmentPulseSchema).optional(),
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

export const llmPreVerdictBatchSchema = z.object({
  results: z.array(llmPreVerdictSchema),
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

export const claimCandidateSchema = z.object({
  claimId: z.string(),
  text: z.string(),
  segmentIds: z.array(z.string()).min(1),
  priority: z.number().min(0),
  dedupeKey: z.string(),
  verifiable: z.boolean(),
});

// ─── Summary ──────────────────────────────────────────

export const sessionSummarySchema = z.object({
  text: z.string().describe("Compressed summary of content so far (~500 tokens max)"),
  segmentsCovered: z.number().int().min(0),
  lastSegmentId: z.string(),
  developingThreads: z.array(z.string()).describe(
    "Arguments still being built, not yet complete"
  ),
  timestamp: z.number(),
});

export const sessionSummaryUpdateSchema = sessionSummarySchema.omit({
  segmentsCovered: true,
  lastSegmentId: true,
  timestamp: true,
});

export const summaryRequestSchema = z.object({
  currentSummary: sessionSummarySchema.optional(),
  segments: z.array(transcriptSegmentSchema).min(1),
});

export const preVerifyRequestSchema = z.object({
  claims: z.array(claimCandidateSchema).min(1),
});

export const verifyRequestSchema = z.object({
  sessionId: z.string(),
  claims: z.array(claimCandidateSchema).min(1),
  maxWebSearches: z.number().int().min(0).max(25).optional(),
});

export const verificationRunSchema = z.object({
  sessionId: z.string(),
  status: z.enum([
    "queued",
    "model-assessed",
    "web-verified",
    "skipped",
    "cap-exceeded",
  ]),
  llmResolved: z.array(claimVerdictSchema),
  webVerified: z.array(claimVerdictSchema),
  unverified: z.array(z.string()),
  stats: z.object({
    totalClaims: z.number().int().min(0),
    llmChecked: z.number().int().min(0),
    webSearched: z.number().int().min(0),
    capped: z.number().int().min(0),
  }),
  timestamp: z.number(),
});
