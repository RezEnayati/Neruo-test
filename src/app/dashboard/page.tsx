"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";
import dynamic from "next/dynamic";

const EmbeddingScene = dynamic(() => import("./EmbeddingScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <p className="text-xs text-[var(--text-muted)]">Loading 3D...</p>
    </div>
  ),
});

interface UserInfo {
  id: string;
  name: string;
  status: "chatting" | "completed" | "matched";
  matchId: string | null;
  matchExplanation: string | null;
  hasEmbedding: boolean;
  messages: { role: string; content: string }[];
  costs: { chatInputTokens: number; chatOutputTokens: number; embeddingTokens: number };
}

interface Stats {
  totalUsers: number; completedUsers: number; matchedUsers: number;
  totalChatInputTokens: number; totalChatOutputTokens: number;
  totalEmbeddingTokens: number; totalCost: number;
}

interface EmbeddingPoint {
  id: string; name: string; x: number; y: number; z: number;
  matchId: string | null; status: string;
}

interface MatchLine { from: string; to: string; }

interface MatchResult {
  user1Name: string; user2Name: string; similarity: number; explanation: string;
}

const COLORS = [
  "#E8C872", "#4ADE80", "#38BDF8", "#FB923C", "#C084FC",
  "#2DD4BF", "#F87171", "#FBBF24", "#67E8F9", "#F472B6",
  "#A78BFA", "#34D399", "#FACC15", "#7DD3FC", "#818CF8",
  "#86EFAC", "#FDE68A", "#93C5FD", "#F9A8D4", "#A5F3FC",
];

