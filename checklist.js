/* Studio Mel · checklist gratuite : prénom + e-mail, puis téléchargement du PDF.
   La demande arrive dans l'admin (collection « devis », type « guide ») et par e-mail, comme un devis. */
import { envoyer } from "/firebase.js";
document.querySelectorAll("[data-checklist]").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const nom = form.nom.value.trim(), email = form.email.value.trim(), st = form.querySelector(".statut");
    if (!nom || !/^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(email)) { st.className = "statut ko"; st.textContent = "Indiquez votre prénom et un e-mail valide."; return; }
    await envoyer(form, st.id, { nom, email, formule: "Checklist gratuite", message: "A téléchargé la checklist « Préparer son site internet en 10 étapes ».", type: "guide" },
      "C’est prêt ! Votre checklist est juste en dessous.");
    if (st.classList.contains("ok")) {
      const dl = form.parentElement.querySelector(".ck-dl");
      form.hidden = true; dl.hidden = false; dl.focus();
      const p = document.createElement("p"); p.className = "statut ok"; p.textContent = st.textContent; dl.before(p);
    }
  });
});
