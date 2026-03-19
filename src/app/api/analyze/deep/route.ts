import { model } from "@/lib/nemotron";
import { analysisSchema } from "@/lib/schemas";
import { L2_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateStructured } from "@/lib/structured-generate";
import { searchTavily } from "@/lib/tavily";
import type { TavilySource } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { chunks, claims } = await req.json();

  if (!chunks || !Array.isArray(chunks)) {
    return Response.json({ error: "chunks array is required" }, { status: 400 });
  }

  let searchContext = "";
  const sources: TavilySource[] = [];

  if (claims && claims.length > 0) {
    const topClaims = claims.slice(0, 3);
    const searchResults = await Promise.allSettled(
      topClaims.map((claim: string) => searchTavily(claim, "advanced"))
    );

    const verified = searchResults
      .filter(
        (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof searchTavily>>> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    for (const v of verified) {
      for (const r of v.results) {
        sources.push({
          query: v.query,
          title: r.title,
          url: r.url,
          snippet: r.content.slice(0, 300),
          score: r.score,
        });
      }
    }

    if (verified.length > 0) {
      searchContext = `\n\nSearch verification results:\n${JSON.stringify(verified, null, 2)}`;
    }
  }

  const transcript = chunks.join("\n\n---\n\n");

  try {
    const object = await generateStructured({
      model,
      schema: analysisSchema,
      system: L2_SYSTEM_PROMPT,
      prompt: `Transcript segments:\n\n${transcript}${searchContext}`,
    });

    return Response.json({ ...object, sources });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
