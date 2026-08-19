import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InvoiceView } from "@/components/InvoiceView";

export default async function AdminInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, organizations(name, city, phone, email), profiles!invoices_student_id_fkey(full_name, phone)")
    .eq("id", invoiceId)
    .eq("organization_id", profile.organization_id ?? "")
    .single();

  if (!invoice) notFound();

  const organization = Array.isArray(invoice.organizations) ? invoice.organizations[0] : invoice.organizations;
  const student = Array.isArray(invoice.profiles) ? invoice.profiles[0] : invoice.profiles;

  return (
    <InvoiceView
      invoice={{
        number: invoice.number,
        amount_fcfa: invoice.amount_fcfa,
        issued_at: invoice.issued_at,
        organization,
        student,
      }}
    />
  );
}
