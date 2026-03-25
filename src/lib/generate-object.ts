import { generateText, type LanguageModel } from "ai";
import { z, type ZodType } from "zod";

function buildSchemaPrompt(schema: ZodType): string {
  const jsonSchema = z.toJSONSchema(schema);
  return (
    "\n\nYou MUST respond with a single valid JSON object matching this schema:\n" +
    JSON.stringify(jsonSchema, null, 2) +
    "\n\nNo markdown, no code fences, no text outside the JSON."
  );
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found");
  return JSON.parse(trimmed.slice(start, end + 1));
}

function coerceFlags(raw: Record<string, unknown>): void {
  if (!Array.isArray(raw.flags)) return;
  raw.flags = raw.flags.map((f: unknown) =>
    typeof f === "string" ? { type: f, label: f } : f,
  );
}

function coerceFieldNames(obj: Record<string, unknown>): void {
  const renames: Record<string, string> = {
    fallacy: "name", bias: "name", trigger: "quote",
    detail: "description", pattern: "type",
  };
  for (const [from, to] of Object.entries(renames)) {
    if (from in obj && !(to in obj)) {
      obj[to] = obj[from];
      delete obj[from];
    }
  }
}

function coerce(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;
  coerceFlags(obj);
  for (const val of Object.values(obj)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "object" && item !== null) {
          coerceFieldNames(item as Record<string, unknown>);
        }
      }
    } else if (typeof val === "object" && val !== null) {
      coerceFlags(val as Record<string, unknown>);
    }
  }
  return obj;
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
  const { text } = await generateText({
    model,
    system: system + buildSchemaPrompt(schema),
    prompt,
  });

  const raw = extractJson(text);
  const repaired = coerce(raw);
  return schema.parse(repaired);
}
