"use client";

interface InvoiceData {
  number: string;
  amount_fcfa: number;
  issued_at: string;
  organization: { name: string; city: string | null; phone: string | null; email: string | null };
  student: { full_name: string; phone: string | null };
}

export function InvoiceView({ invoice }: { invoice: InvoiceData }) {
  return (
    <div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .invoice-card { border: none !important; box-shadow: none !important; }
        }
      `}</style>

      <div className="no-print mb-4">
        <button className="btn btn-primary" onClick={() => window.print()}>
          <i className="fa-solid fa-print"></i> Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="card invoice-card" style={{ maxWidth: 640, margin: "0 auto", padding: "3rem" }}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="mb-0" style={{ color: "var(--fabus-green)" }}>{invoice.organization.name}</h2>
            <p className="text-sm text-muted-color mb-0">{invoice.organization.city}</p>
            {invoice.organization.phone && <p className="text-sm text-muted-color mb-0">{invoice.organization.phone}</p>}
            {invoice.organization.email && <p className="text-sm text-muted-color mb-0">{invoice.organization.email}</p>}
          </div>
          <div className="text-right">
            <h3 className="mb-0">FACTURE</h3>
            <p className="text-sm text-muted-color mb-0">{invoice.number}</p>
            <p className="text-sm text-muted-color mb-0">{new Date(invoice.issued_at).toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-muted-color mb-2">Facturé à</p>
          <p className="mb-0" style={{ fontWeight: 600 }}>{invoice.student.full_name}</p>
          {invoice.student.phone && <p className="text-sm text-muted-color mb-0">{invoice.student.phone}</p>}
        </div>

        <table className="data-table w-full mb-8">
          <thead><tr><th>Description</th><th style={{ textAlign: "right" }}>Montant</th></tr></thead>
          <tbody>
            <tr>
              <td>Frais de formation — auto-école</td>
              <td style={{ textAlign: "right" }}>{invoice.amount_fcfa.toLocaleString("fr-FR")} F CFA</td>
            </tr>
          </tbody>
        </table>

        <div className="flex justify-between items-center" style={{ borderTop: "2px solid var(--text-primary)", paddingTop: "1rem" }}>
          <span style={{ fontWeight: 700 }}>Total payé</span>
          <span style={{ fontWeight: 800, fontSize: "1.5rem", color: "var(--fabus-green)" }}>
            {invoice.amount_fcfa.toLocaleString("fr-FR")} F CFA
          </span>
        </div>
      </div>
    </div>
  );
}
