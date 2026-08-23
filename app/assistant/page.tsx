import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { AssistantChat } from "./AssistantChat";

const ROLE_GREETING: Record<string, string> = {
  super_admin: "Je peux vous aider à analyser la plateforme, les paiements et les auto-écoles.",
  admin: "Je peux vous aider à gérer vos élèves, vos cours et vos statistiques.",
  admin_auto_ecole: "Je peux vous aider à gérer vos élèves, vos cours et vos statistiques.",
  instructor: "Je peux vous aider à préparer vos cours, exercices et quiz.",
  student: "Je peux vous aider à réviser et comprendre vos cours.",
};

export default async function AssistantPage() {
  const { profile } = await requireProfile();

  return (
    <main className="section container" style={{ maxWidth: 700 }}>
      <Link href="/dashboard" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour au tableau de bord
      </Link>
      <h2 className="mb-2">🤖 Assistant IA</h2>
      <p className="text-muted-color mb-8">{ROLE_GREETING[profile.role] ?? "Comment puis-je vous aider ?"}</p>

      <AssistantChat />
    </main>
  );
}
