import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/redis";
import { matchUsers } from "@/lib/matching";

export async function POST() {
  const users = await getAllUsers();
  const completed = users.filter((u) => u.status === "completed");

  if (completed.length < 2) {
    return NextResponse.json(
      { error: "Need at least 2 completed users to match" },
      { status: 400 }
    );
  }

  const { matches, totalInputTokens, totalOutputTokens } =
    await matchUsers(users);

  return NextResponse.json({
    matches,
    matchExplanationCosts: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
  });
}
