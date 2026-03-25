import { generateText, Output, gateway } from "ai";
import { type ZodType } from "zod";

export type ModelId = "default" | "gemini";

const models = {
  default: gateway("openai/gpt-5.4-nano"),
  gemini: gateway("google/gemini-3-flash"),
};

export async function generateTypedObject<T>({
  schema,
  system,
  prompt,
  maxAttempts = 2,
  modelId = "default",
}: {
  schema: ZodType<T>;
  system: string;
  prompt: string;
  maxAttempts?: number;
  modelId?: ModelId;
}): Promise<T> {
  const selectedModel = models[modelId];
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { output } = await generateText({
        model: selectedModel,
        system,
        prompt,
        output: Output.object({ schema }),
      });
      return output;
    } catch (e) {
      lastError = e;
      console.error(`[generateTypedObject] Attempt ${attempt}/${maxAttempts} failed`, e);
      if (attempt >= maxAttempts) break;
    }
  }
  throw lastError;
}
