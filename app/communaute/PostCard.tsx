"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleLike, addComment, reportPost } from "@/lib/actions/community";

interface Comment {
  id: string;
  body: string;
  author_name: string;
  created_at: string;
}

interface PostData {
  id: string;
  body: string | null;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}

export function PostCard({
  post,
  likeCount,
  likedByMe,
  comments,
}: {
  post: PostData;
  likeCount: number;
  likedByMe: boolean;
  comments: Comment[];
}) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function like() {
    startTransition(async () => {
      await toggleLike(post.id);
      router.refresh();
    });
  }

  function submitComment() {
    if (!draft.trim()) return;
    const fd = new FormData();
    fd.set("post_id", post.id);
    fd.set("body", draft);
    startTransition(async () => {
      await addComment(fd);
      setDraft("");
      router.refresh();
    });
  }

  function report() {
    const reason = window.prompt("Pourquoi signalez-vous cette publication ?");
    if (reason === null) return;
    startTransition(async () => { await reportPost(post.id, reason); });
  }

  function shareUrl() {
    return `${window.location.origin}/communaute#post-${post.id}`;
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${post.author_name} sur L'Auto École : ${shareUrl()}`)}`, "_blank");
  }

  function copyLink() {
    navigator.clipboard.writeText(shareUrl());
  }

  return (
    <div className="card" id={`post-${post.id}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="avatar" style={{ width: 40, height: 40, fontSize: "0.9rem" }}>{post.author_name.charAt(0).toUpperCase()}</div>
        <div>
          <p className="mb-0" style={{ fontWeight: 600 }}>{post.author_name}</p>
          <span className="text-sm text-muted-color">{new Date(post.created_at).toLocaleString("fr-FR")}</span>
        </div>
      </div>

      <p className="mb-4" style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>

      <div className="flex items-center gap-4" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
        <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={like}>
          <i className={`fa-${likedByMe ? "solid" : "regular"} fa-heart`} style={{ color: likedByMe ? "var(--danger)" : undefined }}></i> {likeCount}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowComments((s) => !s)}>
          <i className="fa-regular fa-comment"></i> {comments.length}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={shareWhatsApp} title="Partager sur WhatsApp">
          <i className="fa-brands fa-whatsapp"></i>
        </button>
        <button className="btn btn-secondary btn-sm" onClick={copyLink} title="Copier le lien">
          <i className="fa-solid fa-link"></i>
        </button>
        <button className="btn btn-outline btn-sm" style={{ marginLeft: "auto" }} onClick={report}>
          <i className="fa-solid fa-flag"></i>
        </button>
      </div>

      {showComments && (
        <div className="mt-4" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
          {comments.map((c) => (
            <div key={c.id} className="mb-2 text-sm">
              <strong>{c.author_name}</strong> — {c.body}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitComment()}
              placeholder="Ajouter un commentaire..."
              style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
            />
            <button className="btn btn-primary btn-sm" disabled={isPending} onClick={submitComment}>Envoyer</button>
          </div>
        </div>
      )}
    </div>
  );
}
