import {
  postAnalysisQueryRequestSchema,
  postAnalysisQueryResultSchema,
} from "@/lib/schemas";
import { POST_ANALYSIS_QUERY_PROMPT } from "@/lib/prompts";
import { generateTypedObject } from "@/lib/generate-object";
import type {
  PostAnalysisQuery,
  TopicSegment,
  TranscriptSegment,
} from "@/lib/types";

export const maxDuration = 60;

function formatSegments(segments: TranscriptSegment[]): string {
  return segments
    .map((s) => `[${s.index}:${s.segmentId}] ${s.text}`)
    .join("\n");
}

function formatTopicSegments(topics: TopicSegment[]): string {
  return topics
    .map(
      (t) =>
        `[${t.startSegmentIndex}-${t.endSegmentIndex}] ${t.topic} (${t.segmentType})`,
    )
    .join("\n");
}

function buildQueryPrompt(request: PostAnalysisQuery): string {
  const lines: string[] = [
    `Query type: ${request.queryType}`,
    `Question: ${request.query}`,
    "",
  ];

  if (request.summary) {
    lines.push("Session summary:", request.summary.text, "");
  }

  if (request.topicSegments && request.topicSegments.length > 0) {
    lines.push("Topic segments:", formatTopicSegments(request.topicSegments), "");
  }

  lines.push("Transcript:", formatSegments(request.segments));

  return lines.join("\n");
}

export async function POST(req: Request) {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postAnalysisQueryRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const result = await generateTypedObject({
      schema: postAnalysisQueryResultSchema,
      system: POST_ANALYSIS_QUERY_PROMPT,
      prompt: buildQueryPrompt(parsed.data),
    });

    return Response.json(result);
  } catch (e) {
    console.error("[/api/analyze/query]", e);
    const message = e instanceof Error ? e.message : "Query failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
