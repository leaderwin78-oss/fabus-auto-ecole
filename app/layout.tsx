import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "L'Auto École — Tout pour réussir son permis de conduire",
  description:
    "L'Auto École connecte élèves et auto-écoles au Sénégal : cours en ligne, visioconférence, réservation de séances de conduite et paiement mobile, le tout sur une seule plateforme.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline script below sets data-theme on
    // <html> before React hydrates, so the server HTML deliberately differs
    // from the client. Without it, every themed page logs a mismatch.
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Les icônes ne doivent pas retarder le premier affichage : la feuille
            externe coûtait un aller-retour DNS + TLS vers un domaine tiers
            avant que la moindre ligne de texte n'apparaisse.
            Elle est donc déclarée en `media="print"` — le navigateur la
            télécharge sans bloquer le rendu — puis basculée en `all` par le
            script ci-dessous une fois arrivée.
            Le basculement passe par un script et non par onLoad : dans un
            composant serveur, React n'émet pas les gestionnaires d'événements,
            la feuille resterait en print et aucune icône ne s'afficherait. */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          id="icones"
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          media="print"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var l=document.getElementById('icones');if(!l)return;var a=function(){l.media='all'};if(l.sheet)a();else{l.addEventListener('load',a);setTimeout(a,3000);}})();`,
          }}
        />
        <noscript>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        </noscript>
        {/* Applies the saved theme before first paint to avoid a flash of the wrong theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
