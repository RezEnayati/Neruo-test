import { NextRequest, NextResponse } from "next/server";
import { getUser, updateUser } from "@/lib/redis";
import { chatWithAI } from "@/lib/openai";

const MAX_QUESTIONS = 5;

export async function POST(req: NextRequest) {
  try {
    const { userId, message } = await req.json();

    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Count how many user messages we have (this determines question number)
    const userMessageCount = user.messages.filter(
      (m) => m.role === "user"
    ).length;

    // Add user message if provided (not provided for initial greeting)
    if (message) {
      user.messages.push({ role: "user", content: message });
    }

    const questionNumber = userMessageCount + (message ? 1 : 0) + 1;

    const { response, inputTokens, outputTokens } = await chatWithAI(
      user.name,
      user.messages,
      Math.min(questionNumber, MAX_QUESTIONS + 1)
    );

    user.messages.push({ role: "assistant", content: response });
    user.costs.chatInputTokens += inputTokens;
    user.costs.chatOutputTokens += outputTokens;

    const currentUserMessages = user.messages.filter(
      (m) => m.role === "user"
    ).length;
    const isComplete = currentUserMessages >= MAX_QUESTIONS;

    await updateUser(user);

    return NextResponse.json({
      response,
      isComplete,
      questionNumber: currentUserMessages,
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
