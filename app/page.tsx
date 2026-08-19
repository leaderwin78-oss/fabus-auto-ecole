import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/types/database";

async function getActiveSchools(): Promise<Organization[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("organizations")
      .select("*")
      .eq("status", "active")
      .order("name")
      .limit(6);
    return data ?? [];
  } catch {
    // Supabase not configured yet (no .env.local) — landing page still renders.
    return [];
  }
}

export default async function LandingPage() {
  const schools = await getActiveSchools();

  return (
    <>
      <nav className="navbar">
        <div className="container">
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: "1.5rem", color: "var(--text-primary)" }}
          >
            <i className="fa-solid fa-car-side" style={{ color: "var(--fabus-green)" }}></i> FABUS
          </Link>

          <div className="nav-links">
            <a href="#formations">Formations</a>
            <a href="#methode">La Méthode</a>
            <a href="#ecoles">Auto-écoles</a>
            <a href="#tarifs">Tarifs</a>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <Link href="/login" className="btn btn-secondary">Se connecter</Link>
            <Link href="/signup" className="btn btn-primary">S&apos;inscrire</Link>
          </div>
        </div>
      </nav>

      <section className="hero-section container">
        <div className="hero-content animate-fade-up">
          <span className="badge mb-4">Lancement à Dakar 🚀</span>
          <h1>
            Votre Permis de Conduire <br /> <span className="text-gradient">Commence Ici.</span>
          </h1>
          <p className="text-xl text-muted-color mb-8" style={{ maxWidth: 500 }}>
            La première plateforme 100% digitale pour les auto-écoles au Sénégal. Apprenez le code
            sur votre téléphone, réservez vos heures de conduite en un clic, et laissez-nous gérer
            la paperasse de A à Z.
          </p>
          <div className="flex gap-4 mb-8" style={{ flexWrap: "wrap" }}>
            <Link href="/signup" className="btn btn-primary">Commencer ma formation</Link>
            <a href="#ecoles" className="btn btn-outline">Trouver une auto-école</a>
          </div>
        </div>

        <div className="hero-image animate-fade-up delay-200">
          <div className="phone-mockup animate-float">
            <div className="mockup-header">
              <p style={{ fontSize: "0.875rem", opacity: 0.9 }}>Bonjour 👋</p>
              <h3 style={{ marginBottom: 0, marginTop: 5 }}>Prêt à conduire ?</h3>
            </div>
            <div className="mockup-body">
              <div className="mockup-card">
                <span className="badge badge-warning mb-2" style={{ fontSize: "0.7rem" }}>PROCHAINE ÉTAPE</span>
                <h4 style={{ fontSize: "1rem", marginBottom: 5 }}>📅 Cours de code en Visio</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 10 }}>
                  Aujourd&apos;hui à 21h00 • Les Intersections
                </p>
                <button className="btn btn-primary w-full" style={{ padding: "0.5rem", fontSize: "0.85rem" }}>
                  Rejoindre le cours
                </button>
              </div>
              <div>
                <h4 style={{ fontSize: "0.9rem", marginBottom: 10 }}>Progression</h4>
                <div className="mockup-card" style={{ padding: "0.75rem", marginBottom: 10 }}>
                  <div className="flex justify-between" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    <span>Code de la route</span>
                    <span>80%</span>
                  </div>
                  <div className="progress-container" style={{ height: 6 }}>
                    <div className="progress-bar" style={{ width: "80%" }}></div>
                  </div>
                </div>
                <div className="mockup-card" style={{ padding: "0.75rem" }}>
                  <div className="flex justify-between" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                    <span>Dossier Admin</span>
                    <span style={{ color: "var(--success)" }}>Complet <i className="fa-solid fa-check"></i></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          backgroundColor: "var(--bg-secondary)",
          padding: "2rem 0",
          borderTop: "1px solid var(--border-color)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div className="container text-center">
          <p className="text-sm font-semibold text-muted-color mb-4">PAIEMENTS SÉCURISÉS & CONFORMITÉ</p>
          <div className="flex justify-center items-center gap-8" style={{ flexWrap: "wrap", opacity: 0.7, filter: "grayscale(100%)" }}>
            <h3 style={{ margin: 0 }}>Wave</h3>
            <h3 style={{ margin: 0 }}>Orange Money</h3>
            <h3 style={{ margin: 0 }}>ANASER</h3>
            <h3 style={{ margin: 0 }}>CAPP Karangë</h3>
          </div>
        </div>
      </section>

      <section id="methode" className="section container">
        <div className="text-center mb-8 animate-fade-up">
          <span className="badge mb-2">Notre Méthode</span>
          <h2>Pourquoi choisir FABUS ?</h2>
          <p className="text-muted-color" style={{ maxWidth: 600, margin: "0 auto" }}>
            L&apos;expérience du permis de conduire entièrement repensée pour vous faciliter la vie.
          </p>
        </div>

        <div className="grid grid-cols-3">
          <div className="card animate-fade-up delay-100">
            <div className="icon-box"><i className="fa-solid fa-mobile-screen"></i></div>
            <h3>100% Digital</h3>
            <p className="text-muted-color">
              Révisez votre code depuis votre smartphone, où que vous soyez. Suivez votre
              progression en temps réel.
            </p>
          </div>
          <div className="card animate-fade-up delay-200">
            <div className="icon-box"><i className="fa-solid fa-calendar-check"></i></div>
            <h3>Zéro Prise de Tête</h3>
            <p className="text-muted-color">
              Réservez vos heures de conduite directement depuis l&apos;application, sans conflit
              d&apos;horaire possible.
            </p>
          </div>
          <div className="card animate-fade-up delay-300">
            <div className="icon-box"><i className="fa-solid fa-folder-open"></i></div>
            <h3>Suivi Administratif</h3>
            <p className="text-muted-color">
              Fini les allers-retours inutiles. Suivez l&apos;état de votre dossier permis en direct.
            </p>
          </div>
        </div>
      </section>

      <section id="ecoles" className="section" style={{ backgroundColor: "var(--bg-secondary)" }}>
        <div className="container">
          <div className="text-center mb-8">
            <h2>Auto-écoles partenaires</h2>
            <p className="text-muted-color">Choisissez votre auto-école pour commencer votre inscription.</p>
          </div>

          {schools.length === 0 ? (
            <div className="card empty-state" style={{ maxWidth: 500, margin: "0 auto" }}>
              <p className="mb-0">
                Aucune auto-école n&apos;est encore inscrite sur la plateforme.{" "}
                <Link href="/signup" style={{ color: "var(--fabus-green)", fontWeight: 600 }}>
                  Créez la première
                </Link>{" "}
                ou contactez-nous pour rejoindre FABUS.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3">
              {schools.map((school) => (
                <div key={school.id} className="card">
                  <div className="icon-box"><i className="fa-solid fa-graduation-cap"></i></div>
                  <h3 className="mb-2">{school.name}</h3>
                  <p className="text-muted-color mb-4">{school.city ?? "Dakar, Sénégal"}</p>
                  <Link href={`/signup?school=${school.id}`} className="btn btn-secondary w-full">
                    Rejoindre cette auto-école
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="tarifs" className="section">
        <div className="container">
          <div className="text-center mb-8">
            <h2>Forfaits Simples et Transparents</h2>
            <p className="text-muted-color">Payez en plusieurs fois via Wave ou Orange Money.</p>
          </div>

          <div className="grid grid-cols-3">
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h3 className="mb-2">Pack Code Seulement</h3>
              <div className="text-gradient" style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem" }}>40 000 F</div>
              <ul className="mb-8" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <li><i className="fa-solid fa-check" style={{ color: "var(--success)", marginRight: 10 }}></i> Accès LMS illimité</li>
                <li><i className="fa-solid fa-check" style={{ color: "var(--success)", marginRight: 10 }}></i> Examens blancs avec correction</li>
                <li><i className="fa-solid fa-xmark" style={{ color: "var(--text-muted)", marginRight: 10 }}></i> Frais d&apos;examen non inclus</li>
              </ul>
              <Link href="/signup" className="btn btn-secondary w-full">Choisir ce pack</Link>
            </div>

            <div
              className="card"
              style={{
                borderColor: "var(--fabus-green)",
                boxShadow: "var(--shadow-lg)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                transform: "scale(1.05)",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  position: "absolute", top: -15, left: "50%", transform: "translateX(-50%)",
                  background: "var(--fabus-green)", color: "white", padding: "4px 15px",
                  borderRadius: 20, fontSize: "0.8rem", fontWeight: 700,
                }}
              >
                LE PLUS POPULAIRE
              </div>
              <h3 className="mb-2">Permis B Complet</h3>
              <div className="text-gradient" style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem" }}>130 000 F</div>
              <ul className="mb-8" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <li><i className="fa-solid fa-check" style={{ color: "var(--success)", marginRight: 10 }}></i> Formation Code Complète</li>
                <li><i className="fa-solid fa-check" style={{ color: "var(--success)", marginRight: 10 }}></i> 15 Heures de conduite pratiques</li>
                <li><i className="fa-solid fa-check" style={{ color: "var(--success)", marginRight: 10 }}></i> Suivi dossier administratif</li>
              </ul>
              <Link href="/signup" className="btn btn-primary w-full">Commencer (Acompte 30 000 F)</Link>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <h3 className="mb-2">Pack Perfectionnement</h3>
              <div className="text-gradient" style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem" }}>60 000 F</div>
              <ul className="mb-8" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <li><i className="fa-solid fa-check" style={{ color: "var(--success)", marginRight: 10 }}></i> Pour ceux ayant déjà le permis</li>
                <li><i className="fa-solid fa-check" style={{ color: "var(--success)", marginRight: 10 }}></i> 10 Heures de conduite</li>
              </ul>
              <Link href="/signup" className="btn btn-secondary w-full">Choisir ce pack</Link>
            </div>
          </div>
        </div>
      </section>

      <footer style={{ backgroundColor: "var(--bg-primary)", padding: "4rem 0 2rem", borderTop: "1px solid var(--border-color)" }}>
        <div className="container flex justify-between" style={{ flexWrap: "wrap", gap: "2rem", marginBottom: "2rem" }}>
          <div>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 800, fontSize: "1.5rem", marginBottom: "1rem" }}>
              <i className="fa-solid fa-car-side" style={{ color: "var(--fabus-green)" }}></i> FABUS
            </Link>
            <p className="text-muted-color" style={{ maxWidth: 300 }}>
              La plateforme numérique qui accompagne l&apos;élève de son inscription jusqu&apos;à son permis de conduire.
            </p>
          </div>

          <div style={{ display: "flex", gap: "4rem", flexWrap: "wrap" }}>
            <div>
              <h4 className="mb-4">Plateforme</h4>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)" }}>
                <li><a href="#methode">Formations</a></li>
                <li><a href="#tarifs">Tarifs</a></li>
                <li><Link href="/login">Espace Élève</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Pour les Auto-Écoles</h4>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)" }}>
                <li><Link href="/signup">Devenir Partenaire</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4">Contact</h4>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem", color: "var(--text-secondary)" }}>
                <li>Dakar, Sénégal</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="container text-center text-muted-color text-sm" style={{ borderTop: "1px solid var(--border-color)", paddingTop: "2rem" }}>
          &copy; 2026 FABUS. Tous droits réservés.
        </div>
      </footer>
    </>
  );
}
