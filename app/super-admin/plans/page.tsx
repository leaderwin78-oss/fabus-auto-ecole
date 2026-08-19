import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PlanForm } from "./PlanForm";

export default async function SuperAdminPlansPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const supabase = await createClient();
  const { data: plans } = await supabase.from("plans").select("*").order("price_fcfa");

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Plans SaaS</h3>
        {(plans ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucun plan défini.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(plans ?? []).map((p) => (
              <div key={p.id} className="card card-flat flex items-center justify-between">
                <div>
                  <p className="mb-0" style={{ fontWeight: 600 }}>{p.name} <span className="text-sm text-muted-color">({p.code})</span></p>
                  <span className="text-sm text-muted-color">
                    {p.price_fcfa.toLocaleString("fr-FR")} F/mois • {p.max_instructors ?? "∞"} moniteurs • {p.max_students ?? "∞"} élèves
                  </span>
                </div>
                <span className={`badge ${p.is_active ? "" : "badge-muted"}`}>{p.is_active ? "Actif" : "Inactif"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <PlanForm />
    </div>
  );
}
