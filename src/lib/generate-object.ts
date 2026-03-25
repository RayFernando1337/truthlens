import {
  generateText, Output, NoObjectGeneratedError, type LanguageModel,
} from "ai";
import { type ZodType } from "zod";

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
  try {
    const { output } = await generateText({
      model,
      system,
      prompt,
      output: Output.object({ schema }),
    });
    return output;
  } catch (err) {
    const raw = NoObjectGeneratedError.isInstance(err) ? err.text : undefined;
    if (!raw) throw err;
    return schema.parse(extractJson(raw));
  }
}
