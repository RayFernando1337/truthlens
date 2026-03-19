interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilyResult[];
  query: string;
}

export async function searchTavily(
  query: string,
  depth: "basic" | "advanced" = "basic"
): Promise<TavilyResponse> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: depth,
      max_results: 5,
    }),
  });

  if (!res.ok) {
    return { results: [], query };
  }

  return res.json();
}
