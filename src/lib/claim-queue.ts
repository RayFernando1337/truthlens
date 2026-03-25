import type { AnalysisSnapshot, ClaimCandidate } from "@/lib/types";

const MAX_DEFAULT_WEB_CLAIMS = 10;

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function createDedupeKey(text: string): string {
  return normalizeText(text).replace(/[^a-z0-9\s]/g, "");
}

function createClaimCandidate(
  text: string,
  segmentIds: string[]
): ClaimCandidate {
  return {
    claimId: crypto.randomUUID(),
    text: text.trim(),
    segmentIds,
    priority: 0,
    dedupeKey: createDedupeKey(text),
    verifiable: true,
  };
}

export function buildClaimCandidates(
  claims: Array<{ text: string; segmentIds: string[] }>
): ClaimCandidate[] {
  return claims
    .filter((claim) => claim.text.trim().length > 0)
    .map((claim) => createClaimCandidate(claim.text, claim.segmentIds));
}

export function extractClaimCandidatesFromSnapshot(
  snapshot: AnalysisSnapshot
): ClaimCandidate[] {
  return buildClaimCandidates(
    snapshot.evidenceTable.map((row) => ({
      text: row.claim,
      segmentIds: snapshot.segmentIds,
    }))
  );
}

export function prepareClaimQueue(
  claims: ClaimCandidate[],
  maxClaims = MAX_DEFAULT_WEB_CLAIMS
): {
  queued: ClaimCandidate[];
  notVerifiable: ClaimCandidate[];
  cappedClaims: ClaimCandidate[];
  capped: number;
} {
  const deduped = new Map<string, ClaimCandidate>();

  for (const claim of claims) {
    const existing = deduped.get(claim.dedupeKey);
    if (!existing || claim.priority > existing.priority) {
      deduped.set(claim.dedupeKey, claim);
    }
  }

  const sorted = [...deduped.values()].sort((a, b) => b.priority - a.priority);
  const verifiable = sorted.filter((claim) => claim.verifiable);
  const queued = verifiable.slice(0, maxClaims);
  const cappedClaims = verifiable.slice(maxClaims);
  const notVerifiable = sorted.filter((claim) => !claim.verifiable);
  const capped = cappedClaims.length;

  return { queued, notVerifiable, cappedClaims, capped };
}
