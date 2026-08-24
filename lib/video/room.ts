// Nom de salle dérivé de l'identifiant du rendez-vous : déterministe (tout le
// monde tombe dans la même salle sans se passer de lien) et non devinable
// depuis l'extérieur, puisqu'il contient un UUID.
//
// Jitsi Meet est utilisé sans clé ni compte : c'est ce qui permet d'avoir une
// visioconférence réellement fonctionnelle aujourd'hui plutôt qu'un bouton qui
// promet une fonctionnalité inexistante. Pour passer à un fournisseur avec
// enregistrement (Daily, Whereby, Zoom SDK), seule cette fonction et le
// composant VideoRoom changent.
export const DOMAINE_VISIO = "meet.jit.si";

export function nomSalle(appointmentId: string): string {
  return `auto-ecole-${appointmentId}`;
}

export function lienSalle(appointmentId: string): string {
  return `https://${DOMAINE_VISIO}/${nomSalle(appointmentId)}`;
}
