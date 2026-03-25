import { model } from "@/lib/nemotron";
import { pulseRequestSchema, pulseSchema } from "@/lib/schemas";
import { L1_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";

export const maxDuration = 30;

export async function POST(req: Request) {
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = pulseRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const previousContext = parsed.data.previousSegments
      .map((segment) => `- [${segment.segmentId}] ${segment.text}`)
      .join("\n");

    const prompt = [
      previousContext
        ? `Previous segments for context:\n${previousContext}`
        : "Previous segments for context:\nNone",
      "",
      `Current segment [${parsed.data.segment.segmentId}]:`,
      parsed.data.segment.text,
    ].join("\n");

    const object = await generateTypedObject({
      model,
      schema: pulseSchema,
      system: L1_SYSTEM_PROMPT,
      prompt,
    });

    return Response.json(object);
  } catch (e) {
    console.error("[/api/analyze/pulse]", e);
    const message = e instanceof Error ? e.message : "Analysis failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
