import { mock } from "bun:test";

function parseClaimPrompt(prompt: string, pattern: RegExp) {
  return prompt
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.match(pattern))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => ({ claimId: match[1], claim: match[2] }));
}

function buildMockAnalysis(prompt: string) {
  const countMatch = prompt.match(/exactly (\d+) values/);
  const segmentCount = Number(countMatch?.[1] ?? 1);
  const badTrajectory = prompt.includes("FORCE_BAD_TRAJECTORY");
  const trustTrajectory = Array.from(
    { length: badTrajectory ? Math.max(segmentCount - 1, 0) : segmentCount },
    (_, index) => Math.max(0.2, 0.8 - index * 0.1)
  );

  return {
    tldr: "The speaker makes a concrete claim and leaves part of the support unstated.",
    corePoints: ["A factual claim is presented as meaningful evidence."],
    speakerIntent: "I want you to feel confident in this framing so you'll accept the conclusion.",
    evidenceTable: [
      {
        claim: "Mocked factual claim",
        evidence: "assertion only",
        quote: '"Mocked factual claim"',
      },
    ],
    appeals: {
      ethos: "The speaker leans on authority.",
      pathos: "The framing adds urgency.",
      logos: "The reasoning is only partially shown.",
    },
    emotionalAppeals: [],
    namedFallacies: [],
    cognitiveBiases: [],
    assumptions: ["The listener will accept the framing without extra support."],
    steelman: "The claim could hold if the omitted evidence exists and is representative.",
    missing: ["Primary source evidence for the key factual claim."],
    patterns: [],
    trustTrajectory,
    overallAssessment: "Useful signal, but the support is incomplete.",
    flagRevisions: [],
  };
}

function buildMockSummary() {
  return {
    text: "A compact summary of the session so far.",
    developingThreads: ["The speaker is building toward a broader conclusion."],
  };
}

function buildMockTriage(prompt: string) {
  const claims = parseClaimPrompt(prompt, /^([^:]+):\s+(.+)$/);
  const results = claims.map(({ claimId, claim }) => {
    if (claim.includes("opinion")) {
      return {
        claimId,
        verifiable: false,
        priority: 0,
        confidence: 0.95,
        reason: "This is framing rather than an objectively checkable claim.",
      };
    }

    if (claim.includes("urgent")) {
      return {
        claimId,
        verifiable: true,
        priority: 5,
        confidence: 0.91,
        reason: "High-priority factual claim with clear factual stakes.",
      };
    }

    if (claim.includes("lower priority")) {
      return {
        claimId,
        verifiable: true,
        priority: 1,
        confidence: 0.84,
        reason: "Checkable, but less central than the higher-priority claims.",
      };
    }

    return {
      claimId,
      verifiable: true,
      priority: 4,
      confidence: 0.89,
      reason: "Concrete claim that can be checked directly.",
    };
  });

  return { results: results.reverse() };
}

function buildMockPreCheck(prompt: string) {
  const claims = parseClaimPrompt(prompt, /^\[([^\]]+)\]\s+(.+)$/);
  const results = claims.map(({ claimId, claim }) => {
    if (claim.includes("needs web")) {
      return {
        claimId,
        claim,
        verifiable: true,
        confidence: 0.42,
        verdict: "uncertain" as const,
        explanation: "Training knowledge is not enough to settle this claim.",
        needsWebSearch: true,
      };
    }

    if (claim.includes("opinion")) {
      return {
        claimId,
        claim,
        verifiable: false,
        confidence: 0.97,
        verdict: "not-verifiable" as const,
        explanation: "This is not an objective factual proposition.",
        needsWebSearch: false,
      };
    }

    return {
      claimId,
      claim,
      verifiable: true,
      confidence: 0.88,
      verdict: "supported" as const,
      explanation: "Training knowledge is sufficient for a supported verdict.",
      needsWebSearch: false,
    };
  });

  return { results: results.reverse() };
}

export function installReadinessSmokeMocks() {
  mock.module("@/lib/generate-object", () => ({
    generateTypedObject: async ({
      system,
      prompt,
    }: {
      system: string;
      prompt: string;
    }) => {
      if (system.includes("rhetorical analyst")) {
        return buildMockAnalysis(prompt);
      }

      if (system.includes("maintaining a progressive summary")) {
        return buildMockSummary();
      }

      if (system.includes("classify extracted statements")) {
        return buildMockTriage(prompt);
      }

      if (system.includes("fact-checker using only your training knowledge")) {
        return buildMockPreCheck(prompt);
      }

      throw new Error(`Unhandled smoke-check mock for system prompt: ${system}`);
    },
  }));

  mock.module("@/lib/exa", () => ({
    verifyClaim: async (candidate: { claimId: string; text: string }) => ({
      claimId: candidate.claimId,
      claim: candidate.text,
      verdict: "supported" as const,
      confidence: 0.82,
      explanation: "Mocked web evidence supports this claim.",
      source: "exa-web" as const,
      citations: [
        {
          title: "Mock Source",
          url: "https://example.com/mock-source",
          snippet: "Mock evidence snippet.",
        },
      ],
    }),
  }));
}
