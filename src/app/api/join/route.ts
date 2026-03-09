import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/redis";
import { User } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = crypto.randomUUID().slice(0, 8);

    const user: User = {
      id,
      name: name.trim(),
      messages: [],
      embedding: null,
      matchId: null,
      matchExplanation: null,
      status: "chatting",
      createdAt: Date.now(),
      costs: { chatInputTokens: 0, chatOutputTokens: 0, embeddingTokens: 0 },
    };

    await createUser(user);

    return NextResponse.json({ userId: id, name: user.name });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
