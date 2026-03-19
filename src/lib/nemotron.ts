import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const nemotron = createOpenAICompatible({
  name: "nebius",
  baseURL: "https://api.tokenfactory.nebius.com/v1/",
  headers: {
    Authorization: `Bearer ${process.env.NEBIUS_API_KEY}`,
  },
});

export const model = nemotron.chatModel(
  "nvidia/nemotron-3-super-120b-a12b"
);
