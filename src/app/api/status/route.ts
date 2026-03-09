import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/redis";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const user = await getUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let matchName: string | null = null;
    if (user.matchId) {
      const match = await getUser(user.matchId);
      matchName = match?.name || null;
    }

    return NextResponse.json({
      status: user.status,
      matchId: user.matchId,
      matchName,
      matchExplanation: user.matchExplanation,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
