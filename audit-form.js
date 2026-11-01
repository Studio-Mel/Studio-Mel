/* =========================================================
   Studio Mel · demande d'audit fait à la main (page Audit et outils)
   ========================================================= */
import { envoyer } from "/firebase.js";
document.getElementById("audit-form").addEventListener("submit", e => {
  e.preventDefault(); const f = e.target;
  if (!window.valider(f)) return;
  envoyer(f, "audit-statut", {
    nom: f.entreprise.value, entreprise: f.entreprise.value, email: f.email.value,
    titre: "Nouvelle demande d’audit", formule: "Audit gratuit", prix: "Gratuit", message: "Site à auditer : " + f.site.value
  }, "C’est noté ! Votre audit arrive sous 48 h.");
});

