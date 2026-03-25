import { generateText, Output, type LanguageModel } from "ai";
import { type ZodType, toJSONSchema } from "zod";

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch { /* continue */ }
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* continue */ }
  }
  throw new Error(`No valid JSON in model response: ${trimmed.slice(0, 120)}`);
}

export async function generateTypedObject<T>({
  model,
  schema,
  system,
  prompt,
}: {
  model: LanguageModel;
  schema: ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> {
  const spec = JSON.stringify(toJSONSchema(schema), null, 2);
  const { text } = await generateText({
    model,
    system: `${system}\n\nRespond with ONLY a JSON object (no markdown, no explanation).\nRequired schema:\n${spec}`,
    prompt,
    output: Output.json(),
  });
  return schema.parse(extractJson(text));
}
