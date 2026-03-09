import { User, MatchPair } from "./types";
import { generateMatchExplanation } from "./openai";
import { updateUser } from "./redis";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getUserConversationText(user: User): string {
  return user.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n");
}

export async function matchUsers(users: User[]): Promise<{
  matches: MatchPair[];
  totalInputTokens: number;
  totalOutputTokens: number;
}> {
  const completed = users.filter(
    (u) => u.status === "completed" && u.embedding
  );

  // Compute all pairwise similarities
  const pairs: { i: number; j: number; sim: number }[] = [];
  for (let i = 0; i < completed.length; i++) {
    for (let j = i + 1; j < completed.length; j++) {
      pairs.push({
        i,
        j,
        sim: cosineSimilarity(completed[i].embedding!, completed[j].embedding!),
      });
    }
  }

  // Sort by similarity (highest first)
  pairs.sort((a, b) => b.sim - a.sim);

  // Greedy one-to-one matching
  const matched = new Set<number>();
  const matchPairs: { i: number; j: number; sim: number }[] = [];

  for (const pair of pairs) {
    if (matched.has(pair.i) || matched.has(pair.j)) continue;
    matchPairs.push(pair);
    matched.add(pair.i);
    matched.add(pair.j);
  }

  // Generate explanations and update users
  const matches: MatchPair[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (const pair of matchPairs) {
    const u1 = completed[pair.i];
    const u2 = completed[pair.j];

    const { explanation, inputTokens, outputTokens } =
      await generateMatchExplanation(
        u1.name,
        getUserConversationText(u1),
        u2.name,
        getUserConversationText(u2)
      );

    totalInputTokens += inputTokens;
    totalOutputTokens += outputTokens;

    // Update both users
    u1.matchId = u2.id;
    u1.matchExplanation = explanation;
    u1.status = "matched";
    u2.matchId = u1.id;
    u2.matchExplanation = explanation;
    u2.status = "matched";

    await updateUser(u1);
    await updateUser(u2);

    matches.push({
      user1Id: u1.id,
      user1Name: u1.name,
      user2Id: u2.id,
      user2Name: u2.name,
      similarity: pair.sim,
      explanation,
    });
  }

  // Handle odd person out - match with closest available
  if (completed.length % 2 === 1) {
    const unmatchedIdx = [...Array(completed.length).keys()].find(
      (i) => !matched.has(i)
    );
    if (unmatchedIdx !== undefined) {
      // Find their best match (already matched to someone else)
      let bestSim = -1;
      let bestIdx = 0;
      for (let j = 0; j < completed.length; j++) {
        if (j === unmatchedIdx) continue;
        const sim = cosineSimilarity(
          completed[unmatchedIdx].embedding!,
          completed[j].embedding!
        );
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = j;
        }
      }

      const u1 = completed[unmatchedIdx];
      const u2 = completed[bestIdx];

      const { explanation, inputTokens, outputTokens } =
        await generateMatchExplanation(
          u1.name,
          getUserConversationText(u1),
          u2.name,
          getUserConversationText(u2)
        );

      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      u1.matchId = u2.id;
      u1.matchExplanation = explanation;
      u1.status = "matched";
      await updateUser(u1);

      matches.push({
        user1Id: u1.id,
        user1Name: u1.name,
        user2Id: u2.id,
        user2Name: u2.name,
        similarity: bestSim,
        explanation: explanation + " (trio match)",
      });
    }
  }

  return { matches, totalInputTokens, totalOutputTokens };
}
