import {
  analysisModelSchema,
  analysisRequestSchema,
  analysisSnapshotSchema,
} from "@/lib/schemas";
import { ANALYSIS_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";
import {
  buildAnalysisPrompt,
  finalizeAnalysisSnapshot,
} from "@/lib/analysis-core";

export const maxDuration = 60;

export async function POST(req: Request) {
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = analysisRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const body = await generateTypedObject({
      schema: analysisModelSchema,
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: buildAnalysisPrompt(parsed.data),
      modelId: "mini",
      maxOutputTokens: 16_384,
    });

    const snapshot = analysisSnapshotSchema.parse(
      finalizeAnalysisSnapshot(body, parsed.data)
    );

    return Response.json(snapshot);
  } catch (e) {
    console.error("[/api/analyze]", e);
    const message = e instanceof Error ? e.message : "Analysis failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
