import { NextRequest, NextResponse } from "next/server";
import { getUser, updateUser } from "@/lib/redis";
import { generateEmbedding } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Concatenate user messages for embedding
    const text = user.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    const { embedding, tokens } = await generateEmbedding(text);

    user.embedding = embedding;
    user.status = "completed";
    user.costs.embeddingTokens = tokens;

    await updateUser(user);

    return NextResponse.json({ success: true, embeddingTokens: tokens });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
