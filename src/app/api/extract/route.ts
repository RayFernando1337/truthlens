import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "url is required" }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return Response.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Response.json(
        { error: "Only HTTP/HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TruthLens/1.0; +https://truthlens.dev)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return Response.json(
        { error: `Failed to fetch URL (${res.status})` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const { document } = parseHTML(html);
    const article = new Readability(document as unknown as Document).parse();

    if (!article || !article.textContent?.trim()) {
      return Response.json(
        { error: "Could not extract article content from this URL" },
        { status: 422 }
      );
    }

    return Response.json({
      title: article.title ?? "",
      text: article.textContent.trim(),
      excerpt: article.excerpt ?? "",
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "TimeoutError") {
      return Response.json(
        { error: "URL fetch timed out" },
        { status: 504 }
      );
    }
    const message = e instanceof Error ? e.message : "Extraction failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
