"use client";

import { useState } from "react";
import { askAssistant } from "@/lib/actions/assistant";
import type { ChatMessage } from "@/lib/ai/anthropic";

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!draft.trim() || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: draft }];
    setMessages(next);
    setDraft("");
    setError(null);
    setLoading(true);

    const result = await askAssistant(next);
    setLoading(false);

    if (!result.ok) {
      setError(result.error ?? "Erreur");
      return;
    }
    setMessages([...next, { role: "assistant", content: result.reply ?? "" }]);
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: 500 }}>
      {error && <div className="form-error-banner">{error}</div>}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {messages.length === 0 && !error && (
          <p className="text-sm text-muted-color">Posez votre première question ci-dessous.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "var(--fabus-green)" : "var(--bg-tertiary)",
              color: m.role === "user" ? "white" : "var(--text-primary)",
              padding: "0.65rem 1rem",
              borderRadius: "var(--radius-lg)",
              maxWidth: "85%",
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-sm text-muted-color">L&apos;assistant réfléchit...</p>}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Écrire un message..."
          disabled={loading}
          style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
        />
        <button className="btn btn-primary" onClick={send} disabled={loading}>Envoyer</button>
      </div>
    </div>
  );
}
