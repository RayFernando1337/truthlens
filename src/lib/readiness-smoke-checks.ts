import assert from "node:assert/strict";
import { installReadinessSmokeMocks } from "@/lib/readiness-smoke-mocks";

installReadinessSmokeMocks();

const analyzeRoute = await import("@/app/api/analyze/route");
const summarizeRoute = await import("@/app/api/analyze/summarize/route");
const preCheckRoute = await import("@/app/api/verify/pre-check/route");
const verifyRoute = await import("@/app/api/verify/route");

async function postJson(
  handler: (req: Request) => Promise<Response>,
  path: string,
  payload: unknown
) {
  const response = await handler(
    new Request(`http://truthlens.local${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
  );

  return {
    status: response.status,
    body: await response.json(),
  };
}

async function checkStreamingAnalyze() {
  const response = await postJson(analyzeRoute.POST, "/api/analyze", {
    mode: "streaming",
    segments: [
      { segmentId: "seg-1", text: "First streamed segment", index: 0, startMs: 0, endMs: 4000 },
      {
        segmentId: "seg-2",
        text: "Second streamed segment",
        index: 1,
        startMs: 4000,
        endMs: 8000,
      },
    ],
    runningSummary: {
      text: "Earlier context.",
      segmentsCovered: 6,
      lastSegmentId: "seg-0",
      developingThreads: ["Earlier thread"],
      timestamp: 1,
    },
    priorPulses: [],
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.provenance.horizon, "sliding-window");
  assert.equal(response.body.provenance.usesRunningSummary, true);
  assert.equal(response.body.provenance.summarySegmentsCovered, 6);
  assert.equal(response.body.provenance.analyzedSegmentCount, 2);
  assert.equal(response.body.windowStart, 0);
  assert.equal(response.body.windowEnd, 8000);
  assert.equal(response.body.trustTrajectory.length, 2);
  assert.ok(response.body.evidenceTable.every((row: { quote: string }) => row.quote.length > 0));
}

async function checkFullAnalyze() {
  const response = await postJson(analyzeRoute.POST, "/api/analyze", {
    mode: "full",
    segments: [
      { segmentId: "seg-10", text: "Full transcript chunk one", index: 10, startMs: 0, endMs: 5000 },
      {
        segmentId: "seg-11",
        text: "Full transcript chunk two",
        index: 11,
        startMs: 5000,
        endMs: 10000,
      },
    ],
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.provenance.horizon, "full-transcript");
  assert.equal(response.body.provenance.usesRunningSummary, false);
  assert.equal(response.body.windowStart, 0);
  assert.equal(response.body.windowEnd, 10000);
}

async function checkBatchAnalyze() {
  const response = await postJson(analyzeRoute.POST, "/api/analyze", {
    mode: "batch",
    segments: [{ segmentId: "batch-1", text: "Batch document segment", index: 0 }],
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.provenance.horizon, "batch-document");
  assert.equal(response.body.windowStart, undefined);
  assert.equal(response.body.windowEnd, undefined);
}

async function checkInvalidTrajectory() {
  const response = await postJson(analyzeRoute.POST, "/api/analyze", {
    mode: "streaming",
    segments: [
      {
        segmentId: "seg-bad",
        text: "FORCE_BAD_TRAJECTORY",
        index: 0,
        startMs: 0,
        endMs: 4000,
      },
    ],
  });

  assert.equal(response.status, 502);
  assert.match(response.body.error, /trustTrajectory length/i);
}

async function runAnalyzeChecks() {
  await checkStreamingAnalyze();
  await checkFullAnalyze();
  await checkBatchAnalyze();
  await checkInvalidTrajectory();
}

async function runSummaryChecks() {
  const initial = await postJson(summarizeRoute.POST, "/api/analyze/summarize", {
    segments: [
      { segmentId: "sum-1", text: "First summary segment", index: 0 },
      { segmentId: "sum-2", text: "Second summary segment", index: 1 },
    ],
  });

  assert.equal(initial.status, 200);
  assert.equal(initial.body.segmentsCovered, 2);
  assert.equal(initial.body.lastSegmentId, "sum-2");
  assert.ok(Array.isArray(initial.body.developingThreads));

  const continued = await postJson(summarizeRoute.POST, "/api/analyze/summarize", {
    currentSummary: initial.body,
    segments: [{ segmentId: "sum-3", text: "Third summary segment", index: 2 }],
  });

  assert.equal(continued.status, 200);
  assert.equal(continued.body.segmentsCovered, 3);
  assert.equal(continued.body.lastSegmentId, "sum-3");
}

async function runPreCheckChecks() {
  const response = await postJson(preCheckRoute.POST, "/api/verify/pre-check", {
    claims: [
      {
        claimId: "claim-a",
        text: "supported claim",
        segmentIds: ["seg-1"],
        priority: 4,
        dedupeKey: "supported claim",
        verifiable: true,
      },
      {
        claimId: "claim-b",
        text: "needs web claim",
        segmentIds: ["seg-2"],
        priority: 5,
        dedupeKey: "needs web claim",
        verifiable: true,
      },
    ],
  });

  assert.equal(response.status, 200);
  const claimIds = response.body.results.map((result: { claimId: string }) => result.claimId);
  assert.deepEqual(new Set(claimIds), new Set(["claim-a", "claim-b"]));
}

function buildVerifyPayload() {
  return {
    sessionId: "session-verify",
    maxWebSearches: 2,
    claims: [
      {
        claimId: "claim-web",
        text: "needs web urgent claim",
        segmentIds: ["seg-1"],
        priority: 0,
        dedupeKey: "needs web urgent claim",
        verifiable: true,
      },
      {
        claimId: "claim-llm",
        text: "supported claim",
        segmentIds: ["seg-2"],
        priority: 0,
        dedupeKey: "supported claim",
        verifiable: true,
      },
      {
        claimId: "claim-opinion",
        text: "opinion claim",
        segmentIds: ["seg-3"],
        priority: 0,
        dedupeKey: "opinion claim",
        verifiable: true,
      },
      {
        claimId: "claim-capped",
        text: "needs web lower priority claim",
        segmentIds: ["seg-4"],
        priority: 0,
        dedupeKey: "needs web lower priority claim",
        verifiable: true,
      },
    ],
  };
}

async function runVerifyChecks() {
  const response = await postJson(
    verifyRoute.POST,
    "/api/verify",
    buildVerifyPayload()
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "cap-exceeded");
  assert.equal(response.body.stats.capped, 1);
  assert.equal(response.body.webVerified[0]?.claimId, "claim-web");
  assert.equal(response.body.llmResolved[0]?.claimId, "claim-llm");

  const unverifiedById = new Map(
    response.body.unverified.map(
      (item: { claimId: string; reason: string }) => [item.claimId, item.reason]
    )
  );
  assert.equal(unverifiedById.get("claim-opinion"), "not-verifiable");
  assert.equal(unverifiedById.get("claim-capped"), "cap-exceeded");
}

async function main() {
  await runAnalyzeChecks();
  await runSummaryChecks();
  await runPreCheckChecks();
  await runVerifyChecks();

  console.log("Phase 2C readiness smoke checks passed.");
}

await main();
