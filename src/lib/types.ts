export interface User {
  id: string;
  name: string;
  messages: ChatMessage[];
  embedding: number[] | null;
  matchId: string | null;
  matchExplanation: string | null;
  status: "chatting" | "completed" | "matched";
  createdAt: number;
  costs: {
    chatInputTokens: number;
    chatOutputTokens: number;
    embeddingTokens: number;
  };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MatchPair {
  user1Id: string;
  user1Name: string;
  user2Id: string;
  user2Name: string;
  similarity: number;
  explanation: string;
}

export interface EmbeddingPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  matchId: string | null;
  status: string;
}

export interface SessionStats {
  totalUsers: number;
  completedUsers: number;
  matchedUsers: number;
  totalChatInputTokens: number;
  totalChatOutputTokens: number;
  totalEmbeddingTokens: number;
  totalCost: number;
}
