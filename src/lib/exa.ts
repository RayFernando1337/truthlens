import Exa from "exa-js";
import type { ClaimCandidate, ClaimVerdict } from "@/lib/types";

const exaVerdictSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: {
      type: "string",
      enum: ["supported", "refuted", "partially-supported", "unverifiable"],
    },
    explanation: {
      type: "string",
      description: "A concise explanation grounded in the search results.",
    },
  },
  required: ["verdict", "explanation"],
} as const;

let cachedClient: Exa | null = null;

function isStructuredAnswer(
  value: unknown
): value is Pick<ClaimVerdict, "verdict" | "explanation"> {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.verdict === "string" &&
    typeof candidate.explanation === "string"
  );
}

function getExaClient(): Exa {
  if (!process.env.EXA_API_KEY) {
    throw new Error("EXA_API_KEY is not configured");
  }

  cachedClient ??= new Exa(process.env.EXA_API_KEY);
  return cachedClient;
}

function confidenceFromCitations(citationCount: number): number {
  if (citationCount >= 3) return 0.86;
  if (citationCount === 2) return 0.78;
  if (citationCount === 1) return 0.68;
  return 0.55;
}

export async function verifyClaim(candidate: ClaimCandidate): Promise<ClaimVerdict> {
  const exa = getExaClient();
  const response = await exa.answer(candidate.text, {
    text: true,
    outputSchema: exaVerdictSchema,
  });

  const answer = isStructuredAnswer(response.answer)
    ? response.answer
    : {
        verdict: "unverifiable" as const,
        explanation: "Exa returned an unstructured answer for this claim.",
      };

  return {
    claim: candidate.text,
    verdict: answer.verdict,
    confidence: confidenceFromCitations(response.citations?.length ?? 0),
    explanation: answer.explanation,
    source: "exa-web",
    citations: response.citations?.map((citation) => ({
      title: citation.title ?? citation.url,
      url: citation.url,
      snippet: "",
    })),
  };
}
