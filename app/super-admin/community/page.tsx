import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ModerationRow } from "./ModerationRow";

export default async function CommunityModerationPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();
  const [{ data: reports }, { data: posts }] = await Promise.all([
    admin.from("post_reports").select("*, posts(id, body, status), reporter:reporter_id(full_name)").eq("resolved", false).order("created_at", { ascending: false }),
    admin.from("posts").select("*, author:author_id(full_name)").order("created_at", { ascending: false }).limit(30),
  ]);

  return (
    <>
      <h3 className="mb-4">Signalements en attente ({(reports ?? []).length})</h3>
      {(reports ?? []).length === 0 ? (
        <div className="card empty-state mb-8"><p className="mb-0">Aucun signalement en attente.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} className="mb-8">
          {(reports ?? []).map((r) => {
            const post = Array.isArray(r.posts) ? r.posts[0] : r.posts;
            const reporter = Array.isArray(r.reporter) ? r.reporter[0] : r.reporter;
            return (
              <div key={r.id} className="card card-flat">
                <p className="text-sm text-muted-color mb-2">Signalé par {reporter?.full_name} — {r.reason || "sans motif"}</p>
                <p className="mb-2">{post?.body}</p>
                {post && <ModerationRow postId={post.id} reportId={r.id} status={post.status} />}
              </div>
            );
          })}
        </div>
      )}

      <h3 className="mb-4">Publications récentes</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {(posts ?? []).map((p) => {
          const author = Array.isArray(p.author) ? p.author[0] : p.author;
          return (
            <div key={p.id} className="card card-flat flex items-center justify-between">
              <div>
                <p className="mb-0" style={{ fontWeight: 600 }}>{author?.full_name}</p>
                <p className="text-sm text-muted-color mb-0">{p.body?.slice(0, 80)}</p>
              </div>
              <ModerationRow postId={p.id} status={p.status} />
            </div>
          );
        })}
      </div>
    </>
  );
}
