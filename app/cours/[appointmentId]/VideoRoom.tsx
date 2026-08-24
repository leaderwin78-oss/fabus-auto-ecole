"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { marquerPresence, marquerSortie } from "@/lib/actions/visio";
import { DOMAINE_VISIO, nomSalle } from "@/lib/video/room";

// Salle de cours en visioconférence, dans l'esprit de Zoom et Meet :
//  - un écran de pré-connexion où l'on règle micro et caméra AVANT d'entrer,
//    plutôt que de débarquer en direct dans la classe ;
//  - la salle intégrée à l'application, pas un onglet externe ;
//  - le moniteur est modérateur, les élèves entrent micro coupé.
//
// Jitsi Meet fournit la salle sans clé ni compte. Ce composant est le seul
// endroit qui en dépend : changer de fournisseur ne touche rien d'autre.

interface Jitsi {
  addEventListener: (e: string, cb: (...a: unknown[]) => void) => void;
  executeCommand: (c: string, ...a: unknown[]) => void;
  dispose: () => void;
}
declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domaine: string, options: Record<string, unknown>) => Jitsi;
  }
}

export function VideoRoom({
  appointmentId,
  titre,
  nomAffiche,
  estModerateur,
  lienPartage,
}: {
  appointmentId: string;
  titre: string;
  nomAffiche: string;
  estModerateur: boolean;
  lienPartage: string;
}) {
  const router = useRouter();
  const conteneur = useRef<HTMLDivElement>(null);
  const api = useRef<Jitsi | null>(null);

  const [entre, setEntre] = useState(false);
  const [micro, setMicro] = useState(estModerateur);
  const [camera, setCamera] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [termine, setTermine] = useState(false);

  useEffect(() => {
    if (!entre || !conteneur.current) return;

    let annule = false;

    const demarrer = async () => {
      // Le script externe est chargé à la demande, pas au chargement de la
      // page : personne ne paie le coût du visio s'il ne rentre pas en salle.
      if (!window.JitsiMeetExternalAPI) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = `https://${DOMAINE_VISIO}/external_api.js`;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("chargement impossible"));
          document.head.appendChild(s);
        }).catch(() => {
          if (!annule) setErreur("Impossible de charger la visioconférence. Vérifiez votre connexion.");
        });
      }
      if (annule || !window.JitsiMeetExternalAPI || !conteneur.current) return;

      api.current = new window.JitsiMeetExternalAPI(DOMAINE_VISIO, {
        roomName: nomSalle(appointmentId),
        parentNode: conteneur.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: nomAffiche },
        configOverwrite: {
          startWithAudioMuted: !micro,
          startWithVideoMuted: !camera,
          prejoinPageEnabled: false, // notre propre écran de pré-connexion le remplace
          disableDeepLinking: true,
          subject: titre,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          DEFAULT_BACKGROUND: "#000000",
          TOOLBAR_BUTTONS: [
            "microphone", "camera", "desktop", "chat", "raisehand",
            "participants-pane", "tileview", "select-background",
            "fullscreen", "settings", "hangup",
          ],
        },
      });

      api.current.addEventListener("videoConferenceJoined", () => {
        void marquerPresence(appointmentId);
      });
      api.current.addEventListener("readyToClose", () => {
        void marquerSortie(appointmentId).then(() => {
          setTermine(true);
          router.refresh();
        });
      });
    };

    void demarrer();

    return () => {
      annule = true;
      api.current?.dispose();
      api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entre, appointmentId]);

  // Quitter la salle depuis notre propre bouton, pour que la sortie soit
  // enregistrée même si l'utilisateur n'utilise pas le bouton de Jitsi.
  function quitter() {
    api.current?.executeCommand("hangup");
    void marquerSortie(appointmentId).then(() => setTermine(true));
  }

  if (termine) {
    return (
      <div className="card text-center" style={{ maxWidth: 520, margin: "3rem auto" }}>
        <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-circle-check"></i></div>
        <h2 className="auth-title">Vous avez quitté le cours</h2>
        <p className="auth-subtitle">Votre présence a été enregistrée.</p>
        <div className="flex gap-2 justify-center">
          <button className="btn btn-secondary" onClick={() => { setTermine(false); setEntre(false); }}>Revenir en salle</button>
          <button className="btn btn-primary" onClick={() => router.back()}>Retour</button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------ écran de pré-connexion
  if (!entre) {
    return (
      <div className="card prejoin">
        <h2 className="auth-title" style={{ fontSize: "1.5rem" }}>{titre}</h2>
        <p className="auth-subtitle">
          Réglez votre micro et votre caméra avant d&apos;entrer. Vous pourrez les changer à tout moment pendant le cours.
        </p>

        {erreur && <div className="form-error-banner">{erreur}</div>}

        <div className="prejoin-reglages">
          <button
            type="button"
            className={`prejoin-toggle${micro ? " actif" : ""}`}
            onClick={() => setMicro((v) => !v)}
            aria-pressed={micro}
          >
            <i className={`fa-solid ${micro ? "fa-microphone" : "fa-microphone-slash"}`}></i>
            <span>{micro ? "Micro activé" : "Micro coupé"}</span>
          </button>
          <button
            type="button"
            className={`prejoin-toggle${camera ? " actif" : ""}`}
            onClick={() => setCamera((v) => !v)}
            aria-pressed={camera}
          >
            <i className={`fa-solid ${camera ? "fa-video" : "fa-video-slash"}`}></i>
            <span>{camera ? "Caméra activée" : "Caméra coupée"}</span>
          </button>
        </div>

        {!estModerateur && (
          <p className="text-sm text-muted-color">
            Vous entrerez micro coupé par défaut, pour ne pas interrompre le cours.
          </p>
        )}

        <button className="btn btn-primary btn-lg w-full btn-pulse btn-shine" onClick={() => setEntre(true)}>
          <i className="fa-solid fa-video"></i> Rejoindre le cours
        </button>

        <div className="flex gap-2 items-center mt-4" style={{ justifyContent: "center", flexWrap: "wrap" }}>
          <span className="text-sm text-muted-color">Lien du cours :</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => { navigator.clipboard.writeText(lienPartage); setCopie(true); setTimeout(() => setCopie(false), 2000); }}
          >
            <i className="fa-solid fa-link"></i> {copie ? "Copié !" : "Copier le lien"}
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- salle en cours
  return (
    <div className="salle-visio">
      <div className="salle-entete">
        <div>
          <h3 className="mb-0" style={{ fontSize: "1rem" }}>{titre}</h3>
          <span className="text-sm text-muted-color">
            {estModerateur ? "Vous animez ce cours" : "Cours en direct"}
          </span>
        </div>
        <button className="btn btn-danger btn-sm" onClick={quitter}>
          <i className="fa-solid fa-phone-slash"></i> Quitter
        </button>
      </div>
      <div ref={conteneur} className="salle-cadre" />
    </div>
  );
}
