"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { demanderAbonnement } from "@/lib/actions/abonnement";

interface Formule {
  id: string;
  nom: string;
  prix: number;
  moniteurs: number | null;
  eleves: number | null;
}

export function ChoixFormule({ formules }: { formules: Formule[] }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function souscrire(id: string) {
    setEnCours(id);
    startTransition(async () => {
      setErreur(null);
      const r = await demanderAbonnement(id);
      setEnCours(null);
      if (!r.ok) setErreur(r.error ?? "Erreur");
      else { setEnvoye(true); router.refresh(); }
    });
  }

  if (envoye) {
    return (
      <div className="form-success-banner" style={{ padding: "1.25rem" }}>
        <p className="mb-2" style={{ fontWeight: 500 }}>Demande enregistrée</p>
        <p className="text-sm mb-0">
          Notre équipe vous contacte pour le règlement. Votre accès est rouvert dès réception.
        </p>
      </div>
    );
  }

  if (formules.length === 0) {
    return <p className="text-muted-color">Aucune formule payante n&apos;est proposée pour l&apos;instant.</p>;
  }

  return (
    <div>
      {erreur && <div className="form-error-banner">{erreur}</div>}
      <div className="formules">
        {formules.map((f) => (
          <div key={f.id} className="formule">
            <h3 className="mb-2">{f.nom}</h3>
            <p className="formule-prix">
              {f.prix.toLocaleString("fr-FR")} <span>F CFA / mois</span>
            </p>
            <ul className="formule-liste">
              <li>
                <i className="fa-solid fa-check"></i>{" "}
                {f.moniteurs === null ? "Moniteurs illimités" : `Jusqu'à ${f.moniteurs} moniteurs`}
              </li>
              <li>
                <i className="fa-solid fa-check"></i>{" "}
                {f.eleves === null ? "Élèves illimités" : `Jusqu'à ${f.eleves} élèves`}
              </li>
              <li><i className="fa-solid fa-check"></i> Cours en visio, quiz et suivi de dossiers</li>
            </ul>
            <button
              className="btn btn-primary w-full btn-shine"
              disabled={isPending}
              onClick={() => souscrire(f.id)}
            >
              {enCours === f.id ? "Envoi..." : "Choisir cette formule"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
