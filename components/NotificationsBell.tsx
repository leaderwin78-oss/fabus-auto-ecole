"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/types/database";

export function NotificationsBell({ userId }: { userId: string }) {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setNotifications(data ?? []));
  }, [supabase, userId]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="notification-btn"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) markAllRead();
        }}
        style={{
          background: "white", border: "1px solid var(--border-color)", width: 40, height: 40, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", color: "var(--text-secondary)",
        }}
        aria-label="Notifications"
      >
        <i className="fa-solid fa-bell"></i>
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: -2, right: -2, width: 12, height: 12, background: "var(--danger)", borderRadius: "50%", border: "2px solid white" }}></span>
        )}
      </button>

      {open && (
        <div
          className="card"
          style={{ position: "absolute", right: 0, top: "3rem", width: 340, maxHeight: 420, overflowY: "auto", zIndex: 50, padding: "1rem" }}
        >
          <h4 className="mb-4" style={{ fontSize: "1rem" }}>Notifications</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-color mb-0">Aucune notification pour le moment.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {notifications.map((n) => (
                <div key={n.id} style={{ paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                  <p className="mb-0" style={{ fontWeight: 600, fontSize: "0.875rem" }}>{n.title}</p>
                  {n.body && <p className="text-sm text-muted-color mb-0">{n.body}</p>}
                  <span className="text-sm text-muted-color">{new Date(n.created_at).toLocaleString("fr-FR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
