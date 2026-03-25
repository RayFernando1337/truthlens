import { generateObject, type LanguageModel } from "ai";
import type { ZodType } from "zod";

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
  const { object } = await generateObject({
    model,
    schema,
    system,
    prompt,
  });

  return object;
}
