import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateResourceForm } from "./CreateResourceForm";
import { DeleteResourceButton } from "./DeleteResourceButton";

const CATEGORIES: Record<string, string> = {
  securite_routiere: "Sécurité routière",
  reglementation: "Réglementation",
  organismes_officiels: "Organismes officiels",
  pedagogie: "Documentation pédagogique",
  mecanique: "Mécanique",
  premiers_secours: "Premiers secours",
  signalisation: "Signalisation",
  autre: "Autre",
};

export default async function ResourceLibraryAdminPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const supabase = await createClient();
  const { data: resources } = await supabase.from("resource_links").select("*").order("category").order("title");

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Bibliothèque pédagogique</h3>
        {(resources ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune ressource pour l&apos;instant.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {(resources ?? []).map((r) => (
              <div key={r.id} className="card card-flat flex items-center justify-between">
                <div>
                  <span className="badge badge-muted mb-1">{CATEGORIES[r.category] ?? r.category}</span>
                  <p className="mb-0"><a href={r.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>{r.title}</a></p>
                </div>
                <DeleteResourceButton id={r.id} />
              </div>
            ))}
          </div>
        )}
      </div>
      <CreateResourceForm categories={CATEGORIES} />
    </div>
  );
}
