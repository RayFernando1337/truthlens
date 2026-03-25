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
    confidence: {
      type: "number",
      description:
        "How confident you are in this verdict given the search results (0.0-1.0).",
    },
    explanation: {
      type: "string",
      description: "A concise explanation grounded in the search results.",
    },
  },
  required: ["verdict", "confidence", "explanation"],
} as const;

let cachedClient: Exa | null = null;

interface ExaVerdictAnswer {
  verdict: ClaimVerdict["verdict"];
  confidence: number;
  explanation: string;
}

function isStructuredAnswer(value: unknown): value is ExaVerdictAnswer {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.verdict === "string" &&
    typeof candidate.confidence === "number" &&
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

const FALLBACK_CONFIDENCE = 0.5;

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
        confidence: FALLBACK_CONFIDENCE,
        explanation: "Exa returned an unstructured answer for this claim.",
      };

  return {
    claim: candidate.text,
    verdict: answer.verdict,
    confidence: answer.confidence,
    explanation: answer.explanation,
    source: "exa-web",
    citations: response.citations?.map((citation) => ({
      title: citation.title ?? citation.url,
      url: citation.url,
      snippet: "",
    })),
  };
}
