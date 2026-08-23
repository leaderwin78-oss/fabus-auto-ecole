import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "L'Auto École — Tout pour réussir son permis de conduire",
  description:
    "L'Auto École connecte élèves et auto-écoles au Sénégal : cours en ligne, visioconférence, réservation de séances de conduite et paiement mobile, le tout sur une seule plateforme.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
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
