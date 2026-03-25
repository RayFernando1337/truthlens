import { generateText, Output, gateway } from "ai";
import { type ZodType } from "zod";

const model = gateway("openai/gpt-5.4-nano");

export async function generateTypedObject<T>({
  schema,
  system,
  prompt,
}: {
  schema: ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> {
  const { output } = await generateText({
    model,
    system,
    prompt,
    output: Output.object({ schema }),
  });
  return output;
}
