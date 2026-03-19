import { z } from "zod";

export const pulseSchema = z.object({
  claims: z.array(z.string()).describe("Factual claims made in the segment"),
  flags: z.array(
    z.object({
      type: z.enum([
        "vague",
        "stat",
        "prediction",
        "attribution",
        "logic",
        "contradiction",
      ]),
      label: z.string().describe("Short description of the issue"),
    })
  ),
  tone: z.string().describe("Overall tone of the segment"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Trust score for this segment"),
});

export const analysisSchema = z.object({
  tldr: z.string().describe("1-2 sentence summary of the core claim"),
  corePoints: z.array(z.string()).describe("Key points being made"),
  underlyingStatement: z
    .string()
    .describe("What they actually want you to believe"),
  evidenceTable: z.array(
    z.object({
      claim: z.string(),
      evidence: z
        .string()
        .describe("Supporting evidence or lack thereof"),
    })
  ),
  appeals: z.object({
    ethos: z.string().describe("Appeal to authority/credibility"),
    pathos: z.string().describe("Appeal to emotion"),
    logos: z.string().describe("Appeal to logic/reason"),
  }),
  assumptions: z
    .array(z.string())
    .describe("Unstated assumptions being made"),
  steelman: z
    .string()
    .describe("Strongest version of the argument"),
  missing: z
    .array(z.string())
    .describe("Evidence that would be needed to fully evaluate"),
});

export const patternsSchema = z.object({
  patterns: z.array(
    z.object({
      type: z.enum([
        "escalation",
        "contradiction",
        "narrative-arc",
        "cherry-picking",
      ]),
      description: z.string(),
    })
  ),
  trustTrajectory: z
    .array(z.number().min(0).max(1))
    .describe("Confidence values across the transcript segments"),
  overallAssessment: z
    .string()
    .describe("Concise reliability summary"),
  fullAnalysis: z.object({
    tldr: z.string().describe("1-2 sentence summary of the core claim"),
    corePoints: z.array(z.string()).describe("Key arguments, stripped of rhetoric"),
    underlyingStatement: z.string().describe("What they actually want you to believe"),
    evidenceTable: z.array(
      z.object({
        claim: z.string(),
        evidence: z.string().describe("Supporting evidence or lack thereof"),
      })
    ),
    appeals: z.object({
      ethos: z.string().describe("How they establish credibility"),
      pathos: z.string().describe("Emotional language and framing"),
      logos: z.string().describe("The actual logical chain"),
    }),
    assumptions: z.array(z.string()).describe("Premises taken for granted but not proven"),
    steelman: z.string().describe("Strongest, most defensible version of the argument"),
    missing: z.array(z.string()).describe("Evidence or counterarguments that would strengthen or challenge the argument"),
  }).describe("Full rhetorical analysis using the complete transcript"),
});
