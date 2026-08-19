"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { startConversation, sendMessage } from "@/lib/actions/messages";

interface Contact {
  id: string;
  full_name: string;
  role: string;
}

interface ConversationSummary {
  id: string;
  otherName: string;
  lastMessage: string | null;
  lastAt: string | null;
}

interface Msg {
  id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
}

export function MessagingPanel({ userId, contacts }: { userId: string; contacts: Contact[] }) {
  const supabase = createClient();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  async function loadConversations() {
    const { data: participantRows } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", userId);
    const ids = (participantRows ?? []).map((r) => r.conversation_id);
    if (ids.length === 0) return setConversations([]);

    const { data: others } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, profiles(full_name)")
      .in("conversation_id", ids)
      .neq("user_id", userId);

    const { data: lastMessages } = await supabase
      .from("messages")
      .select("conversation_id, body, created_at")
      .in("conversation_id", ids)
      .order("created_at", { ascending: false });

    const summaries: ConversationSummary[] = (others ?? []).map((o) => {
      const profileData = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      const last = (lastMessages ?? []).find((m) => m.conversation_id === o.conversation_id);
      return {
        id: o.conversation_id,
        otherName: profileData?.full_name ?? "Utilisateur",
        lastMessage: last?.body ?? null,
        lastAt: last?.created_at ?? null,
      };
    });
    setConversations(summaries);
  }

  async function loadMessages(conversationId: string) {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
    setMessages(data ?? []);
  }

  useEffect(() => {
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  function openContact(contactId: string) {
    startTransition(async () => {
      const result = await startConversation(contactId);
      if (result.ok && result.conversationId) {
        await loadConversations();
        setActiveId(result.conversationId);
      }
    });
  }

  function handleSend() {
    if (!activeId || !draft.trim()) return;
    const body = draft;
    setDraft("");
    startTransition(async () => {
      await sendMessage(activeId, body);
      await loadMessages(activeId);
      await loadConversations();
    });
  }

  return (
    <div className="grid grid-cols-3" style={{ gridTemplateColumns: "280px 1fr", alignItems: "start" }}>
      <div className="card card-flat" style={{ padding: "1rem" }}>
        <h4 className="mb-4" style={{ fontSize: "1rem" }}>Conversations</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className="nav-item"
              style={{ background: activeId === c.id ? "rgba(5,150,105,0.08)" : "none", border: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{c.otherName}</div>
                {c.lastMessage && <div className="text-sm text-muted-color">{c.lastMessage.slice(0, 30)}</div>}
              </div>
            </button>
          ))}
          {conversations.length === 0 && <p className="text-sm text-muted-color">Aucune conversation.</p>}
        </div>

        <h4 className="mb-2" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>Démarrer une conversation</h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => openContact(c.id)}
              disabled={isPending}
              className="btn btn-outline btn-sm w-full"
              style={{ justifyContent: "flex-start" }}
            >
              {c.full_name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column", height: 480 }}>
        {!activeId ? (
          <div className="empty-state" style={{ margin: "auto" }}><p className="mb-0">Sélectionnez une conversation.</p></div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.sender_id === userId ? "flex-end" : "flex-start",
                    background: m.sender_id === userId ? "var(--fabus-green)" : "var(--bg-tertiary)",
                    color: m.sender_id === userId ? "white" : "var(--text-primary)",
                    padding: "0.6rem 0.9rem",
                    borderRadius: "var(--radius-lg)",
                    maxWidth: "75%",
                  }}
                >
                  {m.body}
                </div>
              ))}
              {messages.length === 0 && <p className="text-sm text-muted-color">Envoyez le premier message.</p>}
            </div>
            <div className="flex gap-2 mt-4">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Écrire un message..."
                style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
              />
              <button className="btn btn-primary" onClick={handleSend} disabled={isPending}>Envoyer</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
