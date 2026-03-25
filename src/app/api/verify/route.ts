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
  llmResults: { needsWebSearch: boolean }[],
  queuedClaims: Parameters<typeof prepareClaimQueue>[0]
) {
  return queuedClaims.filter((_, index) => llmResults[index]?.needsWebSearch);
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
    const triagedClaims = await runClaimTriage(parsed.data.claims);
    const queue = prepareClaimQueue(
      triagedClaims,
      parsed.data.maxWebSearches
    );
    const llmResults = await runPreVerification(queue.queued);
    const pendingWebClaims = getClaimsNeedingWebVerification(
      llmResults,
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
