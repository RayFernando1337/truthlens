import { model } from "@/lib/nemotron";
import { LLM_PRE_VERIFY_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";
import { llmPreVerdictBatchSchema } from "@/lib/schemas";
import type {
  ClaimCandidate,
  ClaimVerdict,
  LLMPreVerdict,
  VerificationRun,
} from "@/lib/types";

function buildPreVerifyPrompt(claims: ClaimCandidate[]): string {
  return claims
    .map((claim, index) => `${index + 1}. ${claim.text}`)
    .join("\n");
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
