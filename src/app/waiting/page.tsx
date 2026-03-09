"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function WaitingPage() {
  const [userName, setUserName] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const uid = localStorage.getItem("nm_userId");
    const uname = localStorage.getItem("nm_userName");
    if (!uid) { router.push("/"); return; }
    setUserName(uname || "");

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/status?userId=${uid}`);
        const data = await res.json();
        if (data.status === "matched") router.push("/match");
      } catch { /* ignore */ }
    }, 3000);

    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => { clearInterval(poll); clearInterval(tick); };
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        {/* Breathing ring */}
        <div className="mb-14 animate-fade-up">
          <div className="relative w-16 h-16 mx-auto">
            <div
              className="absolute inset-0 rounded-full border border-[var(--border-strong)]"
              style={{ animation: "breathe 4s ease-in-out infinite" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)]" />
            </div>
          </div>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text)] mb-3 animate-fade-up d1">
          You&apos;re in, {userName}
        </h1>
        <p className="text-[var(--text-secondary)] text-[15px] leading-relaxed mb-12 animate-fade-up d2">
          Your personality has been encoded into a{" "}
          <span className="font-mono text-[var(--text)]">1,536</span>-dimensional
          vector. Waiting for your classmates.
        </p>

        {/* Status — clean inline list, no cards */}
        <div className="space-y-3.5 text-left max-w-[260px] mx-auto animate-fade-up d3">
          {[
            { label: "Conversation analyzed", done: true },
            { label: "Embedding created", done: true },
            { label: "Waiting for match", done: false },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {step.done ? (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="flex-shrink-0">
                  <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--green)" strokeWidth="1.2" opacity="0.35" />
                  <path d="M5 7.5L7 9.5L10.5 5.5" stroke="var(--green)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <div className="w-[15px] h-[15px] flex items-center justify-center flex-shrink-0">
                  <div
                    className="w-2 h-2 rounded-full bg-[var(--amber)]"
                    style={{ animation: "breathe 2s ease-in-out infinite" }}
                  />
                </div>
              )}
              <span className={`text-sm ${step.done ? "text-[var(--text-muted)]" : "text-[var(--text)]"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-14 text-xs font-mono text-[var(--text-muted)] tabular-nums animate-fade-up d4">
          {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, "0")}
        </p>
      </div>
    </main>
  );
}
