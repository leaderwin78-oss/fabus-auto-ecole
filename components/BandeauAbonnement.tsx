import Link from "next/link";
import type { Abonnement } from "@/lib/data/abonnement";

// Bandeau d'échéance. Il n'apparaît que quand il y a quelque chose à faire :
// un bandeau permanent finit par ne plus être lu, et le jour où il compte
// vraiment personne ne le voit.
export function BandeauAbonnement({ abonnement }: { abonnement: Abonnement | null }) {
  if (!abonnement || abonnement.etat === "actif") return null;

  const { etat, jours, planNom } = abonnement;

  const contenu =
    etat === "grace"
      ? {
          ton: "urgent" as const,
          titre: "Votre abonnement a expiré",
          texte: `Votre accès reste ouvert quelques jours de plus, le temps de régulariser. Passé ce délai, l'espace de votre auto-école sera restreint.`,
        }
      : etat === "aucun"
        ? {
            ton: "urgent" as const,
            titre: "Aucun abonnement actif",
            texte: "Votre auto-école n'a pas d'abonnement rattaché. Contactez-nous pour en activer un.",
          }
        : {
            ton: "avertissement" as const,
            titre:
              jours !== null && jours <= 1
                ? "Votre abonnement se termine aujourd'hui"
                : `Votre abonnement se termine dans ${jours} jours`,
            texte: `Formule ${planNom ?? "en cours"}. Renouvelez pour garder l'accès de votre équipe et de vos élèves.`,
          };

  return (
    <div className={`bandeau-abo bandeau-abo-${contenu.ton}`} role="status">
      <div className="bandeau-abo-texte">
        <p className="bandeau-abo-titre">{contenu.titre}</p>
        <p className="bandeau-abo-detail">{contenu.texte}</p>
      </div>
      <Link href="/abonnement" className="btn btn-primary btn-sm btn-shine">
        Renouveler
      </Link>
    </div>
  );
}
