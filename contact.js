/* =========================================================
   Studio Mel · page Contact : demande de devis et réservation d'un appel
   ========================================================= */
import { load, chargerCreneaux, envoyer, robot } from "/firebase.js";

const calm = window.SM_CALM;

// ---------- pré-remplissage (formule choisie, simulateur, outils) ----------
(function(){
  const f = document.getElementById("devis-form"); if (!f) return;
  const params = new URLSearchParams(location.search), voulue = params.get("formule");
  let infos = null;
  try { infos = JSON.parse(sessionStorage.getItem("sm-contact") || "null"); sessionStorage.removeItem("sm-contact"); } catch (e) {}
  const formule = (infos && infos.formule) || voulue;
  if (formule && f.formule.querySelector('option[value="' + CSS.escape(formule) + '"]')) f.formule.value = formule;
  if (infos && infos.texte) f.message.value = infos.texte.trim() + "\n\n";
  window.simDevis = infos && infos.detail ? infos.detail : null;
  if (formule || (infos && infos.texte)) setTimeout(() => f.nom.focus({ preventScroll: true }), 300);
})();

// prix envoyés avec la demande : toujours ceux du moment (modifiables depuis l'admin)
const T = window.TARIFS, e = n => Math.round(n).toLocaleString("fr-FR") + " €";
const prixDe = () => ({ "Création de site vitrine": e(T.creation), "Refonte de site": e(T.refonte), "Site Premium": e(T.premium), "Boutique en ligne": "dès " + e(T.boutique), "Fiche Google Business": e(T.google), "Maintenance": e(T.maint) + "/mois", "Autre demande": "—" });

document.getElementById("devis-form").addEventListener("submit", e => {
  e.preventDefault(); const f = e.target;
  if (!window.valider(f)) return;
  const s = window.simDevis && window.simDevis.formule === f.formule.value ? window.simDevis : null;
  const eur = n => Math.round(n).toLocaleString("fr-FR") + " €";
  envoyer(f, "devis-statut", {
    titre: "Nouvelle demande de devis",
    nom: f.nom.value, entreprise: f.entreprise.value, email: f.email.value,
    formule: s && s.opts.length ? f.formule.value + " + " + s.opts.join(" + ") : f.formule.value,
    prix: s ? eur(s.total) : (prixDe()[f.formule.value] || "—"),
    message: f.message.value || "Aucun message",
    ...(s ? { lignes: s.lignes } : {})
  }, "Merci ! Votre demande est bien partie. Je vous réponds sous 48 h, à l’adresse e-mail indiquée. Pensez à vérifier vos courriers indésirables (spams) si vous ne voyez rien arriver.");
  window.simDevis = null;
});

// ---------- rendez-vous ----------
(function(){
  // ---- Rendez-vous : modifie ici tes créneaux (0 = dimanche, 1 = lundi … 6 = samedi) ----
  var CRENEAUX = {
    1: ['12:15', '18:00', '18:45'],
    2: ['12:15', '18:00', '18:45'],
    3: ['12:15', '18:00', '18:45'],
    4: ['12:15', '18:00', '18:45'],
    5: ['12:15', '18:00'],
    6: ['10:00', '11:00', '14:00', '15:00']
  };
  var rdvF = document.getElementById('rdv-form'), daysEl = document.getElementById('rdv-days'), slotsEl = document.getElementById('rdv-slots');
  var JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'], MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  (function(){
    var d = new Date(); d.setHours(0, 0, 0, 0); var n = 0, html = '';
    for (var k = 1; k <= 30 && n < 12; k++){
      var x = new Date(d); x.setDate(d.getDate() + k);
      if (!CRENEAUX[x.getDay()]) continue;
      html += '<label><input type="radio" name="jour" value="' + x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0') + '" data-dow="' + x.getDay() + '"><span><small>' + JOURS[x.getDay()] + '</small><b>' + x.getDate() + '</b><em>' + MOIS[x.getMonth()] + '</em></span></label>';
      n++;
    }
    daysEl.innerHTML = html;
    slotsEl.innerHTML = '<span class="none">Choisissez d’abord un jour.</span>';
  })();
  function rdvSum(){
    var j = rdvF.querySelector('[name=jour]:checked'), hh = rdvF.querySelector('[name=heure]:checked');
    var ok = j && hh, btn = document.getElementById('rdv-btn');
    btn.disabled = !ok;
    if (!j) { document.getElementById('rdv-sum').textContent = 'Choisissez un jour et une heure.'; return null; }
    var x = new Date(j.value + 'T12:00:00');
    var txt = x.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (hh ? ' à ' + hh.value.replace(':', ' h ') : '');
    document.getElementById('rdv-sum').textContent = ok ? 'Appel le ' + txt + '.' : 'Le ' + txt + ', à quelle heure ?';
    return ok ? txt : null;
  }
  // créneaux déjà réservés (en attente ou confirmés), chargés depuis Firebase
  window.creneauxPris = window.creneauxPris || new Set();
  function cle(jour, t){ return jour + '_' + t.replace(':', 'h'); }
  function renderSlots(){
    var j = rdvF.querySelector('[name=jour]:checked');
    if (!j) { slotsEl.innerHTML = '<span class="none">Choisissez d’abord un jour.</span>'; rdvSum(); return; }
    var avant = rdvF.querySelector('[name=heure]:checked'), garde = avant ? avant.value : null;
    var libres = CRENEAUX[j.dataset.dow].filter(function(t){ return !window.creneauxPris.has(cle(j.value, t)); });
    slotsEl.innerHTML = libres.length ? libres.map(function(t, i){ return '<label style="animation-delay:' + (i * 40) + 'ms"><input type="radio" name="heure" value="' + t + '"' + (t === garde ? ' checked' : '') + '><span>' + t.replace(':', ' h ') + '</span></label>'; }).join('') : '<span class="none">Plus de créneau libre ce jour-là.</span>';
    rdvSum();
  }
  function markDays(){
    daysEl.querySelectorAll('input').forEach(function(i){
      var plein = CRENEAUX[i.dataset.dow].every(function(t){ return window.creneauxPris.has(cle(i.value, t)); });
      i.disabled = plein; i.parentNode.classList.toggle('full', plein);
      if (plein && i.checked) i.checked = false;
    });
  }
  daysEl.addEventListener('change', renderSlots);
  document.addEventListener('creneaux', function(){ markDays(); renderSlots(); });
  slotsEl.addEventListener('change', rdvSum);
  window.rdvTexte = rdvSum;

})();

