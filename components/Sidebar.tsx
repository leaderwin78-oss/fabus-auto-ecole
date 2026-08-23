"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: "1.5rem", color: "var(--text-primary)" }}
        >
          <i className="fa-solid fa-car-side" style={{ color: "var(--fabus-green)" }}></i> L&apos;Auto École
        </Link>
      </div>
      <nav className="sidebar-nav">
        {items.map((item) => {
          const active = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`nav-item${active ? " active" : ""}`}>
              <i className={item.icon}></i> {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "1.5rem", borderTop: "1px solid var(--border-color)" }}>
        <form action="/auth/signout" method="post">
          <button type="submit" className="nav-item" style={{ color: "var(--danger)", background: "none", border: "none", width: "100%", cursor: "pointer", textAlign: "left" }}>
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
