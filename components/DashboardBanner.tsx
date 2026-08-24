// Bandeau en tête de tableau de bord : un titre et une ligne de contexte.
// Les illustrations ont été retirées — l'emplacement visuel est libre pour les
// visuels que fournira l'auto-école.
export function DashboardBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <section className="dash-banner">
      <div className="dash-banner-text">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </section>
  );
}
