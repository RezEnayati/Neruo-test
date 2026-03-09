import OpenAI from "openai";
import { ChatMessage } from "./types";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const SYSTEM_PROMPT = `You are NeuroMatch, a warm and witty AI helping match people based on personality. You're chatting with someone to learn who they really are.

RULES:
- Ask exactly ONE question per response
- Keep responses short (1-2 sentences of reaction + your question)
- Be warm, playful, and genuinely curious
- React to their answers naturally before asking the next question

You will ask exactly 5 questions total, in this order:
1. A fun icebreaker about their personality or lifestyle
2. What they're genuinely passionate about
3. What they value most in friendships or relationships
4. A creative hypothetical that reveals how they think
5. A fun "would you rather" or quirky preference question

After they answer question 5, give a brief warm 1-sentence closing like "Thanks! You're awesome. Sit tight while we find your match!"

IMPORTANT: You are currently on question {questionNumber} of 5.`;

export async function chatWithAI(
  userName: string,
  messages: ChatMessage[],
  questionNumber: number
): Promise<{ response: string; inputTokens: number; outputTokens: number }> {
  const systemPrompt = SYSTEM_PROMPT.replace(
    "{questionNumber}",
    String(questionNumber)
  );

  const apiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    {
      role: "system",
      content: `The user's name is ${userName}. ${questionNumber === 1 ? "Greet them by name and ask your first question." : ""}`,
    },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: apiMessages,
    max_tokens: 200,
    temperature: 0.9,
  });

  return {
    response: completion.choices[0].message.content || "",
    inputTokens: completion.usage?.prompt_tokens || 0,
    outputTokens: completion.usage?.completion_tokens || 0,
  };
}

export async function generateEmbedding(
  text: string
): Promise<{ embedding: number[]; tokens: number }> {
  const response = await getOpenAI().embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens,
  };
}

export async function generateMatchExplanation(
  name1: string,
  convo1: string,
  name2: string,
  convo2: string
): Promise<{ explanation: string; inputTokens: number; outputTokens: number }> {
  const completion = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You explain why two people are a great match based on their chat responses. Be specific, reference what they said, and be upbeat. Keep it to 2-3 sentences max.",
      },
      {
        role: "user",
        content: `Why are ${name1} and ${name2} a great match?\n\n${name1}'s responses:\n${convo1}\n\n${name2}'s responses:\n${convo2}`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  });

  return {
    explanation: completion.choices[0].message.content || "",
    inputTokens: completion.usage?.prompt_tokens || 0,
    outputTokens: completion.usage?.completion_tokens || 0,
  };
}
