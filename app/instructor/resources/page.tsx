import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

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

export default async function InstructorResourcesPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data: resources } = await supabase.from("resource_links").select("*").order("category").order("title");

  const byCategory = new Map<string, typeof resources>();
  for (const r of resources ?? []) {
    const arr = byCategory.get(r.category) ?? [];
    arr.push(r);
    byCategory.set(r.category, arr);
  }

  return (
    <>
      <h3 className="mb-4">Bibliothèque pédagogique</h3>
      <p className="text-muted-color mb-8">Ressources sélectionnées par L&apos;Auto École pour préparer vos cours.</p>
      {byCategory.size === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucune ressource disponible pour l&apos;instant.</p></div>
      ) : (
        Array.from(byCategory.entries()).map(([category, items]) => (
          <div key={category} className="mb-8">
            <h4 className="mb-4">{CATEGORIES[category] ?? category}</h4>
            <div className="grid grid-cols-3">
              {(items ?? []).map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="card">
                  <p className="mb-2" style={{ fontWeight: 600 }}>{r.title}</p>
                  {r.description && <p className="text-sm text-muted-color mb-0">{r.description}</p>}
                </a>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}
