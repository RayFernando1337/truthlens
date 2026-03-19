import { model } from "@/lib/nemotron";
import { patternsSchema } from "@/lib/schemas";
import { L3_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateStructured } from "@/lib/structured-generate";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { transcript } = await req.json();

  if (!transcript || typeof transcript !== "string") {
    return Response.json(
      { error: "transcript is required" },
      { status: 400 }
    );
  }

  try {
    const object = await generateStructured({
      model,
      schema: patternsSchema,
      system: L3_SYSTEM_PROMPT,
      prompt: transcript,
    });

    return Response.json(object);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
