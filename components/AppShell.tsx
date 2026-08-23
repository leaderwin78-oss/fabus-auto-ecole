import { Sidebar, type NavItem } from "@/components/Sidebar";
import { NotificationsBell } from "@/components/NotificationsBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { Profile } from "@/types/database";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Administrateur",
  admin_auto_ecole: "Administrateur délégué",
  instructor: "Moniteur",
  student: "Élève",
};

export function AppShell({
  profile,
  userId,
  navItems,
  title,
  subtitle,
  children,
}: {
  profile: Profile;
  userId: string;
  navItems: NavItem[];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const initial = profile.full_name?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="app-shell">
      <Sidebar items={navItems} />
      <main className="main-content">
        <header className="topbar animate-fade-up">
          <div>
            <h1 style={{ fontSize: "2rem", marginBottom: 0 }}>{title}</h1>
            {subtitle && <p className="text-muted-color mb-0">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <NotificationsBell userId={userId} />
            <div className="flex items-center gap-2">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name} className="avatar" style={{ objectFit: "cover" }} />
              ) : (
                <div className="avatar">{initial}</div>
              )}
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{profile.full_name}</div>
                <div className="text-sm text-muted-color">{ROLE_LABEL[profile.role]}</div>
              </div>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
