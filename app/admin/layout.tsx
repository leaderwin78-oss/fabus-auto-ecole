import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { coursVideoEnCours } from "@/lib/data/session";
import { lireAbonnement } from "@/lib/data/abonnement";
import { BandeauAbonnement } from "@/components/BandeauAbonnement";
import type { NavItem } from "@/components/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: "fa-solid fa-house" },
  { href: "/admin/students", label: "Élèves", icon: "fa-solid fa-user-graduate" },
  { href: "/admin/instructors", label: "Moniteurs", icon: "fa-solid fa-chalkboard-user" },
  { href: "/admin/courses", label: "Formations", icon: "fa-solid fa-book" },
  { href: "/admin/quizzes", label: "Quiz & Examens", icon: "fa-solid fa-circle-question" },
  { href: "/admin/calendar", label: "Calendrier", icon: "fa-solid fa-calendar-days" },
  { href: "/admin/payments", label: "Paiements", icon: "fa-solid fa-credit-card" },
  { href: "/admin/messages", label: "Messages", icon: "fa-solid fa-message" },
  { href: "/communaute", label: "Communauté", icon: "fa-solid fa-users" },
  { href: "/assistant", label: "Assistant IA", icon: "fa-solid fa-robot" },
  { href: "/admin/settings", label: "Paramètres", icon: "fa-solid fa-gear" },
  { href: "/account", label: "Mon compte", icon: "fa-solid fa-user-gear" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();
  const [videoEnCours, abonnement] = await Promise.all([
    coursVideoEnCours(supabase, userId),
    lireAbonnement(supabase, profile.organization_id),
  ]);

  return (
    <AppShell videoEnCours={videoEnCours} profile={profile} userId={userId} navItems={NAV_ITEMS} title="Espace Administrateur">
      <BandeauAbonnement abonnement={abonnement} />
      {children}
    </AppShell>
  );
}
