import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreatePolicyForm } from "./CreatePolicyForm";
import { PublishButton } from "./PublishButton";

export default async function PrivacyPolicyAdminPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const supabase = await createClient();
  const { data: policies } = await supabase.from("privacy_policies").select("*").order("created_at", { ascending: false });

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Versions de la politique de confidentialité</h3>
        {(policies ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune version créée.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(policies ?? []).map((p) => (
              <div key={p.id} className="card card-flat flex items-center justify-between">
                <div>
                  <p className="mb-0" style={{ fontWeight: 600 }}>{p.title} — v{p.version}</p>
                  <span className="text-sm text-muted-color">{p.status}</span>
                </div>
                {p.status !== "published" && <PublishButton policyId={p.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
      <CreatePolicyForm />
    </div>
  );
}
