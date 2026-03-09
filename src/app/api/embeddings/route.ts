import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/redis";
import { reduceTo3D } from "@/lib/pca";
import { EmbeddingPoint } from "@/lib/types";

export async function GET() {
  try {
    const users = await getAllUsers();
    const withEmbeddings = users.filter((u) => u.embedding);

    if (withEmbeddings.length === 0) {
      return NextResponse.json({ points: [], matches: [] });
    }

    const embeddings = withEmbeddings.map((u) => u.embedding!);
    const coords = reduceTo3D(embeddings);

    const points: EmbeddingPoint[] = withEmbeddings.map((u, i) => ({
      id: u.id,
      name: u.name,
      x: coords[i].x,
      y: coords[i].y,
      z: coords[i].z,
      matchId: u.matchId,
      status: u.status,
    }));

    // Build match lines
    const matches: { from: string; to: string }[] = [];
    const seen = new Set<string>();
    for (const u of withEmbeddings) {
      if (u.matchId && !seen.has(u.id) && !seen.has(u.matchId)) {
        matches.push({ from: u.id, to: u.matchId });
        seen.add(u.id);
        seen.add(u.matchId);
      }
    }

    return NextResponse.json({ points, matches });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ points: [], matches: [], error: message });
  }
}
