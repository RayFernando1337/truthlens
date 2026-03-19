import { generateText, type LanguageModel } from "ai";
import { type ZodType } from "zod";

function extractJSON(text: string): string {
  const fenced = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  return text.trim();
}

const MAX_RETRIES = 2;

export async function generateStructured<T>({
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
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const currentPrompt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nIMPORTANT: Your previous response had validation errors:\n${lastError instanceof Error ? lastError.message : String(lastError)}\nPlease return a complete, valid JSON object matching the required schema exactly.`;

    const { text } = await generateText({
      model,
      system,
      prompt: currentPrompt,
    });

    try {
      const raw = extractJSON(text);
      const parsed = JSON.parse(raw);
      return schema.parse(parsed) as T;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError;
}
