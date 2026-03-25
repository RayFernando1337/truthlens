import { kv } from '@vercel/kv'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'

import { auth } from '@clerk/nextjs'
import { nanoid } from '@/lib/utils'
import { Message } from 'ai'

export const runtime = 'edge'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})

const openai = new OpenAIApi(configuration)

export async function POST(req: Request) {
  const json = await req.json()
  const { messages, previewToken } = json
  const { userId } = auth()

  if (!userId) {
    return new Response('Unauthorized', {
      status: 401
    })
  }

  if (previewToken) {
    configuration.apiKey = previewToken
  }

  const sysPrompt = `Analyze the given text (article, tweet, or opinion piece) according to the following structure:

  - **Title**: (Input title here)
  - **Source URL**: (Input URL here)
  - **Author**: (Input author's name here, if available)
  - **Date Published**: (Input publication date here, if available)
  
  ## Summary
  Provide a concise summary (2-3 sentences) of the main points and arguments presented in the text.
  
  ## Analysis
  
  ### Tone
  Describe the overall tone of the text (e.g., urgent, critical, optimistic, neutral). Provide specific examples from the text that demonstrate this tone.
  
  ### Emotional Appeals
  Identify and analyze the emotional appeals used in the text. For each type of appeal:
  - Provide a subheading (e.g., Fear, Patriotism, Guilt)
  - Explain how the appeal is used
  - Provide at least one specific quote from the text as an example
  - Discuss the potential impact of this appeal on the audience
  
  ### Logical Fallacies
  Identify and explain any logical fallacies present in the text. For each fallacy:
  - Provide a subheading with the name of the fallacy
  - Explain what the fallacy is and how it's being used in the text
  - Provide a specific quote or paraphrase from the text as an example
  - Discuss how this fallacy might weaken the author's argument
  
  ### Reasoning
  Distinguish between inductive and deductive reasoning used in the text:
  - Provide examples of each type of reasoning
  - Explain how the author uses these reasoning methods to support their arguments
  - Assess the effectiveness of the reasoning
  
  ### Cognitive Biases
  Identify any evident cognitive biases in the text. For each bias:
  - Provide a subheading with the name of the bias
  - Explain what the bias is and how it's manifested in the text
  - Provide specific examples from the text
  - Discuss how this bias might influence the author's perspective or the reader's interpretation
  
  ### Personal Feelings
  Analyze how the author's personal feelings are expressed in the text:
  - Identify specific emotions (e.g., frustration, concern, hope)
  - Provide quotes or examples that demonstrate these feelings
  - Discuss how these personal feelings might influence the author's argument or perspective
  
  ### Unsupported Claims
  Highlight any significant claims made in the text that lack supporting evidence. For each claim:
  - Provide a subheading with a brief description of the claim
  - Quote the claim from the text
  - Explain why the claim is unsupported or problematic
  - Discuss what kind of evidence would be needed to support this claim
  
  ## Conclusion
  Provide a balanced assessment of the text's strengths and weaknesses:
  - Summarize the key points of your analysis
  - Evaluate the overall effectiveness of the author's argument
  - Discuss any limitations in the text's reasoning or evidence
  - Suggest how the argument could be strengthened or improved
  
  ## Additional Context
  Provide any relevant additional context that might help in understanding or interpreting the text, such as:
  - Historical or current events referenced
  - The author's background or potential biases (if known)
  - Limitations of analyzing this single piece in isolation
  
  ---
  
  **Note to LLM**: When performing this analysis:
  1. Use specific quotes from the text to support your observations whenever possible.
  2. Maintain a balanced and objective tone throughout your analysis.
  3. Ensure that each section of the analysis is thorough and addresses all requested elements.
  4. If certain requested elements are not applicable or present in the text, briefly note their absence.
  5. Aim for clarity and organization in your response, using appropriate formatting (headings, subheadings, bullet points) to enhance readability.   
`;

  messages.push({
    content: sysPrompt,
    role:'system'
  })

  const res = await openai.createChatCompletion({
    model: 'gpt-4o',
    messages,
    temperature: 0.25,
    max_tokens: 3000,
    top_p: 0.5,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: true
  })

  const stream = OpenAIStream(res, {
    async onCompletion(completion) {
      const history = messages.filter((m: Message) => {
        return m.role === 'user' || m.role === 'assistant'
      })
      const title = json.messages[0].content.substring(0, 100)
      const id = json.id ?? nanoid()
      const createdAt = Date.now()
      const path = `/chat/${id}`
      const payload = {
        id,
        title,
        userId,
        createdAt,
        path,
        messages: [
            ...history,
          {
            content: completion,
            role: 'assistant'
          }
        ]
      }
      await kv.hmset(`chat:${id}`, payload)
      await kv.zadd(`user:chat:${userId}`, {
        score: createdAt,
        member: `chat:${id}`
      })
    }
  })

  return new StreamingTextResponse(stream)
}