export default function Dashboard() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [points, setPoints] = useState<EmbeddingPoint[]>([]);
  const [matchLines, setMatchLines] = useState<MatchLine[]>([]);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matching, setMatching] = useState(false);
  const [appUrl, setAppUrl] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => { setAppUrl(window.location.origin); }, []);

  const displayMatches = useMemo(() => {
    if (matches.length > 0) return matches;
    const matched = users.filter((u) => u.status === "matched" && u.matchId && u.matchExplanation);
    const seen = new Set<string>();
    const result: MatchResult[] = [];
    for (const user of matched) {
      if (seen.has(user.id) || !user.matchId) continue;
      const partner = users.find((u) => u.id === user.matchId);
      if (!partner || seen.has(partner.id)) continue;
      seen.add(user.id); seen.add(partner.id);
      result.push({ user1Name: user.name, user2Name: partner.name, similarity: 0, explanation: user.matchExplanation || "" });
    }
    return result;
  }, [matches, users]);

  const fetchData = useCallback(async () => {
    try {
      const [usersRes, embRes] = await Promise.all([fetch("/api/users"), fetch("/api/embeddings")]);
      const usersData = await usersRes.json();
      const embData = await embRes.json();
      setUsers(usersData.users || []); setStats(usersData.stats || null);
      setPoints(embData.points || []); setMatchLines(embData.matches || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function runMatching() {
    setMatching(true);
    try {
      const res = await fetch("/api/match", { method: "POST" });
      const data = await res.json();
      if (data.matches) setMatches(data.matches);
      await fetchData();
    } catch { alert("Matching failed"); }
    finally { setMatching(false); }
  }

  async function resetSession() {
    if (!confirm("Delete all users and data?")) return;
    await fetch("/api/users", { method: "DELETE" });
    setUsers([]); setPoints([]); setMatchLines([]); setMatches([]);
    await fetchData();
  }

  const completedCount = users.filter((u) => u.status === "completed" || u.status === "matched").length;

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg)]">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full border border-[var(--border-strong)] flex items-center justify-center">
            <span className="text-[8px] font-display font-bold text-[var(--text-secondary)]">N</span>
          </div>
          <span className="font-display font-semibold text-sm text-[var(--text)]">NeuroMatch</span>
          <span className="text-[var(--text-muted)] text-xs ml-0.5">/</span>
          <span className="text-xs text-[var(--text-muted)]">Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
              ${stats.totalCost.toFixed(4)}
            </span>
          )}
          <button
            onClick={runMatching}
            disabled={matching || completedCount < 2}
            className="px-4 py-1.5 bg-[var(--text)] text-[var(--bg)] rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
          >
            {matching ? "Matching..." : `Match (${completedCount})`}
          </button>
          <button
            onClick={resetSession}
            className="px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-[var(--border)] flex flex-col flex-shrink-0 bg-[var(--bg)]">
          {/* QR — clean, no card */}
          <div className="p-5 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="label">Scan to join</span>
            </div>
            {appUrl ? (
              <div className="flex justify-center">
                <div className="p-2.5 bg-white rounded-lg">
                  <QRCodeCanvas value={appUrl} size={120} />
                </div>
              </div>
            ) : (
              <div className="w-[145px] h-[145px] mx-auto rounded-lg bg-[var(--surface)]" />
            )}
            <p className="mt-2.5 text-[10px] font-mono text-[var(--text-muted)] text-center break-all leading-relaxed">{appUrl}</p>
          </div>

          {/* Participants */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3">
              <span className="label">Participants</span>
              <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">{users.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {users.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center py-10">
                  Waiting for students...
                </p>
              )}
              {users
                .sort((a, b) => ({ matched: 0, completed: 1, chatting: 2 })[a.status] - ({ matched: 0, completed: 1, chatting: 2 })[b.status])
                .map((user, i) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm text-[var(--text)]">{user.name}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                      {user.status === "chatting"
                        ? `${user.messages.filter((m) => m.role === "user").length}/5`
                        : user.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </aside>

        {/* Main — 3D scene + matches */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 3D Scene — full bleed, no card wrapper */}
          <div className="flex-1 relative bg-[var(--bg-raised)]">
            <div className="absolute inset-0">
              {points.length > 0 ? (
                <EmbeddingScene points={points} matchLines={matchLines} autoRotate={autoRotate} />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs text-[var(--text-muted)]">Waiting for embeddings...</p>
                </div>
              )}
            </div>

            {/* Floating overlay controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/[0.06] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
              >
                {autoRotate ? "Auto" : "Manual"}
              </button>
              <span className="text-[11px] font-mono tabular-nums text-[var(--text-muted)] bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md border border-white/[0.06]">
                {points.length} pts
              </span>
            </div>

            <div className="absolute bottom-4 left-4 z-10">
              <span className="text-[10px] font-mono text-[var(--text-muted)] bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md border border-white/[0.06]">
                1,536-dim → 3D via PCA
              </span>
            </div>
          </div>

          {/* Match results */}
          {displayMatches.length > 0 && (
            <div className="border-t border-[var(--border)] max-h-60 overflow-y-auto bg-[var(--bg)]">
              <div className="px-5 py-3">
                <span className="label">Matches</span>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {displayMatches.map((m, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-[var(--surface)] rounded-lg border border-[var(--border)] animate-fade-in"
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-[var(--text)]">{m.user1Name}</span>
                        <span className="text-[var(--text-muted)]">&amp;</span>
                        <span className="font-medium text-[var(--text)]">{m.user2Name}</span>
                      </div>
                      {m.similarity > 0 && (
                        <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                          {(m.similarity * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{m.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cost footer — tiny, inline */}
          {stats && (
            <div className="border-t border-[var(--border)] px-5 py-2 flex items-center gap-4 text-[10px] font-mono text-[var(--text-muted)] tabular-nums flex-shrink-0 bg-[var(--bg)]">
              <span>In: {stats.totalChatInputTokens.toLocaleString()}</span>
              <span>Out: {stats.totalChatOutputTokens.toLocaleString()}</span>
              <span>Emb: {stats.totalEmbeddingTokens.toLocaleString()}</span>
              <span className="ml-auto text-[var(--text-secondary)]">${stats.totalCost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
