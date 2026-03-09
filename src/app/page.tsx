"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      localStorage.setItem("nm_userId", data.userId);
      localStorage.setItem("nm_userName", data.name);
      router.push("/chat");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col justify-center px-6 sm:px-12 lg:px-20">
      <div className="max-w-lg">
        <p className="label mb-5 animate-fade-up">Neural Personality Matching</p>

        <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.95] text-[var(--text)] mb-6 animate-fade-up d1">
          Find your
          <br />
          closest match.
        </h1>

        <p className="text-[var(--text-secondary)] text-lg leading-relaxed max-w-md mb-12 animate-fade-up d2">
          Answer five questions. Your responses are encoded into a
          high-dimensional vector. AI finds the person nearest to you
          in embedding space.
        </p>

        <form onSubmit={handleJoin} className="flex flex-col sm:flex-row gap-3 max-w-sm animate-fade-up d3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First name"
            maxLength={30}
            className="flex-1 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[15px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:outline-none transition-colors"
            autoFocus
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="px-6 py-3 bg-[var(--text)] text-[var(--bg)] font-medium rounded-lg text-[15px] hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
          >
            {loading ? "Joining..." : "Join Session"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-[var(--red)] text-sm animate-fade-in">{error}</p>
        )}

        <p className="mt-16 text-xs font-mono text-[var(--text-muted)] tracking-wide animate-fade-up d5">
          GPT-4o &middot; text-embedding-3-small &middot; cosine similarity
        </p>
      </div>
    </main>
  );
}
