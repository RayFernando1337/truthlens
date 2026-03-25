import { expect, test, type Page } from "@playwright/test";

function buildSnapshot(segmentIds: string[]) {
  const pointCount = Math.max(segmentIds.length, 2);
  return {
    tldr: "Mock analysis summary for smoke coverage.",
    corePoints: ["Mock point one", "Mock point two"],
    speakerIntent: "Show the analysis shell without depending on live model output.",
    evidenceTable: [
      { claim: "Mock claim one", evidence: "assertion only", quote: "Claim one" },
      { claim: "Mock claim two", evidence: "unnamed attribution", quote: "Claim two" },
    ],
    appeals: {
      ethos: "Mock ethos",
      pathos: "Mock pathos",
      logos: "Mock logos",
    },
    emotionalAppeals: [],
    namedFallacies: [],
    cognitiveBiases: [],
    assumptions: ["Mock assumption"],
    steelman: "Mock steelman.",
    missing: ["Mock source"],
    patterns: [{ type: "narrative-arc", description: "Mock pattern" }],
    trustTrajectory: Array.from({ length: pointCount }, (_, index) => 0.82 - index * 0.08),
    overallAssessment: "Mock assessment.",
    flagRevisions: [],
    mode: "batch",
    segmentIds,
    provenance: {
      horizon: "batch-document",
      usesRunningSummary: false,
      summarySegmentsCovered: 0,
      analyzedSegmentCount: pointCount,
    },
    timestamp: Date.now(),
  };
}

async function mockApis(page: Page) {
  await page.route("**/api/extract", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Mock YouTube Transcript",
        excerpt: "Mock excerpt",
        text: "Mock extracted transcript paragraph one.\n\nMock extracted transcript paragraph two.",
      }),
    });
  });

  await page.route("**/api/analyze", async (route) => {
    const body = route.request().postDataJSON() as { segments?: Array<{ segmentId: string }> };
    const segmentIds = body.segments?.map((segment) => segment.segmentId) ?? ["batch-0", "batch-1"];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildSnapshot(segmentIds)),
    });
  });

  await page.route("**/api/verify", async (route) => {
    const body = route.request().postDataJSON() as { sessionId: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sessionId: body.sessionId,
        status: "web-verified",
        llmResolved: [],
        webVerified: [
          {
            claimId: "claim-1",
            claim: "Mock claim one",
            verdict: "supported",
            confidence: 0.88,
            explanation: "Mock verification result.",
            source: "exa-web",
            citations: [{ title: "Mock source", url: "https://example.com", snippet: "Mock snippet" }],
          },
        ],
        unverified: [],
        stats: { totalClaims: 2, llmChecked: 1, webSearched: 1, capped: 0 },
        timestamp: Date.now(),
      }),
    });
  });

  await page.route("**/api/analyze/segments", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          startSegmentIndex: 0,
          endSegmentIndex: 1,
          topic: "Mock section",
          segmentType: "argument-development",
          flagsDuringSegment: ["stat"],
          claimCount: 2,
          avgConfidence: 0.74,
        },
      ]),
    });
  });
}

test.beforeEach(async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await mockApis(page);
  await page.goto("/");
  test.info().attach("page-errors", {
    body: JSON.stringify(pageErrors.map((error) => error.message)),
    contentType: "application/json",
  });
});

test("text demo populates and analyzes", async ({ page }) => {
  await page.getByTestId("demo-toggle").click();
  await page.getByTestId("demo-tech-pitch").click();
  await expect(page.getByTestId("transcript-input")).toContainText("Our new AI platform");
  await page.getByTestId("analyze-button").click();
  await expect(page.getByTestId("truth-panel")).toContainText("2 claims");
  await expect(page.getByTestId("truth-panel")).toContainText("1 verified");
});

test("url demo auto-fetches and renders results", async ({ page }) => {
  await page.getByTestId("demo-toggle").click();
  await page.getByTestId("demo-youtube-clip").click();
  await expect(page.getByTestId("fixture-card")).toContainText("YouTube URL");
  await expect(page.getByTestId("truth-panel")).toContainText("2 claims");
  await expect(page.getByTestId("truth-panel")).toContainText("1 verified");
});
