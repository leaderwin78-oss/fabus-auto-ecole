import Link from "next/link";
import { ALL_PHOTOS } from "@/lib/photos";

export const metadata = {
  title: "Crédits photo — L'Auto École",
  description: "Auteurs et licences des photographies utilisées sur L'Auto École.",
};

// Required by the CC BY licence of every photograph on the site. Linked from
// the footer so the credit is reachable from anywhere.
export default function CreditsPage() {
  return (
    <main className="section container" style={{ maxWidth: 720 }}>
      <Link href="/" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour à l&apos;accueil
      </Link>
      <h1 className="mb-2" style={{ fontSize: "2rem" }}>Crédits photo</h1>
      <p className="text-muted-color mb-8">
        Les photographies illustrant ce site sont publiées sous licence Creative Commons, qui autorise leur usage
        commercial à condition de créditer leurs auteurs. Les autres visuels (voitures, panneaux, scènes
        d&apos;apprentissage) sont des illustrations originales créées pour L&apos;Auto École.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {ALL_PHOTOS.map((photo) => (
          <div key={photo.file} className="card" style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed-size thumbnail, no layout benefit from next/image here */}
            <img
              src={`/images/${photo.file}@800.webp`}
              alt={photo.alt}
              width={120}
              height={90}
              style={{ width: 120, height: 90, objectFit: "cover", borderRadius: "var(--radius-md)", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p className="mb-0" style={{ fontWeight: 500 }}>{photo.title}</p>
              <p className="text-sm text-muted-color mb-2">par {photo.author}</p>
              <p className="text-sm mb-0">
                <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--fabus-green)" }}>
                  Source
                </a>
                {" · "}
                <a href={photo.licenceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--fabus-green)" }}>
                  {photo.licence}
                </a>
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
