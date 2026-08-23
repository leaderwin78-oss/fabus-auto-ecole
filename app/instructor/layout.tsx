import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import type { NavItem } from "@/components/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { href: "/instructor", label: "Tableau de bord", icon: "fa-solid fa-house" },
  { href: "/instructor/students", label: "Mes Élèves", icon: "fa-solid fa-user-graduate" },
  { href: "/instructor/calendar", label: "Calendrier", icon: "fa-solid fa-calendar-days" },
  { href: "/instructor/messages", label: "Messages", icon: "fa-solid fa-message" },
  { href: "/communaute", label: "Communauté", icon: "fa-solid fa-users" },
  { href: "/account", label: "Mon compte", icon: "fa-solid fa-user-gear" },
];

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireProfile();

  return (
    <AppShell profile={profile} userId={userId} navItems={NAV_ITEMS} title={`Bonjour ${profile.full_name.split(" ")[0]} 👋`}>
      {children}
    </AppShell>
  );
}
