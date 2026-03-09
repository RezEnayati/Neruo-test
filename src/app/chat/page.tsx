"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [questionNum, setQuestionNum] = useState(0);
  const [totalQuestions] = useState(5);
  const [isComplete, setIsComplete] = useState(false);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const uid = localStorage.getItem("nm_userId");
    const uname = localStorage.getItem("nm_userName");
    if (!uid) { router.push("/"); return; }
    setUserId(uid);
    setUserName(uname || "");

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid }),
    })
      .then((r) => r.json())
      .then((data) => {
        setMessages([{ role: "assistant", content: data.response }]);
      });
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading || isComplete) return;

    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      setQuestionNum(data.questionNumber);

      if (data.isComplete) {
        setIsComplete(true);
        await fetch("/api/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        setTimeout(() => router.push("/waiting"), 2000);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const progress = (questionNum / totalQuestions) * 100;

  return (
    <main className="h-[100dvh] flex flex-col max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full border border-[var(--border-strong)] flex items-center justify-center">
            <span className="text-[10px] font-display font-bold text-[var(--text-secondary)]">N</span>
          </div>
          <span className="font-display font-semibold text-sm text-[var(--text)]">NeuroMatch</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-[var(--text-muted)]">{userName}</span>
          <span className="text-xs font-mono text-[var(--text-muted)] tabular-nums">
            {questionNum}/{totalQuestions}
          </span>
        </div>
      </header>

      {/* Progress — thin and quiet */}
      <div className="h-px bg-[var(--border)]">
        <div
          className="h-full bg-[var(--text-secondary)] transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex animate-fade-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full border border-[var(--border-strong)] flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0">
                <span className="text-[8px] font-display font-bold text-[var(--text-muted)]">N</span>
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 text-[14px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-[var(--text)] text-[var(--bg)] rounded-2xl rounded-br-md"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-2xl rounded-bl-md"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-6 h-6 rounded-full border border-[var(--border-strong)] flex items-center justify-center mr-2.5 mt-0.5 flex-shrink-0">
              <span className="text-[8px] font-display font-bold text-[var(--text-muted)]">N</span>
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] px-4 py-3.5 rounded-2xl rounded-bl-md">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"
                    style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.16}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {isComplete && (
          <div className="text-center py-4 animate-scale-in">
            <p className="text-sm text-[var(--text-secondary)]">Creating your embedding...</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-[var(--border)] pb-[env(safe-area-inset-bottom,16px)]">
        <form onSubmit={handleSend} className="flex gap-2.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isComplete ? "Complete" : "Type your answer..."}
            disabled={isComplete || loading}
            className="flex-1 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] focus:outline-none transition-colors disabled:opacity-30"
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || isComplete}
            className="px-5 py-3 bg-[var(--text)] text-[var(--bg)] rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-15 transition-opacity"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
