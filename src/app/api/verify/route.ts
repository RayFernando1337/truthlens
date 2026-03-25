import { prepareClaimQueue } from "@/lib/claim-queue";
import { verifyClaim } from "@/lib/exa";
import { verificationRunSchema, verifyRequestSchema } from "@/lib/schemas";
import {
  buildVerificationRun,
  runPreVerification,
} from "@/lib/verification-core";

export const maxDuration = 60;

function getClaimsNeedingWebVerification(
  claimTexts: string[],
  queuedClaims: Parameters<typeof prepareClaimQueue>[0]
) {
  const unresolved = new Set(claimTexts);
  return queuedClaims.filter((claim) => unresolved.has(claim.text));
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
    const queue = prepareClaimQueue(
      parsed.data.claims,
      parsed.data.maxWebSearches
    );
    const llmResults = await runPreVerification(queue.queued);
    const pendingWebClaims = getClaimsNeedingWebVerification(
      llmResults
        .filter((result) => result.needsWebSearch)
        .map((result) => result.claim),
      queue.queued
    );
    const webVerified = await Promise.all(
      pendingWebClaims.map((claim) => verifyClaim(claim))
    );
    const verificationRun = buildVerificationRun({
      sessionId: parsed.data.sessionId,
      llmResults,
      webVerified,
      skippedClaims: queue.skipped,
      capped: queue.capped,
    });

    return Response.json(verificationRunSchema.parse(verificationRun));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Verification failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
