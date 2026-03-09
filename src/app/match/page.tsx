"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchPage() {
  const [userName, setUserName] = useState("");
  const [matchName, setMatchName] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const uid = localStorage.getItem("nm_userId");
    const uname = localStorage.getItem("nm_userName");
    if (!uid) { router.push("/"); return; }
    setUserName(uname || "");

    async function fetchMatch() {
      const res = await fetch(`/api/status?userId=${uid}`);
      const data = await res.json();
      if (data.status !== "matched") { router.push("/waiting"); return; }
      setMatchName(data.matchName || "Unknown");
      setExplanation(data.matchExplanation || "");
      setLoading(false);
      setTimeout(() => setRevealed(true), 300);
    }
    fetchMatch();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Confetti — refined, fewer pieces */}
      {revealed && (
        <div className="fixed inset-0 pointer-events-none z-20">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                left: `${10 + Math.random() * 80}%`,
                top: "-2%",
                backgroundColor: ["#4ADE80", "#F59E0B", "#38BDF8", "#E8E6E1"][i % 4],
                animation: `confetti ${4 + Math.random() * 3}s ${Math.random() * 2}s ease-in forwards`,
              }}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-md text-center relative z-10 px-2">
        <p
          className="label mb-4 sm:mb-5 transition-opacity duration-500"
          style={{ opacity: revealed ? 1 : 0 }}
        >
          {userName}, your match is
        </p>

        <h1
          className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-[var(--text)] tracking-tight mb-8 sm:mb-12 break-words"
          style={{
            animation: revealed ? "reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards" : "none",
            opacity: revealed ? undefined : 0,
          }}
        >
          {matchName}
        </h1>

        {/* Explanation — no card wrapper, just content */}
        <div
          className="text-left transition-all duration-500"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(12px)",
            transitionDelay: "0.3s",
          }}
        >
          <p className="label mb-2.5">Why you matched</p>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            {explanation}
          </p>
        </div>

        <p
          className="mt-8 sm:mt-12 text-xs font-mono text-[var(--text-muted)] transition-opacity duration-500"
          style={{ opacity: revealed ? 1 : 0, transitionDelay: "0.6s" }}
        >
          cosine similarity in embedding space
        </p>
      </div>
    </main>
  );
}
