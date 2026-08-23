import { createClient } from "@/lib/supabase/server";

const CATEGORY_LABEL: Record<string, string> = {
  annonce: "Annonce",
  examen: "Date d'examen",
  reglementation: "Réglementation",
  pedagogique: "Information pédagogique",
};

export default async function AnnouncementsPage() {
  const supabase = await createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return (
    <main className="section container" style={{ maxWidth: 800 }}>
      <h1 className="mb-8">Annonces officielles</h1>
      {(announcements ?? []).length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucune annonce pour l&apos;instant.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {(announcements ?? []).map((a) => (
            <div key={a.id} className="card">
              <span className="badge mb-2">{CATEGORY_LABEL[a.category] ?? a.category}</span>
              <h3 className="mb-2">{a.title}</h3>
              <p className="text-sm text-muted-color mb-4">{new Date(a.published_at ?? a.created_at).toLocaleDateString("fr-FR")}</p>
              <p className="mb-0" style={{ whiteSpace: "pre-wrap" }}>{a.content}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
