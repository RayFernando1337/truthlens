import { model } from "@/lib/nemotron";
import {
  sessionSummarySchema,
  sessionSummaryUpdateSchema,
  summaryRequestSchema,
} from "@/lib/schemas";
import { SUMMARY_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";
import {
  buildSummaryPrompt,
  finalizeSessionSummary,
} from "@/lib/analysis-core";

export const maxDuration = 60;

export async function POST(req: Request) {
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = summaryRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const body = await generateTypedObject({
      model,
      schema: sessionSummaryUpdateSchema,
      system: SUMMARY_PROMPT,
      prompt: buildSummaryPrompt(parsed.data),
    });

    const summary = sessionSummarySchema.parse(
      finalizeSessionSummary(body, parsed.data)
    );

    return Response.json(summary);
  } catch (e) {
    console.error("[/api/analyze/summarize]", e);
    const message = e instanceof Error ? e.message : "Summary update failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
