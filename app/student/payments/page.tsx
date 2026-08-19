import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PayButton } from "./PayButton";

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-warning",
  success: "",
  failed: "badge-danger",
  refunded: "badge-muted",
};

export default async function StudentPaymentsPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("student_id", userId)
    .order("created_at", { ascending: false });

  const totalPaid = (payments ?? []).filter((p) => p.status === "success").reduce((sum, p) => sum + p.amount_fcfa, 0);
  const totalPending = (payments ?? []).filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount_fcfa, 0);

  return (
    <>
      <div className="grid grid-cols-2 mb-8">
        <div className="card stat-tile">
          <div className="stat-value" style={{ color: "var(--success)" }}>{totalPaid.toLocaleString("fr-FR")} F</div>
          <div className="stat-label">Total payé</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value" style={{ color: "var(--warning)" }}>{totalPending.toLocaleString("fr-FR")} F</div>
          <div className="stat-label">En attente</div>
        </div>
      </div>

      <h3 className="mb-4">Historique des paiements</h3>
      {(payments ?? []).length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucun paiement pour l&apos;instant.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Montant</th><th>Statut</th><th>Moyen</th><th></th></tr></thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                  <td>{p.amount_fcfa.toLocaleString("fr-FR")} F CFA</td>
                  <td><span className={`badge ${STATUS_BADGE[p.status]}`}>{p.status}</span></td>
                  <td>{p.provider}</td>
                  <td>{p.status === "pending" && <PayButton paymentId={p.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
