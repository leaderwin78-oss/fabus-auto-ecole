"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

// Sur mobile, la barre latérale était simplement masquée (display:none) sans
// rien pour la remplacer : douze liens de navigation et le bouton Déconnexion
// devenaient inatteignables. On se connectait, et on restait bloqué sur une
// seule page sans pouvoir en sortir. Le même composant sert donc désormais de
// rail fixe sur grand écran et de tiroir escamotable sur téléphone.
export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);

  // Le tiroir se referme au clic sur un lien (voir onClick plus bas) plutôt
  // que dans un effet déclenché par le changement de chemin : c'est le même
  // résultat sans provoquer de rendu en cascade.

  // Échap referme, et le défilement de la page est bloqué tant que le tiroir
  // est ouvert (sinon le contenu défile sous le panneau).
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [ouvert]);

  return (
    <>
      {/* Barre supérieure : n'apparaît que sous 900 px. */}
      <header className="mobile-bar">
        <button
          type="button"
          className="mobile-burger"
          aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={ouvert}
          aria-controls="menu-principal"
          onClick={() => setOuvert((v) => !v)}
        >
          <i className={`fa-solid ${ouvert ? "fa-xmark" : "fa-bars"}`}></i>
        </button>
        <Link href="/" className="wordmark" style={{ fontSize: "1.0625rem" }}>
          <i className="fa-solid fa-car-side"></i> L&apos;Auto École
        </Link>
      </header>

      {ouvert && <div className="mobile-voile" onClick={() => setOuvert(false)} aria-hidden="true" />}

      <aside id="menu-principal" className={`sidebar${ouvert ? " sidebar-ouverte" : ""}`}>
        <div className="sidebar-header">
          <Link href="/" className="wordmark">
            <i className="fa-solid fa-car-side"></i> L&apos;Auto École
          </Link>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const active = item.href === pathname || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
                onClick={() => setOuvert(false)}
              >
                <i className={item.icon}></i> {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "1.25rem", borderTop: "1px solid var(--border-color)" }}>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="nav-item"
              style={{ color: "var(--danger)", background: "none", border: "none", width: "100%", cursor: "pointer", textAlign: "left" }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket"></i> Déconnexion
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
