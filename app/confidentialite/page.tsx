import { createClient } from "@/lib/supabase/server";

export default async function PrivacyPolicyPage() {
  const supabase = await createClient();
  const { data: policy } = await supabase
    .from("privacy_policies")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="section container" style={{ maxWidth: 800 }}>
      <h1 className="mb-2">Politique de confidentialité</h1>
      {policy ? (
        <>
          <p className="text-sm text-muted-color mb-8">
            Version {policy.version} — publiée le {new Date(policy.published_at ?? policy.created_at).toLocaleDateString("fr-FR")}
          </p>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{policy.content}</div>
        </>
      ) : (
        <div className="card empty-state">
          <p className="mb-0">
            Aucune politique de confidentialité n&apos;a encore été publiée par l&apos;équipe L&apos;Auto École.
          </p>
        </div>
      )}
    </main>
  );
}