// les créneaux déjà pris se chargent quand le bloc de réservation approche de l'écran
(function(){
  const bloc = document.getElementById("rdv"); if (!bloc) return;
  let fait = false; const go = () => { if (!fait) { fait = true; chargerCreneaux(); } };
  if ("IntersectionObserver" in window) new IntersectionObserver((en, o) => { if (en[0].isIntersecting) { o.disconnect(); go(); } }, { rootMargin: "300px" }).observe(bloc);
  else go();
  if (location.hash === "#rdv") go();
})();

const rdvForm = document.getElementById("rdv-form");
rdvForm.addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target, quand = window.rdvTexte();
  if (!quand) return;
  if (!window.valider(f)) return;
  if (robot(f)) { const st = document.getElementById("rdv-statut"); st.className = "statut ok"; st.textContent = "Merci ! Votre demande de rendez-vous est bien partie."; return; }
  const jour = f.querySelector("[name=jour]:checked").value, heure = f.querySelector("[name=heure]:checked").value;
  const mode = f.querySelector("[name=mode]:checked").value, cle = jour + "_" + heure.replace(":", "h");
  const s = document.getElementById("rdv-statut"), btn = document.getElementById("rdv-btn");
  btn.disabled = true; s.textContent = "Réservation en cours...";
  // on bloque le créneau d'abord : si quelqu'un l'a pris entre-temps, Firebase refuse
  try {
    const { db, fs } = await load();
    // écriture atomique : la transaction échoue si le créneau existe déjà,
    // et les règles Firestore refusent de toute façon d'écraser un créneau existant
    const ref = fs.doc(db, "creneaux", cle);
    await fs.runTransaction(db, async t => {
      const snap = await t.get(ref);
      if (snap.exists()) throw new Error("creneau-pris");
      t.set(ref, { statut: "attente" });
    });
  } catch (err) {
    console.error(err);
    // si la liste des créneaux est lisible, le refus veut dire que le créneau est déjà pris ;
    // sinon (règles Firestore pas encore à jour), on envoie quand même la demande
    if (window.creneauxOK) { s.className = "statut ko"; s.textContent = "Ce créneau vient d’être réservé par quelqu’un d’autre. Choisissez-en un autre."; await chargerCreneaux(); return; }
  }
  window.creneauxPris.add(cle);
  envoyer(f, "rdv-statut", {
    titre: "Nouveau rendez-vous", formule: "Rendez-vous", prix: "—",
    nom: f.nom.value, entreprise: f.entreprise.value, email: f.email.value,
    message: "Rendez-vous demandé le " + quand + " (" + mode.toLowerCase() + "). Téléphone : " + f.tel.value,
    type: "rdv", rdvJour: jour, rdvHeure: heure, mode: mode, tel: f.tel.value, creneau: cle
  }, "C’est réservé ! Je vous confirme le rendez-vous par e-mail. Pensez à vérifier vos courriers indésirables (spams) si vous ne voyez rien arriver.");
});
rdvForm.addEventListener("reset-done", () => document.dispatchEvent(new Event("creneaux")));
