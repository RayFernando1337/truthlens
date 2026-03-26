import type { z } from "zod";
import { prepareClaimQueue } from "@/lib/claim-queue";
import { verifyClaim } from "@/lib/exa";
import { verificationRunSchema, verifyRequestSchema } from "@/lib/schemas";
import {
  buildVerificationRun,
  runClaimTriage,
  runPreVerification,
} from "@/lib/verification-core";

export const maxDuration = 60;

function getClaimsNeedingWebVerification(
  llmResults: { claimId: string; needsWebSearch: boolean }[],
  queuedClaims: Parameters<typeof prepareClaimQueue>[0]
) {
  const claimIdsNeedingWeb = new Set(
    llmResults
      .filter((result) => result.needsWebSearch)
      .map((result) => result.claimId)
  );
  return queuedClaims.filter((claim) => claimIdsNeedingWeb.has(claim.claimId));
}

async function runVerificationPipeline(data: z.infer<typeof verifyRequestSchema>) {
  const triagedClaims = await runClaimTriage(data.claims);
  const queue = prepareClaimQueue(triagedClaims, data.maxWebSearches);
  const llmResults = await runPreVerification(queue.queued);
  const pendingWebClaims = getClaimsNeedingWebVerification(llmResults, queue.queued);
  const webVerified = await Promise.all(
    pendingWebClaims.map(async (claim) => {
      try {
        return await verifyClaim(claim);
      } catch (e) {
        console.warn(`[/api/verify] Exa failed for claim ${claim.claimId}:`, e instanceof Error ? e.message : e);
        return {
          claimId: claim.claimId,
          claim: claim.text,
          verdict: "unverifiable" as const,
          confidence: 0,
          explanation: "Web verification temporarily unavailable.",
          source: "exa-web" as const,
        };
      }
    })
  );
  return buildVerificationRun({
    sessionId: data.sessionId,
    llmResults,
    webVerified,
    notVerifiableClaims: queue.notVerifiable,
    cappedClaims: queue.cappedClaims,
  });
}

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = verifyRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }
  try {
    const run = await runVerificationPipeline(parsed.data);
    return Response.json(verificationRunSchema.parse(run));
  } catch (e) {
    console.error(
      "[/api/verify]",
      { sessionId: parsed.data.sessionId, claimsCount: parsed.data.claims.length },
      e
    );
    const message = e instanceof Error ? e.message : "Verification failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
