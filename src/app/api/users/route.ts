import { NextResponse } from "next/server";
import { getAllUsers, clearAllUsers } from "@/lib/redis";
import { SessionStats } from "@/lib/types";

const GPT4O_INPUT_COST = 2.5 / 1_000_000;
const GPT4O_OUTPUT_COST = 10.0 / 1_000_000;
const EMBEDDING_COST = 0.02 / 1_000_000;

export async function GET() {
  try {
    const users = await getAllUsers();

    const stats: SessionStats = {
      totalUsers: users.length,
      completedUsers: users.filter(
        (u) => u.status === "completed" || u.status === "matched"
      ).length,
      matchedUsers: users.filter((u) => u.status === "matched").length,
      totalChatInputTokens: users.reduce(
        (s, u) => s + u.costs.chatInputTokens,
        0
      ),
      totalChatOutputTokens: users.reduce(
        (s, u) => s + u.costs.chatOutputTokens,
        0
      ),
      totalEmbeddingTokens: users.reduce(
        (s, u) => s + u.costs.embeddingTokens,
        0
      ),
      totalCost: 0,
    };

    stats.totalCost =
      stats.totalChatInputTokens * GPT4O_INPUT_COST +
      stats.totalChatOutputTokens * GPT4O_OUTPUT_COST +
      stats.totalEmbeddingTokens * EMBEDDING_COST;

    // Return users without embeddings (too large for list view)
    const usersWithoutEmbeddings = users.map(({ embedding, ...rest }) => ({
      ...rest,
      hasEmbedding: !!embedding,
    }));

    return NextResponse.json({ users: usersWithoutEmbeddings, stats });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ users: [], stats: null, error: message });
  }
}

export async function DELETE() {
  await clearAllUsers();
  return NextResponse.json({ success: true });
}
