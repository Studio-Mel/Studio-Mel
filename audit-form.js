/* =========================================================
   Studio Mel · après l'audit automatique : « Je veux des conseils »
   La demande part dans l'admin (collection « devis ») avec le résumé du rapport.
   ========================================================= */
import { envoyer } from "/firebase.js";
const f = document.getElementById("lead-form");
if (f) f.addEventListener("submit", e => {
  e.preventDefault();
  if (!window.valider(f)) return;
  const R = window.SM_RAPPORT || {}, S = R.scores || {};
  const noms = { performance: "Vitesse", seo: "Référencement", accessibilite: "Accessibilité", bonnesPratiques: "Fiabilité" };
  const notes = Object.keys(noms).map(k => noms[k] + " " + (S[k] == null ? "—" : S[k])).join(", ");
  const pb = (R.controles || []).filter(c => c.etat !== "ok").slice(0, 6).map(c => "• " + c.titre).join("\n");
  envoyer(f, "lead-statut", {
    nom: f.entreprise.value, entreprise: f.entreprise.value, email: f.email.value,
    titre: "Nouvelle demande d’audit", formule: "Audit gratuit", prix: "Gratuit",
    message: "Site analysé : " + f.site.value + "\nNotes : " + notes + "\n" + (pb ? "Points relevés :\n" + pb + "\n" : "") + (f.message.value ? "\nMessage : " + f.message.value : "")
  }, "C’est noté ! Je regarde votre site moi-même et je vous envoie mes conseils sous 48 h. Pensez à vérifier vos courriers indésirables (spams) si vous ne voyez rien arriver.");
});
