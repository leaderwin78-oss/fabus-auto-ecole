import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";

export default async function CommunityPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const [{ data: posts }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from("posts").select("*, author:author_id(full_name, avatar_url, role)").eq("status", "published").order("created_at", { ascending: false }).limit(50),
    supabase.from("post_likes").select("post_id, user_id"),
    supabase.from("post_comments").select("*, author:author_id(full_name, avatar_url)").order("created_at", { ascending: true }),
  ]);

  const likesByPost = new Map<string, string[]>();
  for (const l of likes ?? []) {
    const arr = likesByPost.get(l.post_id) ?? [];
    arr.push(l.user_id);
    likesByPost.set(l.post_id, arr);
  }

  const commentsByPost = new Map<string, typeof comments>();
  for (const c of comments ?? []) {
    const arr = commentsByPost.get(c.post_id) ?? [];
    arr.push(c);
    commentsByPost.set(c.post_id, arr);
  }

  return (
    <main className="section container" style={{ maxWidth: 640 }}>
      <Link href="/dashboard" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour au tableau de bord
      </Link>
      <h2 className="mb-2">Communauté L&apos;Auto École</h2>
      <p className="text-muted-color mb-8">Partagez vos expériences, vos conseils et vos réussites au permis.</p>

      <PostComposer />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "2rem" }}>
        {(posts ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune publication pour l&apos;instant. Soyez le premier !</p></div>
        ) : (
          (posts ?? []).map((p) => {
            const author = Array.isArray(p.author) ? p.author[0] : p.author;
            return (
              <PostCard
                key={p.id}
                post={{ id: p.id, body: p.body, created_at: p.created_at, author_name: author?.full_name ?? "Utilisateur", author_avatar: author?.avatar_url ?? null }}
                likeCount={(likesByPost.get(p.id) ?? []).length}
                likedByMe={(likesByPost.get(p.id) ?? []).includes(userId)}
                comments={(commentsByPost.get(p.id) ?? []).map((c) => {
                  const ca = Array.isArray(c.author) ? c.author[0] : c.author;
                  return { id: c.id, body: c.body, author_name: ca?.full_name ?? "Utilisateur", created_at: c.created_at };
                })}
              />
            );
          })
        )}
      </div>
    </main>
  );
}
