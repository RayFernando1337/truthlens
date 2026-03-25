import { generateText, Output, gateway } from "ai";
import { type ZodType } from "zod";

const model = gateway("openai/gpt-5.4-nano");

export async function generateTypedObject<T>({
  schema,
  system,
  prompt,
  maxAttempts = 2,
}: {
  schema: ZodType<T>;
  system: string;
  prompt: string;
  maxAttempts?: number;
}): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { output } = await generateText({
        model,
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
