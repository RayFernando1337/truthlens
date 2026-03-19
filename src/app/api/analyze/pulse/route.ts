import { model } from "@/lib/nemotron";
import { pulseSchema } from "@/lib/schemas";
import { L1_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateStructured } from "@/lib/structured-generate";

export const maxDuration = 30;

export async function POST(req: Request) {
  const { chunk } = await req.json();

  if (!chunk || typeof chunk !== "string") {
    return Response.json({ error: "chunk is required" }, { status: 400 });
  }

  try {
    const object = await generateStructured({
      model,
      schema: pulseSchema,
      system: L1_SYSTEM_PROMPT,
      prompt: chunk,
    });

    return Response.json(object);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
