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
  ClaimVerdictResult,
  LLMPreVerdict,
  UnverifiedClaim,
  VerificationRun,
} from "@/lib/types";

function buildClaimTriagePrompt(claims: ClaimCandidate[]): string {
  return claims
    .map((claim) => `${claim.claimId}: ${claim.text}`)
    .join("\n");
}

function buildPreVerifyPrompt(claims: ClaimCandidate[]): string {
  return claims
    .map((claim) => `[${claim.claimId}] ${claim.text}`)
    .join("\n");
}

function buildFallbackPreVerdict(claim: ClaimCandidate): LLMPreVerdict {
  return {
    claimId: claim.claimId,
    claim: claim.text,
    verifiable: claim.verifiable,
    confidence: 0,
    verdict: claim.verifiable ? "uncertain" : "not-verifiable",
    explanation: "The model did not return a structured result for this claim.",
    needsWebSearch: claim.verifiable,
  };
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

function mapPreVerdictToFinal(
  preVerdict: LLMPreVerdict["verdict"]
): ClaimVerdictResult {
  switch (preVerdict) {
    case "supported":
      return "supported";
    case "refuted":
      return "refuted";
    case "uncertain":
    case "not-verifiable":
      return "unverifiable";
  }
}

function toClaimVerdict(result: LLMPreVerdict): ClaimVerdict {
  return {
    claimId: result.claimId,
    claim: result.claim,
    verdict: mapPreVerdictToFinal(result.verdict),
    confidence: result.confidence,
    explanation: result.explanation,
    source: result.needsWebSearch ? "unverified" : "llm-knowledge",
  };
}

function buildNeedsWebUnverified(
  llmResults: LLMPreVerdict[],
  webVerified: ClaimVerdict[]
): UnverifiedClaim[] {
  const webVerifiedIds = new Set(webVerified.map((verdict) => verdict.claimId));

  return llmResults
    .filter((result) => result.needsWebSearch && !webVerifiedIds.has(result.claimId))
    .map((result) => ({
      claimId: result.claimId,
      claim: result.claim,
      reason: "needs-web",
    }));
}

function toUnverifiedClaims(
  claims: ClaimCandidate[],
  reason: UnverifiedClaim["reason"]
): UnverifiedClaim[] {
  return claims.map((claim) => ({
    claimId: claim.claimId,
    claim: claim.text,
    reason,
  }));
}

function getVerificationStatus(params: {
  cappedClaims: ClaimCandidate[];
  webVerified: ClaimVerdict[];
  llmResolved: ClaimVerdict[];
  notVerifiableClaims: ClaimCandidate[];
  unresolvedNeedsWeb: UnverifiedClaim[];
}): VerificationRun["status"] {
  if (params.cappedClaims.length > 0) return "cap-exceeded";
  if (params.webVerified.length > 0) return "web-verified";
  if (params.llmResolved.length > 0) return "model-assessed";
  if (params.notVerifiableClaims.length > 0 || params.unresolvedNeedsWeb.length > 0) {
    return "skipped";
  }
  return "queued";
}

export async function runPreVerification(
  claims: ClaimCandidate[]
): Promise<LLMPreVerdict[]> {
  if (claims.length === 0) return [];

  const { results } = await generateTypedObject({
    model,
    schema: llmPreVerdictBatchSchema,
    system: LLM_PRE_VERIFY_PROMPT,
    prompt: `Claims to assess:\n${buildPreVerifyPrompt(claims)}`,
  });

  const resultsById = new Map(results.map((result) => [result.claimId, result]));
  return claims.map((claim) => resultsById.get(claim.claimId) ?? buildFallbackPreVerdict(claim));
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
  notVerifiableClaims: ClaimCandidate[];
  cappedClaims: ClaimCandidate[];
}): VerificationRun {
  const llmResolved = params.llmResults
    .filter((result) => !result.needsWebSearch)
    .map(toClaimVerdict);
  const unresolvedNeedsWeb = buildNeedsWebUnverified(
    params.llmResults,
    params.webVerified
  );
  const skippedNotVerifiable = toUnverifiedClaims(
    params.notVerifiableClaims,
    "not-verifiable"
  );
  const cappedClaims = toUnverifiedClaims(params.cappedClaims, "cap-exceeded");
  const status = getVerificationStatus({
    cappedClaims: params.cappedClaims,
    webVerified: params.webVerified,
    llmResolved,
    notVerifiableClaims: params.notVerifiableClaims,
    unresolvedNeedsWeb,
  });

  return {
    sessionId: params.sessionId,
    status,
    llmResolved,
    webVerified: params.webVerified,
    unverified: [...unresolvedNeedsWeb, ...skippedNotVerifiable, ...cappedClaims],
    stats: {
      totalClaims:
        params.llmResults.length +
        params.notVerifiableClaims.length +
        params.cappedClaims.length,
      llmChecked: params.llmResults.length,
      webSearched: params.webVerified.length,
      capped: params.cappedClaims.length,
    },
    timestamp: Date.now(),
  };
}
