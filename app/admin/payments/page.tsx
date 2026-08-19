import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreatePaymentForm } from "./CreatePaymentForm";
import { MarkPaidButton } from "./MarkPaidButton";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-warning",
  success: "",
  failed: "badge-danger",
  refunded: "badge-muted",
};

export default async function AdminPaymentsPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const orgId = profile.organization_id ?? "";

  const [{ data: payments }, { data: students }, { data: invoices }] = await Promise.all([
    supabase.from("payments").select("*, student:student_id(full_name)").eq("organization_id", orgId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("organization_id", orgId).eq("role", "student").order("full_name"),
    supabase.from("invoices").select("id, payment_id").eq("organization_id", orgId),
  ]);

  const invoiceByPayment = new Map((invoices ?? []).map((i) => [i.payment_id, i.id]));

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Paiements</h3>
        {(payments ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucun paiement enregistré.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Élève</th><th>Montant</th><th>Statut</th><th>Moyen</th><th></th></tr></thead>
              <tbody>
                {(payments ?? []).map((p) => {
                  const student = Array.isArray(p.student) ? p.student[0] : p.student;
                  const invoiceId = invoiceByPayment.get(p.id);
                  return (
                    <tr key={p.id}>
                      <td>{student?.full_name ?? "—"}</td>
                      <td>{p.amount_fcfa.toLocaleString("fr-FR")} F</td>
                      <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                      <td>{p.provider}</td>
                      <td className="flex gap-2">
                        {p.status === "pending" && <MarkPaidButton paymentId={p.id} />}
                        {invoiceId && <Link href={`/admin/invoices/${invoiceId}`} className="btn btn-secondary btn-sm">Facture</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CreatePaymentForm students={students ?? []} />
    </div>
  );
}
