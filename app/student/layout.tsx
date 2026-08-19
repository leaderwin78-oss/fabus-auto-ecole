import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import type { NavItem } from "@/components/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { href: "/student", label: "Tableau de bord", icon: "fa-solid fa-house" },
  { href: "/student/courses", label: "Mes Cours", icon: "fa-solid fa-book" },
  { href: "/student/calendar", label: "Calendrier", icon: "fa-solid fa-calendar-days" },
  { href: "/student/documents", label: "Mon Dossier Admin", icon: "fa-solid fa-folder-open" },
  { href: "/student/quizzes", label: "Quiz & Examens", icon: "fa-solid fa-circle-question" },
  { href: "/student/payments", label: "Paiements", icon: "fa-solid fa-credit-card" },
  { href: "/student/messages", label: "Messages", icon: "fa-solid fa-message" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireProfile();

  return (
    <AppShell profile={profile} userId={userId} navItems={NAV_ITEMS} title={`Bonjour ${profile.full_name.split(" ")[0]} 👋`}>
      {children}
    </AppShell>
  );
}
