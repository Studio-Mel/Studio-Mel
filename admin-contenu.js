/* =========================================================
   Studio Mel · éditeur de contenu (espace admin)
   Enregistre dans Firestore : document site/contenu (tarifs, formules, accueil, FAQ)
   et collection « articles ». Le site public lit ces données (cms.js).
   ========================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, getDocs, collection, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY",
  authDomain: "studio-mel-2f2cc.firebaseapp.com",
  projectId: "studio-mel-2f2cc",
  storageBucket: "studio-mel-2f2cc.firebasestorage.app",
  messagingSenderId: "604457816435",
  appId: "1:604457816435:web:cfa47da9d5b08caa6bf506"
});
const auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const D = window.SM_DEFAUTS || { tarifs: {}, accueil: {}, formules: {}, faq: [], articles: [] };
const clone = o => JSON.parse(JSON.stringify(o));
const REGLES = `match /site/{doc} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.email == "studio-mel@outlook.fr";
}
match /articles/{doc} {
  allow read: if true;
  allow write: if request.auth != null && request.auth.token.email == "studio-mel@outlook.fr";
}`;
$("rules-txt").textContent = REGLES;

let C = null, ARTS = [], modifie = false;
const st = (t, cl = "") => { $("st").className = "st " + cl; $("st").textContent = t; };
const marquer = () => { modifie = true; $("save").disabled = false; st("Modifications non enregistrées"); };
addEventListener("beforeunload", e => { if (modifie) { e.preventDefault(); e.returnValue = ""; } });

// petits constructeurs de champs (valeurs posées avec .value : aucun HTML injecté)
function el(tag, attrs = {}, ...kids){
  const n = document.createElement(tag);
  for (const k in attrs) { if (k === "class") n.className = attrs[k]; else if (k.startsWith("on")) n.addEventListener(k.slice(2), attrs[k]); else n.setAttribute(k, attrs[k]); }
  kids.flat().forEach(k => n.append(k instanceof Node ? k : document.createTextNode(k)));
  return n;
}
function champ(lab, valeur, maj, { type = "text", long = false, max = 0, aide = "", libre = false } = {}){
  const inp = long ? el("textarea", { class: long === "xl" ? "long" : "" }) : el("input", { type });
  inp.value = valeur ?? "";
  const cnt = max ? el("div", { class: "cnt" }) : null;
  const upd = () => { if (cnt) { cnt.textContent = inp.value.length + " / " + max + " caractères"; cnt.classList.toggle("trop", inp.value.length > max); } };
  inp.addEventListener("input", () => { maj(type === "number" ? Number(inp.value) : inp.value); upd(); if (!libre) marquer(); });
  upd();
  return el("label", { class: "f" }, el("span", {}, el("b", {}, lab), aide ? " · " + aide : ""), inp, cnt || "");
}

// ---------- onglets ----------
document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", x === b ? "true" : "false"));
  document.querySelectorAll("[data-p]").forEach(p => p.classList.toggle("hide", p.dataset.p !== b.dataset.t));
}));

// ---------- rendu des panneaux ----------
const NOMS_T = { refonte: "Refonte", creation: "Création", premium: "Premium vitrine", boutique: "Boutique en ligne (à partir de)", page: "Page supplémentaire", galerie: "Galerie photos", blog: "Blog", resa: "Réservation en ligne", google: "Fiche Google Business", domaine: "Nom de domaine (par an, environ)", maint: "Maintenance (par mois)", maintBoutique: "Maintenance boutique (par mois)", heure: "Modification hors maintenance (par heure)", lotProduits: "Lot de 20 produits", promo: "Codes promo et livraison offerte" };
function rendreTarifs(){
  const p = document.querySelector('[data-p="tarifs"]'); p.innerHTML = "";
  const g = el("div", { class: "grid" });
  Object.keys(NOMS_T).forEach(k => g.append(champ(NOMS_T[k] + " (€)", C.tarifs[k], v => { C.tarifs[k] = Math.max(0, v || 0); }, { type: "number" })));
  p.append(el("div", { class: "card" }, el("h2", {}, "Tarifs"), el("p", { class: "help" }, "Ces prix se mettent à jour partout : formules, tableau comparatif, options, simulateur, formulaire de contact et assistant. Pense aussi à mettre à jour la FAQ et les articles s’ils citent un prix."), g));
}
function rendreFormules(){
  const p = document.querySelector('[data-p="formules"]'); p.innerHTML = "";
  [["refonte", "Refonte"], ["creation", "Création"], ["premium", "Premium (site vitrine)"], ["boutique", "Premium (boutique en ligne)"]].forEach(([k, t]) => {
    const F = C.formules[k] = C.formules[k] || {};
    const card = el("div", { class: "card" }, el("h2", {}, t));
    if (k !== "boutique") {
      card.append(champ("Nom affiché", F.nom, v => F.nom = v));
      card.append(champ("Badge", F.badge, v => F.badge = v, { aide: "laisser vide pour ne rien afficher" }));
      card.append(champ("Pour qui", F.pour, v => F.pour = v, { long: true }));
    }
    card.append(champ("Ce qui est inclus", (F.items || []).join("\n"), v => F.items = v.split("\n").map(x => x.trim()).filter(Boolean), { long: true, aide: "une prestation par ligne" }));
    p.append(card);
  });
}
function rendreAccueil(){
  const p = document.querySelector('[data-p="accueil"]'); p.innerHTML = "";
  const A = C.accueil;
  p.append(el("div", { class: "card" }, el("h2", {}, "Accueil"), el("p", { class: "help" }, "Le grand titre tient sur deux lignes."),
    champ("Titre, ligne 1", A.titre1, v => A.titre1 = v, { max: 30 }),
    champ("Titre, ligne 2", A.titre2, v => A.titre2 = v, { max: 30 }),
    champ("Sous-titre", A.sous_titre, v => A.sous_titre = v, { max: 70, aide: "70 caractères maximum conseillés" })));
}
function rendreBandeau(){
  const p = document.querySelector('[data-p="bandeau"]'); p.innerHTML = "";
  const B = C.bandeau;
  const actif = el("input", { type: "checkbox", onchange: e => { B.actif = e.target.checked; marquer(); apercu(); } }); actif.checked = !!B.actif;
  const ap = el("div", { class: "ban-ap" });
  function apercu(){ ap.innerHTML = ""; ap.append(el("span", {}, B.actif && B.texte ? B.texte : "(bandeau masqué)")); ap.style.opacity = B.actif && B.texte ? 1 : .45; }
  p.append(el("div", { class: "card" }, el("h2", {}, "Bandeau d’annonce"),
    el("p", { class: "help" }, "Une ligne affichée tout en haut du site, sur toutes les pages. Le visiteur peut la fermer. Exemples : « Congés du 20 au 27 décembre », « 2 places de lancement restantes ce mois-ci »."),
    el("label", { class: "chk" }, actif, " Afficher le bandeau"),
    champ("Texte (court, une ligne)", B.texte, v => { B.texte = v.slice(0, 120); apercu(); }),
    champ("Lien au clic (facultatif, ex. /contact/ ou https://…)", B.lien, v => B.lien = v.trim()),
    el("p", { class: "help" }, "Aperçu :"), ap));
  apercu();
}
function rendreAvis(){
  const p = document.querySelector('[data-p="avis"]'); p.innerHTML = "";
  p.append(el("div", { class: "card" }, el("h2", {}, "Lien « Laisser un avis Google »"),
    el("p", { class: "help" }, "Colle ici le lien de ta fiche Google pour laisser un avis (dans ta fiche Google Business : « Demander des avis »). Un bouton apparaîtra sur le site."),
    champ("Lien Google", C.avisGoogle, v => C.avisGoogle = v.trim())));
  const card = el("div", { class: "card" }, el("h2", {}, "Avis clients"), el("p", { class: "help" }, "Affichés sur l’accueil et la page À propos. Tant qu’il n’y en a aucun, la section reste cachée. N’ajoute que de vrais avis, avec l’accord du client."));
  C.avis.forEach((x, i) => {
    const note = el("select", { onchange: e => { x.note = +e.target.value; marquer(); } }, ...[5, 4, 3, 2, 1].map(n => { const o = el("option", { value: n }, "★".repeat(n)); if ((x.note || 5) === n) o.selected = true; return o; }));
    card.append(el("div", { class: "faq-it" },
      champ("Nom du client", x.nom, v => x.nom = v),
      champ("Métier et ville (ex. Plâtrier, Villechenève)", x.metier, v => x.metier = v),
      champ("Son avis", x.texte, v => x.texte = v, { long: true }),
      el("label", { class: "f" }, el("span", {}, "Note"), note),
      el("div", { class: "row" },
        el("button", { class: "btn mini", type: "button", onclick: () => { if (i > 0) { [C.avis[i - 1], C.avis[i]] = [C.avis[i], C.avis[i - 1]]; marquer(); rendreAvis(); } } }, "↑ Monter"),
        el("button", { class: "btn mini danger", type: "button", onclick: () => { if (confirm("Supprimer cet avis ?")) { C.avis.splice(i, 1); marquer(); rendreAvis(); } } }, "Supprimer"))));
  });
  card.append(el("button", { class: "btn", type: "button", onclick: () => { C.avis.push({ nom: "", metier: "", texte: "", note: 5 }); marquer(); rendreAvis(); } }, "+ Ajouter un avis"));
  p.append(card);
}
function rendreFaq(){
  const p = document.querySelector('[data-p="faq"]'); p.innerHTML = "";
  const card = el("div", { class: "card" }, el("h2", {}, "Questions fréquentes"), el("p", { class: "help" }, "Affichées sur la page Contact."));
  C.faq.forEach((x, i) => {
    const bloc = el("div", { class: "faq-it" },
      champ("Question", x.q, v => x.q = v),
      champ("Réponse", x.r, v => x.r = v, { long: true }),
      el("div", { class: "row" },
        el("button", { class: "btn mini", type: "button", onclick: () => { if (i > 0) { [C.faq[i - 1], C.faq[i]] = [C.faq[i], C.faq[i - 1]]; marquer(); rendreFaq(); } } }, "↑ Monter"),
        el("button", { class: "btn mini", type: "button", onclick: () => { if (i < C.faq.length - 1) { [C.faq[i + 1], C.faq[i]] = [C.faq[i], C.faq[i + 1]]; marquer(); rendreFaq(); } } }, "↓ Descendre"),
        el("button", { class: "btn mini danger", type: "button", onclick: () => { if (confirm("Supprimer cette question ?")) { C.faq.splice(i, 1); marquer(); rendreFaq(); } } }, "Supprimer")));
    card.append(bloc);
  });
  card.append(el("button", { class: "btn", type: "button", onclick: () => { C.faq.push({ q: "", r: "" }); marquer(); rendreFaq(); } }, "+ Ajouter une question"));
  p.append(card);
}

// ---------- articles ----------
const slugifier = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
function mettreEnForme(md){ // même rendu que sur le site (cms.js)
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const lig = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g, '<a href="$2">$1</a>');
  const out = []; let l = null; const f = () => { if (l) { out.push("</" + l + ">"); l = null; } };
  String(md || "").split("\n").forEach(x => { const t = x.trim(); let m;
    if (!t) return f();
    if ((m = t.match(/^##\s+(.*)/))) { f(); out.push("<h2>" + lig(m[1]) + "</h2>"); }
    else if ((m = t.match(/^[-•]\s+(.*)/))) { if (l !== "ul") { f(); out.push("<ul>"); l = "ul"; } out.push("<li>" + lig(m[1]) + "</li>"); }
    else if ((m = t.match(/^\d+[.)]\s+(.*)/))) { if (l !== "ol") { f(); out.push("<ol>"); l = "ol"; } out.push("<li>" + lig(m[1]) + "</li>"); }
    else if ((m = t.match(/^>\s*(.*)/))) { f(); out.push('<div class="enc">' + lig(m[1]) + "</div>"); }
    else { f(); out.push("<p>" + lig(t) + "</p>"); } });
  f(); return out.join("");
}
function listeArticles(){
  // articles du site (d'origine) + articles enregistrés dans l'admin
  const parSlug = {};
  D.articles.forEach(a => parSlug[a.slug] = { ...a, origine: "site", modifie: false });
  ARTS.forEach(a => parSlug[a.slug] = { ...(parSlug[a.slug] || {}), ...a, origine: parSlug[a.slug] ? "site" : "admin", modifie: true });
  return Object.values(parSlug).sort((x, y) => String(y.date).localeCompare(String(x.date)));
}
function rendreArticles(){
  const p = document.querySelector('[data-p="articles"]'); p.innerHTML = "";
  const card = el("div", { class: "card" }, el("h2", {}, "Articles"), el("p", { class: "help" }, "Modifie un article existant ou écris-en un nouveau. Il est enregistré à part : pas besoin de cliquer sur « Enregistrer » en haut."),
    el("button", { class: "btn pri", type: "button", onclick: () => editer({ slug: "", titre: "", cat: "Conseils", resume: "", date: new Date().toISOString().slice(0, 10), lecture: 4, contenu: "", publie: true, nouveau: true }) }, "+ Nouvel article"));
  const liste = el("div", { class: "list", style: "margin-top:16px" });
  listeArticles().forEach(a => liste.append(el("button", { class: "it", type: "button", onclick: () => editer(clone(a)) },
    el("b", {}, a.titre || "(sans titre)"),
    el("span", { class: "tag " + (a.publie === false ? "off" : "on") }, a.publie === false ? "Masqué" : "Publié"),
    el("span", { class: "tag" + (a.modifie ? " mod" : "") }, a.origine === "admin" ? "Créé ici" : a.modifie ? "Modifié" : "D’origine"))));
  card.append(liste); p.append(card);
}
function editer(a){
  const p = document.querySelector('[data-p="articles"]'); p.innerHTML = "";
  const prev = el("div", { class: "prev hide" });
  const card = el("div", { class: "card" },
    el("div", { class: "row", style: "justify-content:space-between;margin-bottom:12px" }, el("h2", {}, a.nouveau ? "Nouvel article" : "Modifier l’article"), el("button", { class: "btn mini", type: "button", onclick: rendreArticles }, "← Tous les articles")),
    champ("Titre", a.titre, v => { a.titre = v; if (a.nouveau) { a.slug = slugifier(v); slugInfo.textContent = "Adresse : /article?a=" + a.slug; } }, { max: 80, libre: true }),
    champ("Catégorie", a.cat, v => a.cat = v, { libre: true }),
    champ("Résumé (affiché sur la carte et pour Google)", a.resume, v => a.resume = v, { long: true, max: 160, libre: true }),
    el("div", { class: "grid" }, champ("Date", a.date, v => a.date = v, { type: "date", libre: true }), champ("Temps de lecture (min)", a.lecture, v => a.lecture = v, { type: "number", libre: true })),
    el("div", { class: "aide" }, "Mise en forme : ", el("code", {}, "## Sous-titre"), " · ", el("code", {}, "- élément de liste"), " · ", el("code", {}, "1. liste numérotée"), " · ", el("code", {}, "**gras**"), " · ", el("code", {}, "[texte](/audit/)"), " · ", el("code", {}, "> encadré"), ". Laisse une ligne vide entre deux paragraphes."),
    champ("Contenu", a.contenu, v => a.contenu = v, { long: "xl", libre: true }),
    prev);
  const slugInfo = el("p", { class: "st" }, a.slug ? (a.origine === "site" || a.statique ? "Article d’origine du site : /journal/" + a.slug + "/" : "Adresse : /article?a=" + a.slug) : "");
  const pub = el("input", { type: "checkbox" }); pub.checked = a.publie !== false; pub.addEventListener("change", () => a.publie = pub.checked);
  card.append(slugInfo, el("label", { class: "chk" }, pub, "Publié (décoche pour masquer l’article du site)"));
  const actions = el("div", { class: "row" },
    el("button", { class: "btn", type: "button", onclick: () => { prev.innerHTML = "<h2>" + (a.titre || "").replace(/</g, "&lt;") + "</h2>" + mettreEnForme(a.contenu); prev.classList.toggle("hide"); } }, "Aperçu"),
    el("button", { class: "btn pri", type: "button", onclick: () => enregistrerArticle(a) }, "Enregistrer l’article"));
  if (!a.nouveau && a.modifie) actions.append(el("button", { class: "btn danger", type: "button", onclick: () => supprimerArticle(a) }, a.origine === "site" ? "Revenir à la version d’origine" : "Supprimer l’article"));
  card.append(actions); p.append(card);
}
async function enregistrerArticle(a){
  if (!a.titre.trim() || !a.slug) return st("Il faut au moins un titre.", "ko");
  if (!a.contenu.trim()) return st("Le contenu est vide.", "ko");
  if (a.nouveau && listeArticles().some(x => x.slug === a.slug)) return st("Un article a déjà cette adresse : change un peu le titre.", "ko");
  st("Enregistrement…");
  try {
    await setDoc(doc(db, "articles", a.slug), { slug: a.slug, titre: a.titre.trim(), cat: a.cat || "Conseils", resume: a.resume || "", date: a.date || "", lecture: Number(a.lecture) || 4, contenu: a.contenu, publie: a.publie !== false, statique: !!(a.origine === "site" || a.statique), maj: serverTimestamp() });
    await chargerArticles(); st("Article enregistré ✓ Visible sur le site d’ici quelques minutes.", "ok"); rendreArticles();
  } catch (e) { erreur(e); }
}
async function supprimerArticle(a){
  if (!confirm(a.origine === "site" ? "Revenir à la version d’origine de cet article ?" : "Supprimer définitivement cet article ?")) return;
  try { await deleteDoc(doc(db, "articles", a.slug)); await chargerArticles(); st("C’est fait ✓", "ok"); rendreArticles(); } catch (e) { erreur(e); }
}

// ---------- chargement et enregistrement ----------
function erreur(e){
  console.error(e);
  if (e && e.code === "permission-denied") { $("erreur-regles").classList.remove("hide"); st("Accès refusé par les règles Firestore (voir ci-dessous).", "ko"); scrollTo(0, 0); }
  else st("Erreur : " + (e && e.message || e), "ko");
}
async function chargerArticles(){
  try { const snap = await getDocs(collection(db, "articles")); ARTS = snap.docs.map(d => d.data()); } catch (e) { ARTS = []; if (e.code === "permission-denied") $("erreur-regles").classList.remove("hide"); }
}
async function charger(){
  st("Chargement…");
  let enLigne = {};
  try { const s = await getDoc(doc(db, "site", "contenu")); if (s.exists()) enLigne = s.data(); }
  catch (e) { if (e.code === "permission-denied") $("erreur-regles").classList.remove("hide"); }
  // on part du contenu d'origine, puis on applique ce qui a déjà été modifié
  C = { tarifs: { ...D.tarifs, ...(enLigne.tarifs || {}) }, accueil: { ...D.accueil, ...(enLigne.accueil || {}) }, formules: clone(D.formules), faq: clone(enLigne.faq && enLigne.faq.length ? enLigne.faq : D.faq) };
  for (const k in (enLigne.formules || {})) C.formules[k] = { ...(C.formules[k] || {}), ...enLigne.formules[k] };
  C.avis = clone(enLigne.avis || []); C.avisGoogle = enLigne.avisGoogle || "";
  C.bandeau = { actif: false, texte: "", lien: "", ...(enLigne.bandeau || {}) };
  await chargerArticles();
  rendreTarifs(); rendreFormules(); rendreAccueil(); rendreFaq(); rendreArticles(); rendreAvis(); rendreBandeau();
  st(enLigne.maj ? "Dernière modification : " + enLigne.maj.toDate().toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Contenu d’origine du site");
}
$("save").addEventListener("click", async () => {
  $("save").disabled = true; st("Enregistrement…");
  try {
    await setDoc(doc(db, "site", "contenu"), { tarifs: C.tarifs, accueil: C.accueil, formules: C.formules, faq: C.faq.filter(x => x.q && x.q.trim()), avis: C.avis.filter(x => x.nom && x.texte).map(x => ({ nom: x.nom.trim(), metier: (x.metier || "").trim(), texte: x.texte.trim(), note: x.note || 5 })), avisGoogle: C.avisGoogle || "", bandeau: { actif: !!C.bandeau.actif, texte: (C.bandeau.texte || "").trim(), lien: C.bandeau.lien || "" }, maj: serverTimestamp() }, { merge: true });
    modifie = false; st("Enregistré ✓ Le site est à jour (jusqu’à 5 minutes pour les visiteurs déjà sur le site).", "ok");
  } catch (e) { $("save").disabled = false; erreur(e); }
});

// ---------- connexion ----------
onAuthStateChanged(auth, u => {
  $("login").classList.toggle("hide", !!u); $("app").classList.toggle("hide", !u);
  if (u) charger();
});
$("lbtn").addEventListener("click", async () => {
  $("lerr").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("lmail").value.trim(), $("lpass").value); }
  catch (e) { $("lerr").textContent = "Identifiant ou mot de passe incorrect."; }
});
$("lpass").addEventListener("keydown", e => { if (e.key === "Enter") $("lbtn").click(); });
