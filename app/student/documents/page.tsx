import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UploadDocumentForm } from "./UploadDocumentForm";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-muted",
  submitted: "badge-info",
  validated: "",
  rejected: "badge-danger",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "À fournir",
  submitted: "Envoyé, en attente de validation",
  validated: "Validé",
  rejected: "Rejeté — à renvoyer",
};

export default async function StudentDocumentsPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="grid grid-cols-2">
      <div>
        <h3 className="mb-4">Mon dossier administratif</h3>
        {(documents ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucun document envoyé pour l&apos;instant.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(documents ?? []).map((d) => (
              <div key={d.id} className="card card-flat flex items-center justify-between">
                <div>
                  <p className="mb-0" style={{ fontWeight: 600 }}>{d.title}</p>
                  <span className="text-sm text-muted-color">{d.category}</span>
                </div>
                <span className={`badge ${STATUS_BADGE[d.status]}`}>{STATUS_LABEL[d.status]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-4">Ajouter un document</h3>
        <UploadDocumentForm />
      </div>
    </div>
  );
}
