import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateAnnouncementForm } from "./CreateAnnouncementForm";
import { AnnouncementStatusSelect } from "./AnnouncementStatusSelect";

export default async function AnnouncementsAdminPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const supabase = await createClient();
  const { data: announcements } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Annonces officielles</h3>
        {(announcements ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune annonce.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(announcements ?? []).map((a) => (
              <div key={a.id} className="card card-flat flex items-center justify-between">
                <div>
                  <p className="mb-0" style={{ fontWeight: 600 }}>{a.title}</p>
                  <span className="text-sm text-muted-color">{a.category}</span>
                </div>
                <AnnouncementStatusSelect id={a.id} status={a.status} />
              </div>
            ))}
          </div>
        )}
      </div>
      <CreateAnnouncementForm />
    </div>
  );
}
