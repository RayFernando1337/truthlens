import { model } from "@/lib/nemotron";
import { CLAIM_TRIAGE_PROMPT, LLM_PRE_VERIFY_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";
import {
  claimTriageBatchSchema,
  llmPreVerdictBatchSchema,
} from "@/lib/schemas";
import type {
  ClaimCandidate,
  ClaimTriageResult,
  ClaimVerdict,
  LLMPreVerdict,
  VerificationRun,
} from "@/lib/types";

function buildClaimTriagePrompt(claims: ClaimCandidate[]): string {
  return claims
    .map((claim) => `${claim.claimId}: ${claim.text}`)
    .join("\n");
}

function buildPreVerifyPrompt(claims: ClaimCandidate[]): string {
  return claims
    .map((claim, index) => `${index + 1}. ${claim.text}`)
    .join("\n");
}

function mergeTriageResult(
  claim: ClaimCandidate,
  triage: ClaimTriageResult | undefined
): ClaimCandidate {
  if (!triage) return claim;

  return {
    ...claim,
    verifiable: triage.verifiable,
    priority: triage.priority,
    triageReason: triage.reason,
    triageConfidence: triage.confidence,
  };
}

function toClaimVerdict(result: LLMPreVerdict): ClaimVerdict {
  const verdict =
    result.verdict === "supported" || result.verdict === "refuted"
      ? result.verdict
      : "unverifiable";

  return {
    claim: result.claim,
    verdict,
    confidence: result.confidence,
    explanation: result.explanation,
    source: result.needsWebSearch ? "unverified" : "llm-knowledge",
  };
}

export async function runPreVerification(
  claims: ClaimCandidate[]
): Promise<LLMPreVerdict[]> {
  const { results } = await generateTypedObject({
    model,
    schema: llmPreVerdictBatchSchema,
    system: LLM_PRE_VERIFY_PROMPT,
    prompt: `Claims to assess:\n${buildPreVerifyPrompt(claims)}`,
  });

  return results;
}

export async function runClaimTriage(
  claims: ClaimCandidate[]
): Promise<ClaimCandidate[]> {
  if (claims.length === 0) return [];

  const { results } = await generateTypedObject({
    model,
    schema: claimTriageBatchSchema,
    system: CLAIM_TRIAGE_PROMPT,
    prompt: `Claims to triage:\n${buildClaimTriagePrompt(claims)}`,
  });
  const triageById = new Map(results.map((result) => [result.claimId, result]));

  return claims.map((claim) => mergeTriageResult(claim, triageById.get(claim.claimId)));
}

export function buildVerificationRun(params: {
  sessionId: string;
  llmResults: LLMPreVerdict[];
  webVerified: ClaimVerdict[];
  skippedClaims: ClaimCandidate[];
  capped: number;
}): VerificationRun {
  const llmResolved = params.llmResults
    .filter((result) => !result.needsWebSearch)
    .map(toClaimVerdict);
  const unresolved = params.llmResults
    .filter((result) => result.needsWebSearch)
    .map((result) => result.claim);
  const status = params.webVerified.length > 0
    ? "web-verified"
    : llmResolved.length > 0
      ? "model-assessed"
      : params.skippedClaims.length > 0
        ? "skipped"
        : "queued";

  return {
    sessionId: params.sessionId,
    status,
    llmResolved,
    webVerified: params.webVerified,
    unverified: [...unresolved, ...params.skippedClaims.map((claim) => claim.text)],
    stats: {
      totalClaims: params.llmResults.length + params.skippedClaims.length,
      llmChecked: params.llmResults.length,
      webSearched: params.webVerified.length,
      capped: params.capped,
    },
    timestamp: Date.now(),
  };
}
