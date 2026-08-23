"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { callAssistant, type ChatMessage } from "@/lib/ai/anthropic";

const BASE_RULES = `Tu es l'assistant IA de la plateforme L'Auto École (auto-écoles au Sénégal).
Règles strictes :
- Tu n'as accès qu'aux données listées ci-dessous, rien d'autre. Ne prétends jamais avoir accès à Google, à internet, ou à des données non listées ici.
- Tu ne peux JAMAIS exécuter d'action toi-même (pas de suppression, modification, envoi) — tu peux seulement rédiger un brouillon ou une suggestion que l'utilisateur devra valider lui-même dans l'interface.
- Réponds en français, de façon concise et actionnable.
- Distingue toujours clairement une information pédagogique (ton avis, une explication) d'une information réglementaire officielle (que l'utilisateur doit vérifier auprès d'une source officielle).
- Tu ne es pas une autorité officielle du code de la route.`;

async function buildContext(role: string, userId: string, organizationId: string | null): Promise<string> {
  const supabase = await createClient();

  if (role === "super_admin") {
    const admin = createAdminClient();
    const [{ count: orgCount }, { count: pendingCount }, { count: studentCount }, { data: expiringSubs }] = await Promise.all([
      admin.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("organizations").select("id", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      admin.from("subscriptions").select("organization_id, trial_end, status").eq("status", "trialing").lte("trial_end", new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()),
    ]);
    return `Données de la plateforme :
- Auto-écoles actives : ${orgCount ?? 0}
- Demandes d'inscription en attente : ${pendingCount ?? 0}
- Élèves au total : ${studentCount ?? 0}
- Essais gratuits expirant sous 14 jours : ${(expiringSubs ?? []).length}`;
  }

  if (role === "admin" || role === "admin_auto_ecole") {
    const [{ count: studentCount }, { count: instructorCount }, { data: pendingPayments }, { data: upcoming }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("role", "student"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", organizationId ?? "").eq("role", "instructor"),
      supabase.from("payments").select("amount_fcfa").eq("organization_id", organizationId ?? "").eq("status", "pending"),
      supabase.from("appointments").select("id").eq("organization_id", organizationId ?? "").gte("start_time", new Date().toISOString()).limit(50),
    ]);
    const pendingTotal = (pendingPayments ?? []).reduce((s, p) => s + p.amount_fcfa, 0);
    return `Données de votre auto-école :
- Élèves : ${studentCount ?? 0}
- Moniteurs : ${instructorCount ?? 0}
- Paiements en attente : ${(pendingPayments ?? []).length} (${pendingTotal.toLocaleString("fr-FR")} F CFA)
- Séances à venir : ${(upcoming ?? []).length}`;
  }

  if (role === "instructor") {
    const [{ count: studentCount }, { data: upcoming }] = await Promise.all([
      supabase.from("appointments").select("student_id", { count: "exact", head: true }).eq("instructor_id", userId).not("student_id", "is", null),
      supabase.from("appointments").select("title, start_time").eq("instructor_id", userId).gte("start_time", new Date().toISOString()).order("start_time").limit(5),
    ]);
    return `Vos données :
- Élèves suivis : ${studentCount ?? 0}
- Prochaines séances : ${(upcoming ?? []).map((a) => `${a.title} (${new Date(a.start_time).toLocaleDateString("fr-FR")})`).join(", ") || "aucune"}`;
  }

  // student
  const [{ data: enrollments }, { data: nextAppointment }, { data: pendingPayments }] = await Promise.all([
    supabase.from("enrollments").select("courses(title)").eq("student_id", userId).eq("status", "active"),
    supabase.from("appointments").select("title, start_time").eq("student_id", userId).gte("start_time", new Date().toISOString()).order("start_time").limit(1).maybeSingle(),
    supabase.from("payments").select("amount_fcfa").eq("student_id", userId).eq("status", "pending"),
  ]);
  const courseTitles = (enrollments ?? []).map((e) => {
    const c = Array.isArray(e.courses) ? e.courses[0] : e.courses;
    return c?.title;
  }).filter(Boolean);
  const pendingTotal = (pendingPayments ?? []).reduce((s, p) => s + p.amount_fcfa, 0);
  return `Vos données :
- Formations en cours : ${courseTitles.join(", ") || "aucune"}
- Prochain rendez-vous : ${nextAppointment ? `${nextAppointment.title} le ${new Date(nextAppointment.start_time).toLocaleDateString("fr-FR")}` : "aucun"}
- Paiement en attente : ${pendingTotal > 0 ? `${pendingTotal.toLocaleString("fr-FR")} F CFA` : "aucun"}`;
}

// Chaque appel coûte de l'argent à la plateforme : sans plafond, un compte
// gratuit créé en trente secondes peut boucler dessus et faire exploser la
// facture. Le compteur vit en base (voir consume_ai_quota dans
// 0010_security_hardening.sql) et non en mémoire : Vercel est sans état, un
// compteur en mémoire serait remis à zéro à chaque déploiement.
const MAX_APPELS_PAR_HEURE = 20;
const MAX_CARACTERES_CONVERSATION = 8000;
const MAX_MESSAGES = 10;

export async function askAssistant(history: ChatMessage[]): Promise<{ ok: boolean; reply?: string; error?: string }> {
  const { userId, profile } = await requireProfile();

  // L'historique vient du navigateur : il faut le borner avant de le payer.
  if (!Array.isArray(history) || history.length === 0) {
    return { ok: false, error: "Message vide." };
  }
  const recent = history.slice(-MAX_MESSAGES).filter(
    (m) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string" && m.content.trim().length > 0
  );
  if (recent.length === 0) {
    return { ok: false, error: "Message vide." };
  }
  const totalChars = recent.reduce((n, m) => n + m.content.length, 0);
  if (totalChars > MAX_CARACTERES_CONVERSATION) {
    return { ok: false, error: "Conversation trop longue. Rechargez la page pour repartir sur un échange neuf." };
  }

  const supabase = await createClient();
  const { data: allowed, error: quotaError } = await supabase.rpc("consume_ai_quota", { p_max: MAX_APPELS_PAR_HEURE });
  if (quotaError) {
    return { ok: false, error: "Assistant momentanément indisponible." };
  }
  if (!allowed) {
    return {
      ok: false,
      error: `Vous avez atteint la limite de ${MAX_APPELS_PAR_HEURE} questions par heure. Réessayez un peu plus tard.`,
    };
  }

  const context = await buildContext(profile.role, userId, profile.organization_id);

  const systemPrompt = `${BASE_RULES}

Rôle de l'utilisateur : ${profile.role}
${context}`;

  return callAssistant(systemPrompt, recent);
}
