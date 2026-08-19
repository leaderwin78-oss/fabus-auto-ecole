import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
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
  { href: "/admin/settings", label: "Paramètres", icon: "fa-solid fa-gear" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireProfile();

  return (
    <AppShell profile={profile} userId={userId} navItems={NAV_ITEMS} title="Espace Administrateur">
      {children}
    </AppShell>
  );
}
