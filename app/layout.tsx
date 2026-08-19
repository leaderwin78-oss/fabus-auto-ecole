import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FABUS - Votre Permis de Conduire à Dakar Commence Ici",
  description:
    "FABUS est la première auto-école 100% digitale de Dakar. Apprenez le code sur votre téléphone, réservez vos heures de conduite en un clic et laissez-nous gérer la paperasse.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
