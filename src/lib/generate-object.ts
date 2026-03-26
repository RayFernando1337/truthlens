import { generateText, NoObjectGeneratedError, Output, gateway } from "ai";
import { type ZodType } from "zod";

export type ModelId = "default" | "mini" | "gemini";

const models = {
  default: gateway("openai/gpt-5.4-nano"),
  mini: gateway("openai/gpt-5.4-mini"),
  gemini: gateway("google/gemini-3-flash"),
};

export async function generateTypedObject<T>({
  schema,
  system,
  prompt,
  maxAttempts = 2,
  modelId = "default",
  maxOutputTokens,
}: {
  schema: ZodType<T>;
  system: string;
  prompt: string;
  maxAttempts?: number;
  modelId?: ModelId;
  maxOutputTokens?: number;
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
        maxOutputTokens,
      });
      return output;
    } catch (e) {
      if (
        NoObjectGeneratedError.isInstance(e) &&
        e.finishReason === "length"
      ) {
        throw new Error(
          "Output truncated (finishReason=length). The response exceeded maxOutputTokens — retrying would not help.",
        );
      }
      lastError = e;
      console.error(`[generateTypedObject] Attempt ${attempt}/${maxAttempts} failed`, e);
      if (attempt >= maxAttempts) break;
    }
  }
  throw lastError;
}
