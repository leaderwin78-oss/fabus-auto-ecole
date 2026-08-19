import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { requireProfile } from "@/lib/auth";
import type { NavItem } from "@/components/Sidebar";

const NAV_ITEMS: NavItem[] = [
  { href: "/super-admin", label: "Vue globale", icon: "fa-solid fa-house" },
  { href: "/super-admin/organizations", label: "Auto-écoles", icon: "fa-solid fa-building" },
  { href: "/super-admin/plans", label: "Plans SaaS", icon: "fa-solid fa-layer-group" },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { userId, profile } = await requireProfile();
  // Defense in depth alongside middleware.ts's role-area gate — every
  // page under this layout inherits the check from here.
  if (profile.role !== "super_admin") redirect("/login");

  return (
    <AppShell profile={profile} userId={userId} navItems={NAV_ITEMS} title="Super Admin — FABUS">
      {children}
    </AppShell>
  );
}
