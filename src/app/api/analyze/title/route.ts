import {
  sessionTitleRequestSchema,
  sessionTitleResultSchema,
} from "@/lib/schemas";
import { SESSION_TITLE_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";
import type { SessionTitleRequest } from "@/lib/types";

export const maxDuration = 60;

function buildTitlePrompt(request: SessionTitleRequest): string {
  const lines = [
    `Input kind: ${request.inputKind}`,
    `Existing source title: ${request.sourceTitle ?? "none"}`,
    "",
    `Core argument: ${request.context.tldr}`,
    "",
    "Key points:",
    ...request.context.corePoints.map((point) => `- ${point}`),
    "",
    `Speaker intent: ${request.context.speakerIntent}`,
    `Overall assessment: ${request.context.overallAssessment}`,
  ];
  return lines.join("\n");
}

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sessionTitleRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const result = await generateTypedObject({
      schema: sessionTitleResultSchema,
      system: SESSION_TITLE_PROMPT,
      prompt: buildTitlePrompt(parsed.data),
    });
    return Response.json(result);
  } catch (e) {
    console.error("[/api/analyze/title]", e);
    const message = e instanceof Error ? e.message : "Session titling failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
