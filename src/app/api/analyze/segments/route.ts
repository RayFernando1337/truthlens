import {
  topicSegmentBatchSchema,
  topicSegmentRequestSchema,
} from "@/lib/schemas";
import { TOPIC_SEGMENTATION_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";
import type { TopicSegmentRequest, TranscriptSegment } from "@/lib/types";

export const maxDuration = 120;

function formatSegments(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[${s.index}:${s.segmentId}] ${s.text}`)
    .join("\n");
}

function buildSegmentationPrompt(request: TopicSegmentRequest): string {
  const lines: string[] = [
    "Transcript segments:",
    formatSegments(request.segments),
  ];

  if (request.flagData && request.flagData.length > 0) {
    lines.push("", "L1 flags per segment:");
    for (const fd of request.flagData) {
      if (fd.flags.length > 0) {
        lines.push(`  ${fd.segmentId}: ${fd.flags.join(", ")}`);
      }
    }
  }

  if (request.summary) {
    lines.push("", "Running summary:", request.summary.text);
  }

  lines.push(
    "",
    `Total segments: ${request.segments.length}`,
    `Produce topic segments covering indices 0 through ${request.segments.length - 1}.`,
  );

  return lines.join("\n");
}

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = topicSegmentRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const result = await generateTypedObject({
      schema: topicSegmentBatchSchema,
      system: TOPIC_SEGMENTATION_PROMPT,
      prompt: buildSegmentationPrompt(parsed.data),
      modelId: "gemini",
    });

    return Response.json(result.segments);
  } catch (e) {
    console.error("[/api/analyze/segments]", e);
    const message = e instanceof Error ? e.message : "Topic segmentation failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
