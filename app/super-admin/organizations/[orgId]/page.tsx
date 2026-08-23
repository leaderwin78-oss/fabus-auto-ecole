import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApprovalButtons } from "./ApprovalButtons";

export default async function OrganizationReviewPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();
  const { data: org } = await admin.from("organizations").select("*").eq("id", orgId).single();
  if (!org) notFound();

  const [{ count: studentCount }, { count: instructorCount }, { count: courseCount }] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("role", "student"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("role", "instructor"),
    admin.from("courses").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);

  const pricing = org.pricing ?? {};
  const equipment = org.equipment ?? {};

  return (
    <>
      <Link href="/super-admin/organizations" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour
      </Link>
      <div className="flex justify-between items-start mb-8" style={{ flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 className="mb-2">{org.name}</h2>
          <span className={`badge ${org.status === "pending" ? "badge-warning" : org.status === "active" ? "" : "badge-danger"}`}>{org.status}</span>
        </div>
        {org.status === "pending" && <ApprovalButtons orgId={org.id} />}
      </div>

      <div className="grid grid-cols-3 mb-8">
        <div className="card stat-tile"><div className="stat-value">{studentCount ?? 0}</div><div className="stat-label">Élèves</div></div>
        <div className="card stat-tile"><div className="stat-value">{instructorCount ?? 0}</div><div className="stat-label">Moniteurs</div></div>
        <div className="card stat-tile"><div className="stat-value">{courseCount ?? 0}</div><div className="stat-label">Formations</div></div>
      </div>

      <div className="grid grid-cols-2">
        <div className="card mb-4">
          <h4 className="mb-4">Informations générales</h4>
          <p className="text-sm mb-2"><strong>Responsable :</strong> {org.responsable_name ?? "—"}</p>
          <p className="text-sm mb-2"><strong>Téléphone :</strong> {org.phone ?? "—"}</p>
          <p className="text-sm mb-2"><strong>Email :</strong> {org.email ?? "—"}</p>
          <p className="text-sm mb-2"><strong>Adresse :</strong> {org.address ?? "—"} {org.quartier ? `, ${org.quartier}` : ""}</p>
          <p className="text-sm mb-2"><strong>Ville / Région :</strong> {org.city ?? "—"} / {org.region ?? "—"}</p>
          <p className="text-sm mb-0"><strong>N° identification :</strong> {org.id_number ?? "—"}</p>
        </div>

        <div className="card mb-4">
          <h4 className="mb-4">Services & tarifs</h4>
          <p className="text-sm mb-2"><strong>Services :</strong> {(org.services ?? []).join(", ") || "—"}</p>
          <p className="text-sm mb-2"><strong>Prix inscription :</strong> {pricing.inscription ? `${pricing.inscription.toLocaleString("fr-FR")} F` : "—"}</p>
          <p className="text-sm mb-2"><strong>Prix permis :</strong> {pricing.permis ? `${pricing.permis.toLocaleString("fr-FR")} F` : "—"}</p>
          <p className="text-sm mb-0"><strong>Prix perfectionnement :</strong> {pricing.perfectionnement ? `${pricing.perfectionnement.toLocaleString("fr-FR")} F` : "—"}</p>
        </div>

        <div className="card mb-4">
          <h4 className="mb-4">Équipements</h4>
          <p className="text-sm mb-2"><strong>Véhicules :</strong> {equipment.vehicules ?? "—"}</p>
          <p className="text-sm mb-2"><strong>Simulateurs :</strong> {equipment.simulateurs ?? "—"}</p>
          <p className="text-sm mb-0"><strong>Salles :</strong> {equipment.salles ?? "—"}</p>
        </div>

        <div className="card mb-4">
          <h4 className="mb-4">Description</h4>
          <p className="text-sm mb-0">{org.description ?? "—"}</p>
        </div>
      </div>

      {org.rejection_reason && (
        <div className="form-error-banner">Motif de rejet précédent : {org.rejection_reason}</div>
      )}
    </>
  );
}
