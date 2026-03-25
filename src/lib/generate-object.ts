import { generateText, Output, type LanguageModel } from "ai";
import { type ZodType } from "zod";

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
  const result = await generateText({
    model,
    system,
    prompt,
    output: Output.object({ schema }),
  });
  return result.output;
}
