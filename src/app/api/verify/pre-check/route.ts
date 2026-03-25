import { llmPreVerdictBatchSchema, preVerifyRequestSchema } from "@/lib/schemas";
import { runPreVerification } from "@/lib/verification-core";

export const maxDuration = 60;

export async function POST(req: Request) {
  let rawBody: unknown;

  try {
    rawBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = preVerifyRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  try {
    const results = await runPreVerification(parsed.data.claims);
    return Response.json(llmPreVerdictBatchSchema.parse({ results }));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Pre-check failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
