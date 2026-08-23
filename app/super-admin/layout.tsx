import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import type { NavItem } from "@/components/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { href: "/super-admin", label: "Vue globale", icon: "fa-solid fa-house" },
  { href: "/super-admin/organizations", label: "Auto-écoles", icon: "fa-solid fa-building" },
  { href: "/super-admin/plans", label: "Plans SaaS", icon: "fa-solid fa-layer-group" },
  { href: "/super-admin/finance", label: "Finances", icon: "fa-solid fa-sack-dollar" },
  { href: "/super-admin/resources", label: "Bibliothèque", icon: "fa-solid fa-book-open" },
  { href: "/super-admin/announcements", label: "Annonces", icon: "fa-solid fa-bullhorn" },
  { href: "/super-admin/privacy-policy", label: "Confidentialité", icon: "fa-solid fa-file-shield" },
  { href: "/communaute", label: "Communauté", icon: "fa-solid fa-users" },
  { href: "/assistant", label: "Assistant IA", icon: "fa-solid fa-robot" },
  { href: "/super-admin/community", label: "Modération", icon: "fa-solid fa-gavel" },
  { href: "/super-admin/audit-log", label: "Journal d'activité", icon: "fa-solid fa-list-check" },
  { href: "/account", label: "Mon compte", icon: "fa-solid fa-user-gear" },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireProfile();
  // Defense in depth alongside middleware.ts's role-area gate — every
  // page under this layout inherits the check from here.
  if (profile.role !== "super_admin") redirect("/login");

  return (
    <AppShell profile={profile} userId={userId} navItems={NAV_ITEMS} title="Super Admin — L'Auto École">
      {children}
    </AppShell>
  );
}
