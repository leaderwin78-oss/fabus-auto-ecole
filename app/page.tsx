import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SchoolPicker } from "./SchoolPicker";
import type { Organization } from "@/types/database";

async function getActiveSchools(): Promise<Organization[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("status", "active")
      .order("name")
      .limit(9);
    return data ?? [];
  } catch {
    // Supabase not configured yet (no .env.local) — landing page still renders.
    return [];
  }
}

const FEATURES = [
  {
    icon: "fa-solid fa-mobile-screen",
    title: "Le code sur votre téléphone",
    body: "Révisez où que vous soyez, enchaînez les examens blancs et suivez votre progression en temps réel.",
  },
  {
    icon: "fa-solid fa-calendar-check",
    title: "Vos heures de conduite en un clic",
    body: "Réservez vos séances avec votre moniteur directement depuis l'application, sans conflit d'horaire.",
  },
  {
    icon: "fa-solid fa-folder-open",
    title: "Votre dossier toujours à jour",
    body: "Fini les allers-retours à l'auto-école : l'état de votre dossier de permis est visible en direct.",
  },
];

export default async function LandingPage() {
  const schools = await getActiveSchools();

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <Link href="/" className="wordmark">
            <i className="fa-solid fa-car-side"></i> L&apos;Auto École
          </Link>

          <div className="nav-links">
            <a href="#methode">La méthode</a>
            <a href="#ecoles">Auto-écoles</a>
            <a href="#tarifs">Tarifs</a>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn btn-text btn-sm">Se connecter</Link>
            <Link href="/signup" className="btn btn-primary btn-sm">S&apos;inscrire</Link>
          </div>
        </div>
      </nav>

      {/* Hero: one centred column, a lot of air, a single obvious action. */}
      <section className="hero-google">
        <h1 className="hero-logo animate-fade-up">
          L&apos;Auto <span className="accent">École</span>
        </h1>
        <p className="hero-tagline animate-fade-up delay-100">
          Tout pour réussir son permis de conduire au Sénégal : le code en ligne, les heures de
          conduite et le dossier administratif, au même endroit.
        </p>

        <div className="animate-fade-up delay-200" style={{ width: "100%" }}>
          <SchoolPicker schools={schools} />
        </div>

        <div className="hero-actions animate-fade-up delay-300">
          <Link href="/signup" className="btn btn-secondary">Créer un compte</Link>
          <a href="#ecoles" className="btn btn-secondary">Voir les auto-écoles</a>
        </div>
      </section>

      <section id="methode" className="section container">
        <div className="text-center mb-8">
          <h2 className="section-heading">Pourquoi L&apos;Auto École ?</h2>
          <p className="text-muted-color" style={{ maxWidth: 560, margin: "0 auto" }}>
            L&apos;expérience du permis de conduire repensée, du premier cours de code au jour de l&apos;examen.
          </p>
        </div>

        <div className="grid grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature-tile">
              <div className="icon-box"><i className={feature.icon}></i></div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="ecoles" className="section" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="section-heading">Auto-écoles partenaires</h2>
            <p className="text-muted-color">Choisissez votre auto-école pour commencer votre inscription.</p>
          </div>

          {schools.length === 0 ? (
            <div className="card empty-state" style={{ maxWidth: 520, margin: "0 auto" }}>
              <p className="mb-4">Aucune auto-école n&apos;est encore inscrite sur la plateforme.</p>
              <Link href="/signup/auto-ecole" className="btn btn-primary">Inscrire mon auto-école</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3">
              {schools.map((school) => (
                <Link key={school.id} href={`/signup/eleve?school=${school.id}`} className="school-tile">
                  <span className="badge" style={{ alignSelf: "flex-start", marginBottom: "0.5rem" }}>
                    {school.city ?? "Sénégal"}
                  </span>
                  <h3 style={{ fontSize: "1.0625rem", marginBottom: "0.25rem" }}>{school.name}</h3>
                  <span className="text-sm" style={{ color: "var(--fabus-green)", fontWeight: 500 }}>
                    Rejoindre cette auto-école <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.75rem" }}></i>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="tarifs" className="section">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="section-heading">Forfaits simples et transparents</h2>
            <p className="text-muted-color">Payez en plusieurs fois via Wave ou Orange Money.</p>
          </div>

          <div className="grid grid-cols-3">
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h3 className="mb-2">Pack Code</h3>
              <div style={{ fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: "1.25rem", fontFamily: "var(--font-display)" }}>
                40 000 <span className="text-muted-color" style={{ fontSize: "1rem" }}>F CFA</span>
              </div>
              <ul className="mb-8" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <li className="text-sm"><i className="fa-solid fa-check" style={{ color: "var(--fabus-green)", marginRight: 10 }}></i> Accès illimité aux cours de code</li>
                <li className="text-sm"><i className="fa-solid fa-check" style={{ color: "var(--fabus-green)", marginRight: 10 }}></i> Examens blancs avec correction</li>
                <li className="text-sm text-muted-color"><i className="fa-solid fa-xmark" style={{ marginRight: 10 }}></i> Frais d&apos;examen non inclus</li>
              </ul>
              <Link href="/signup/eleve" className="btn btn-secondary w-full">Choisir ce pack</Link>
            </div>

            <div className="card" style={{ borderColor: "var(--fabus-green)", position: "relative", display: "flex", flexDirection: "column" }}>
              <span className="badge mb-2" style={{ alignSelf: "flex-start" }}>Le plus choisi</span>
              <h3 className="mb-2">Permis B complet</h3>
              <div style={{ fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: "1.25rem", fontFamily: "var(--font-display)" }}>
                130 000 <span className="text-muted-color" style={{ fontSize: "1rem" }}>F CFA</span>
              </div>
              <ul className="mb-8" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <li className="text-sm"><i className="fa-solid fa-check" style={{ color: "var(--fabus-green)", marginRight: 10 }}></i> Formation code complète</li>
                <li className="text-sm"><i className="fa-solid fa-check" style={{ color: "var(--fabus-green)", marginRight: 10 }}></i> 15 heures de conduite</li>
                <li className="text-sm"><i className="fa-solid fa-check" style={{ color: "var(--fabus-green)", marginRight: 10 }}></i> Suivi du dossier administratif</li>
              </ul>
              <Link href="/signup/eleve" className="btn btn-primary w-full">Commencer</Link>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h3 className="mb-2">Perfectionnement</h3>
              <div style={{ fontSize: "2.25rem", fontWeight: 400, letterSpacing: "-0.02em", marginBottom: "1.25rem", fontFamily: "var(--font-display)" }}>
                60 000 <span className="text-muted-color" style={{ fontSize: "1rem" }}>F CFA</span>
              </div>
              <ul className="mb-8" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <li className="text-sm"><i className="fa-solid fa-check" style={{ color: "var(--fabus-green)", marginRight: 10 }}></i> Pour les titulaires du permis</li>
                <li className="text-sm"><i className="fa-solid fa-check" style={{ color: "var(--fabus-green)", marginRight: 10 }}></i> 10 heures de conduite</li>
              </ul>
              <Link href="/signup/eleve" className="btn btn-secondary w-full">Choisir ce pack</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Three doors, mirroring /signup — so the choice is visible before the click. */}
      <section className="section" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="section-heading">Rejoindre la plateforme</h2>
            <p className="text-muted-color">Élève, auto-école ou moniteur : chacun son parcours d&apos;inscription.</p>
          </div>
          <div className="role-grid" style={{ maxWidth: 980, margin: "0 auto" }}>
            <Link href="/signup/eleve" className="role-card">
              <span className="role-icon"><i className="fa-solid fa-graduation-cap"></i></span>
              <h3>Je suis élève</h3>
              <p>Je veux passer mon permis et suivre ma formation en ligne.</p>
              <span className="role-cta">Créer mon compte <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.75rem" }}></i></span>
            </Link>
            <Link href="/signup/auto-ecole" className="role-card">
              <span className="role-icon"><i className="fa-solid fa-building"></i></span>
              <h3>Je dirige une auto-école</h3>
              <p>Je veux gérer mes élèves, mes moniteurs et mes paiements.</p>
              <span className="role-cta">Inscrire mon auto-école <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.75rem" }}></i></span>
            </Link>
            <Link href="/signup/moniteur" className="role-card">
              <span className="role-icon"><i className="fa-solid fa-user-tie"></i></span>
              <h3>Je suis moniteur</h3>
              <p>Je veux rejoindre l&apos;équipe d&apos;une auto-école partenaire.</p>
              <span className="role-cta">Envoyer ma candidature <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.75rem" }}></i></span>
            </Link>
          </div>
        </div>
      </section>

      <footer style={{ backgroundColor: "var(--bg-primary)", padding: "3rem 0 2rem", borderTop: "1px solid var(--border-subtle)" }}>
        <div className="container flex justify-between" style={{ flexWrap: "wrap", gap: "2.5rem", marginBottom: "2.5rem" }}>
          <div>
            <Link href="/" className="wordmark mb-4" style={{ display: "inline-flex" }}>
              <i className="fa-solid fa-car-side"></i> L&apos;Auto École
            </Link>
            <p className="text-sm text-muted-color" style={{ maxWidth: 300 }}>
              La plateforme numérique qui accompagne l&apos;élève de son inscription jusqu&apos;à son permis de conduire.
            </p>
          </div>

          <div style={{ display: "flex", gap: "3.5rem", flexWrap: "wrap" }}>
            <div>
              <h4 className="mb-4" style={{ fontSize: "0.875rem" }}>Plateforme</h4>
              <ul className="text-sm" style={{ display: "flex", flexDirection: "column", gap: "0.625rem", color: "var(--text-secondary)" }}>
                <li><a href="#methode">La méthode</a></li>
                <li><a href="#tarifs">Tarifs</a></li>
                <li><Link href="/annonces">Annonces</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4" style={{ fontSize: "0.875rem" }}>S&apos;inscrire</h4>
              <ul className="text-sm" style={{ display: "flex", flexDirection: "column", gap: "0.625rem", color: "var(--text-secondary)" }}>
                <li><Link href="/signup/eleve">Élève</Link></li>
                <li><Link href="/signup/auto-ecole">Auto-école</Link></li>
                <li><Link href="/signup/moniteur">Moniteur</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4" style={{ fontSize: "0.875rem" }}>Légal</h4>
              <ul className="text-sm" style={{ display: "flex", flexDirection: "column", gap: "0.625rem", color: "var(--text-secondary)" }}>
                <li><Link href="/conditions">Conditions générales</Link></li>
                <li><Link href="/confidentialite">Confidentialité</Link></li>
                <li>Dakar, Sénégal</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container text-center text-muted-color text-sm" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.5rem" }}>
          &copy; 2026 L&apos;Auto École. Tous droits réservés.
        </div>
      </footer>
    </>
  );
}
