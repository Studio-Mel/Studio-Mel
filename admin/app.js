import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy, runTransaction } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY",
  authDomain: "studio-mel-2f2cc.firebaseapp.com",
  projectId: "studio-mel-2f2cc",
  storageBucket: "studio-mel-2f2cc.firebasestorage.app",
  messagingSenderId: "604457816435",
  appId: "1:604457816435:web:cfa47da9d5b08caa6bf506"
});
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = v => parseFloat(String(v ?? "").replace(/[^\d,.-]/g, "").replace(",", ".")) || 0;
const eur = n => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const today = () => new Date().toLocaleDateString("fr-FR");

// ---- Mail automatique au client (rendez-vous confirmé ou refusé) ----
// Colle ici l'ID du modèle "mail client" créé sur EmailJS, ex. 'template_abc1234'
const TEMPLATE_CLIENT = "";
const SITE = "https://studio-mel.github.io/Studio-Mel/";
if (window.emailjs) emailjs.init({ publicKey: "53BDiH6RSJl99cF65" });

const STATUTS_RDV = { nouveau: "En attente", accepte: "Confirmé", refuse: "Refusé" };
const STATUTS = {
  devis: { brouillon: "Brouillon", nouveau: "Nouvelle demande", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé", expire: "Expiré" },
  factures: { attente: "En attente", partielle: "Payée en partie", payee: "Payée", retard: "En retard" },
  avoirs: { emis: "Émis", rembourse: "Remboursé", impute: "Déduit d'une facture" }
};
const COND_DEVIS = "Paiement : 50 % à la signature, 50 % à la mise en ligne (ou 30 % / 40 % / 30 % sur accord). 2 tours de retouches inclus, retouches supplémentaires 30 €/h. Délai : 1 à 3 semaines après réception des contenus. Le site et le nom de domaine appartiennent au client après paiement complet. Devis valable 30 jours. TVA non applicable, art. 293 B du CGI.";
const COND_AVOIR = "Avoir à valoir sur une prochaine facture ou remboursé par virement. TVA non applicable, art. 293 B du CGI.";
const COND_FACT = "Paiement par virement à réception. IBAN : [à compléter]. Pénalités de retard : 3 fois le taux d'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 € (professionnels). Pas d'escompte pour paiement anticipé. TVA non applicable, art. 293 B du CGI.";

let data = { devis: [], factures: [], clients: [], depenses: [], projets: [], avoirs: [], documents: [], rappels: [] };
let ficheKey = null, filtreC = "tous", rechC = "", depEdit = null, ficheRetour = "clients", rechP = "", filtreJ = "cours", rechJ = "", projetOuvert = null;
let tab = "dash";
let filtreF = "factures", vuePl = "mois", datePl = new Date(), rechDoc = "", catDoc = "";
let cur = null;

onAuthStateChanged(auth, u => {
  $("login").classList.toggle("hide", !!u);
  $("app").classList.toggle("hide", !u);
  if (u) { $("meMail").textContent = u.email || ""; load(); }
});

// ---- Navigation : barre latérale, menu mobile ----
const appEl = $("app");
try { if (localStorage.getItem("side-mini") === "1") appEl.classList.add("plie"); } catch {}
$("fold").onclick = () => { appEl.classList.toggle("plie"); try { localStorage.setItem("side-mini", appEl.classList.contains("plie") ? "1" : "0"); } catch {} };
$("burger").onclick = () => appEl.classList.add("menu");
$("veil").onclick = () => appEl.classList.remove("menu");
document.querySelectorAll(".side .tabs button").forEach(b => b.addEventListener("click", () => { appEl.classList.remove("menu"); window.scrollTo(0, 0); }));
document.addEventListener("keydown", e => { if (e.key === "Escape") appEl.classList.remove("menu"); });
const TITRES = { planning: ["Pilotage", "Planning"], documents: ["Gestion", "Documents"], prospects: ["Commercial", "Prospects"], projets: ["Production", "Projets"], dash: ["Pilotage", "Tableau de bord"], devis: ["Commercial", "Demandes et devis"], rdv: ["Commercial", "Rendez-vous"], clients: ["Commercial", "Clients"], factures: ["Gestion", "Factures"], depenses: ["Gestion", "Dépenses"] };
function titre(crumb, t){ $("crumb").textContent = crumb; $("pageTitle").textContent = t; document.title = t + " · Studio Mel"; }

$("lbtn").onclick = async () => {
  $("lerr").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("lmail").value.trim(), $("lpass").value); }
  catch { $("lerr").textContent = "E-mail ou mot de passe incorrect."; }
};
$("lpass").addEventListener("keydown", e => { if (e.key === "Enter") $("lbtn").click(); });
$("logout").onclick = () => signOut(auth);
$("tabH").onclick = () => { tab = "dash"; renderList(); };
$("tabD").onclick = () => { tab = "devis"; renderList(); };
$("tabF").onclick = () => { tab = "factures"; renderList(); };
$("tabR").onclick = () => { tab = "rdv"; renderList(); };
$("tabC").onclick = () => { tab = "clients"; ficheKey = null; renderList(); };
$("tabX").onclick = () => { tab = "depenses"; renderList(); };
$("tabP").onclick = () => { tab = "prospects"; renderList(); };
$("tabL").onclick = () => { tab = "planning"; renderList(); };
$("tabO").onclick = () => { tab = "documents"; renderList(); };
$("tabJ").onclick = () => { tab = "projets"; projetOuvert = null; renderList(); };
$("newDevis").onclick = () => openDoc("devis");
$("newFacture").onclick = () => openDoc("factures");

async function load() {
  for (const k of ["devis", "factures"]) {
    const snap = await getDocs(query(collection(db, k), orderBy("createdAt", "desc")));
    data[k] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  // clients et dépenses : si les règles Firestore ne sont pas encore à jour, on continue sans
  for (const k of ["clients", "depenses", "projets", "avoirs", "documents", "rappels"]) {
    try { const snap = await getDocs(collection(db, k)); data[k] = snap.docs.map(d => ({ id: d.id, ...d.data() })); }
    catch (e) { console.warn(k, e); data[k] = []; data[k].bloque = true; }
  }
  renderList();
}

const brut = d => (d.lignes || [{ qte: 1, pu: num(d.prix) }]).reduce((s, l) => s + num(l.qte) * num(l.pu), 0);
const montantRemise = d => { const b = brut(d), r = num(d.remise); if (!r) return 0; return Math.min(b, d.remiseType === "eur" ? r : Math.round(b * r) / 100); };
const total = d => Math.round((brut(d) - montantRemise(d)) * 100) / 100;

function renderList() {
  $("list").classList.remove("hide");
  $("editor").classList.add("hide");
  $("tabH").classList.toggle("on", tab === "dash");
  $("tabD").classList.toggle("on", tab === "devis");
  $("tabF").classList.toggle("on", tab === "factures");
  $("tabR").classList.toggle("on", tab === "rdv");
  $("tabC").classList.toggle("on", tab === "clients");
  $("tabX").classList.toggle("on", tab === "depenses");
  $("tabP").classList.toggle("on", tab === "prospects");
  $("tabJ").classList.toggle("on", tab === "projets");
  $("tabL").classList.toggle("on", tab === "planning");
  $("tabO").classList.toggle("on", tab === "documents");
  const nouv = data.devis.filter(d => d.statut === "nouveau").length;
  const acc = data.devis.filter(d => d.statut === "accepte" && d.type !== "rdv" && d.formule !== "Rendez-vous").length;
  const fact = data.factures.reduce((s, f) => s + total(f), 0);
  const enc = data.factures.reduce((s, f) => s + paye(f), 0);
  $("stats").innerHTML = `
    <div class="stat"><small>Nouvelles demandes</small><div>${nouv}</div></div>
    <div class="stat"><small>Devis acceptés</small><div>${acc}</div></div>
    <div class="stat"><small>Facturé</small><div>${eur(fact)}</div></div>
    <div class="stat"><small>Encaissé</small><div>${eur(enc)}</div></div>`;
  const isRdv = d => d.type === "rdv" || d.formule === "Rendez-vous";
  titre(...(TITRES[tab] || TITRES.dash));
  $("nbD").textContent = data.devis.filter(d => !isRdv(d) && d.statut === "nouveau").length || "";
  $("nbR").textContent = data.devis.filter(d => isRdv(d) && d.statut === "nouveau").length || "";
  $("nbF").textContent = data.factures.filter(enRetardF).length || "";
  $("nbL").textContent = rappelsDus().length || "";
  $("nbP").textContent = relancesDues().length || "";
  $("nbJ").textContent = data.projets.filter(projetEnRetard).length || "";
  $("stats").classList.toggle("hide", ["dash", "clients", "depenses", "rdv", "prospects", "projets", "planning", "documents", "factures"].includes(tab));
  if (tab === "planning") return renderPlanning();
  if (tab === "documents") return renderDocuments();
  if (tab === "factures") return renderFactures();
  if (tab === "dash") return renderDash();
  if (tab === "prospects") return renderProspects();
  if (tab === "projets") return projetOuvert ? renderProjet(projetOuvert) : renderProjets();
  if (tab === "clients") return ficheKey ? renderFiche(ficheKey) : renderClients();
  if (tab === "depenses") return renderDepenses();
  if (tab === "rdv") return renderRdv(data.devis.filter(isRdv));
  const list = tab === "devis" ? data.devis.filter(d => !isRdv(d)) : data[tab];
  if (!list.length) {
    $("items").innerHTML = `<div class="empty">${tab === "devis" ? "Aucune demande pour l'instant. Elles arriveront ici dès qu'un client remplit le formulaire." : "Aucune facture. Crée-en une, ou transforme un devis accepté en facture."}</div>`;
    return;
  }
  $("items").innerHTML = list.map(d => `
    <button class="item" data-id="${d.id}">
      <div><strong>${esc(d.entreprise || d.nom || "Sans nom")}</strong>
        <small>${esc(d.numero || "Pas encore numéroté")} · ${esc(d.date || "")}</small>
        <small>${esc(d.formule || (d.lignes && d.lignes[0] && d.lignes[0].des) || "")}</small></div>
      <div class="r"><strong>${eur(total(d))}</strong><br>
        <span class="tag t-${esc(statutD(d))}">${esc(STATUTS.devis[statutD(d)] || d.statut)}</span></div>
    </button>`).join("");
  document.querySelectorAll(".item").forEach(b => b.onclick = () => openDoc(tab, b.dataset.id));
}

// ---- Rendez-vous ----
function quand(d){
  if (!d.rdvJour) return d.message || "";
  const x = new Date(d.rdvJour + "T12:00:00");
  return x.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }) + " à " + d.rdvHeure.replace(":", " h ");
}
function renderRdv(list){
  const ordre = { nouveau: 0, accepte: 1, refuse: 2 };
  list = list.slice().sort((a, b) => (ordre[a.statut] ?? 3) - (ordre[b.statut] ?? 3) || String(a.rdvJour).localeCompare(String(b.rdvJour)));
  if (!list.length) { $("items").innerHTML = `<div class="empty">Aucun rendez-vous pour l'instant. Ils arriveront ici dès qu'un client réserve un créneau sur le site.</div>`; return; }
  $("items").innerHTML = list.map(d => `
    <div class="item rdv-item">
      <div><strong>${esc(d.entreprise || d.nom || "Sans nom")}</strong>
        <small>${esc(quand(d))}${d.mode ? " · " + esc(d.mode) : ""}</small>
        <small>${esc(d.nom || "")}${d.tel ? " · " + `<a href="tel:${esc(d.tel)}">${esc(d.tel)}</a>` : ""} · <a href="mailto:${esc(d.email)}">${esc(d.email)}</a></small>
        <span class="tag t-${esc(d.statut)}">${esc(STATUTS_RDV[d.statut] || d.statut)}</span></div>
      <div class="r rdv-acts">
        ${d.statut === "nouveau" ? `<button class="pri" data-ok="${d.id}">Accepter</button><button class="dan" data-ko="${d.id}">Refuser</button>` : `<button data-del="${d.id}">Supprimer</button>`}
      </div>
    </div>`).join("");
  document.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => repondre(b.dataset.ok, true, b));
  document.querySelectorAll("[data-ko]").forEach(b => b.onclick = () => repondre(b.dataset.ko, false, b));
  document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
    if (!confirm("Supprimer ce rendez-vous de la liste ?")) return;
    const d = data.devis.find(x => x.id === b.dataset.del);
    await deleteDoc(doc(db, "devis", d.id));
    if (d.creneau && d.statut === "accepte") { try { await deleteDoc(doc(db, "creneaux", d.creneau)); } catch {} }
    await load();
  });
}

function texteClient(d, ok, mot){
  const q = quand(d), prenom = d.nom ? d.nom.split(" ")[0] : "";
  const comment = { "Téléphone": "Je vous appellerai au " + (d.tel || "numéro indiqué") + ".", "Visio": "Je vous enverrai le lien de la visio juste avant le rendez-vous.", "Sur place": "Je vous recontacte pour convenir de l'adresse." }[d.mode] || "";
  if (ok) return { sujet: "Votre rendez-vous avec Studio Mel est confirmé", contenu: `Bonjour ${prenom},\n\nC'est confirmé : rendez-vous le ${q}. ${comment}\n\nÀ très vite,\nMel, Studio Mel` };
  return { sujet: "Votre demande de rendez-vous avec Studio Mel", contenu: `Bonjour ${prenom},\n\nMalheureusement, je ne suis pas disponible le ${q}.${mot ? "\n\n" + mot : ""}\n\nVous pouvez choisir un autre créneau ici : ${SITE}#contact\n\nÀ bientôt,\nMel, Studio Mel` };
}

async function repondre(id, ok, btn){
  const d = data.devis.find(x => x.id === id);
  let mot = "";
  if (!ok) { mot = prompt("Refuser ce créneau. Un mot pour le client ? (facultatif)", ""); if (mot === null) return; }
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "devis", id), { statut: ok ? "accepte" : "refuse" });
  } catch (e) { alert("Impossible d'enregistrer. Vérifie que les règles Firestore sont à jour."); btn.disabled = false; return; }
  if (d.creneau) {
    try {
      if (ok) await setDoc(doc(db, "creneaux", d.creneau), { statut: "pris" });
      else await deleteDoc(doc(db, "creneaux", d.creneau));
    } catch (e) { console.warn("Créneaux pas encore actifs (règles Firestore à mettre à jour)", e); }
  }
  const t = texteClient(d, ok, mot.trim());
  let envoye = false;
  if (TEMPLATE_CLIENT && window.emailjs) {
    try { await emailjs.send("service_nszz5ip", TEMPLATE_CLIENT, { email: d.email, nom: d.nom || "", sujet: t.sujet, contenu: t.contenu }); envoye = true; } catch (e) { console.error(e); }
  }
  if (!envoye) location.href = `mailto:${d.email}?subject=${encodeURIComponent(t.sujet)}&body=${encodeURIComponent(t.contenu)}`;
  await load();
  tab = "rdv"; renderList();
}


// ================= TABLEAU DE BORD =================
const MOIS_C = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(s){ // "28/10/2026" -> Date
  const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}
function docDate(d){ return frDate(d.date) || (d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : null); }
const jours = (a, b) => Math.floor((b - a) / 864e5);
const isRdvDoc = d => d.type === "rdv" || d.formule === "Rendez-vous";
const lignesMaint = d => (d.lignes || []).filter(l => /maintenance/i.test(l.des || ""));

// encaissements : facture payée = total à sa date de paiement ; facture en attente = acompte déjà versé
// règlements d'une facture : liste des paiements, ou ancien format (acompte + statut payée)
function reglements(f){
  if (Array.isArray(f.paiements)) return f.paiements.map(p => ({ date: frDate(p.date), montant: num(p.montant), mode: p.mode || "Virement" })).filter(p => p.montant);
  const out = [], ac = num(f.acompte), mode = f.modePaiement || "Virement";
  if (ac > 0) out.push({ date: docDate(f), montant: ac, mode, acompte: true });
  if (f.statut === "payee") out.push({ date: frDate(f.datePaiement) || docDate(f), montant: total(f) - ac, mode });
  return out;
}
const paye = f => Math.round(reglements(f).reduce((s, p) => s + p.montant, 0) * 100) / 100;
const reste = f => Math.max(0, Math.round((total(f) - paye(f)) * 100) / 100);
const ajoutJours = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const echeanceF = f => frDate(f.echeance) || (docDate(f) ? ajoutJours(docDate(f), 30) : null);
const debutJour = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const enRetardF = f => reste(f) > 0.005 && echeanceF(f) && echeanceF(f) < debutJour();
function statutF(f){ if (reste(f) <= 0.005 && total(f) > 0) return "payee"; if (enRetardF(f)) return "retard"; return paye(f) > 0 ? "partielle" : "attente"; }
const validiteD = d => frDate(d.validite) || (docDate(d) ? ajoutJours(docDate(d), 30) : null);
const statutD = d => d.statut === "envoye" && validiteD(d) && validiteD(d) < debutJour() ? "expire" : d.statut;

// encaissements réels : paiements des factures, moins les avoirs remboursés
function encaissements(){
  const out = [];
  data.factures.forEach(f => reglements(f).forEach(p => out.push({ date: p.date, montant: p.montant })));
  data.avoirs.filter(a => a.statut === "rembourse").forEach(a => out.push({ date: frDate(a.dateRemb) || docDate(a), montant: -total(a) }));
  return out.filter(e => e.date);
}

function taux(){ try { return parseFloat(localStorage.getItem("taux-urssaf")) || 0; } catch { return 0; } }

function renderDash(){
  const now = new Date(), y = now.getFullYear(), mo = now.getMonth();
  const encs = encaissements();
  const sum = f => encs.filter(f).reduce((s, e) => s + e.montant, 0);
  const enMois = (a, m) => e => e.date.getFullYear() === a && e.date.getMonth() === m;
  const moisCe = sum(enMois(y, mo));
  const prev = new Date(y, mo - 1, 1), moisPrec = sum(enMois(prev.getFullYear(), prev.getMonth()));
  const annee = sum(e => e.date.getFullYear() === y);
  const recM = MOIS_C.map((_, i) => sum(enMois(y, i)));
  const depOf = (a, m) => data.depenses.filter(x => { const d = frDate(x.date); return d && d.getFullYear() === a && (m == null || d.getMonth() === m); }).reduce((s, x) => s + num(x.montant), 0);
  const depM = MOIS_C.map((_, i) => depOf(y, i));
  const charges = depOf(y), depMois = depOf(y, mo);
  const t = taux(), benef = annee - charges - (t ? annee * t / 100 : 0);
  // 6 derniers mois pour la mini-courbe
  const six = [...Array(6)].map((_, k) => { const d = new Date(y, mo - 5 + k, 1); return sum(enMois(d.getFullYear(), d.getMonth())); });
  const maxSix = Math.max(1, ...six);
  const spark = six.map((v, k) => `<i class="${k === 5 ? "on" : ""}" style="height:${Math.max(8, v / maxSix * 100)}%" title="${eur(v)}"></i>`).join("");
  const diff = moisPrec ? Math.round((moisCe - moisPrec) / moisPrec * 100) : null;

  const dem = data.devis.filter(d => !isRdvDoc(d));
  const attente = dem.filter(d => statutD(d) === "envoye"), expires = dem.filter(d => statutD(d) === "expire"), acceptes = dem.filter(d => d.statut === "accepte");
  const accAn = acceptes.filter(d => (frDate(d.dateAccept) || docDate(d) || new Date(0)).getFullYear() === y);
  const payees = data.factures.filter(f => statutF(f) === "payee" && (frDate(f.datePaiement) || docDate(f) || new Date(0)).getFullYear() === y);
  const impayees = data.factures.filter(f => reste(f) > 0.005);
  const resteDu = impayees.reduce((s, f) => s + reste(f), 0);
  const enRetard = impayees.filter(enRetardF);
  const ann = annuaire().filter(c => !c.archive), nbClients = ann.filter(c => c.client).length;
  const projCours = data.projets.filter(p => !["enligne", "pause"].includes(p.statut)), projRetard = data.projets.filter(projetEnRetard);

  const I = {
    eur: '<svg viewBox="0 0 24 24"><path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
    out: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    proj: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>'
  };
  const K = (lab, ic, val, sub, extra = "", cls = "") => `<div class="k ${cls}"><div class="k-h"><small>${lab}</small><span class="k-i">${ic}</span></div><div class="k-v">${val}</div><div class="k-s">${sub}</div>${extra}</div>`;
  const pl = n => n > 1 ? "s" : "";

  // à faire
  const todo = [];
  dem.filter(d => d.statut === "nouveau").forEach(d => todo.push({ k: "Rappeler", c: "t-nouveau", txt: d.entreprise || d.nom, sub: d.formule || "", go: () => openDoc("devis", d.id) }));
  data.devis.filter(d => isRdvDoc(d) && d.statut === "nouveau").forEach(d => todo.push({ k: "Rendez-vous à accepter", c: "t-nouveau", txt: d.entreprise || d.nom, sub: quand(d), go: () => { tab = "rdv"; renderList(); } }));
  attente.filter(d => docDate(d) && jours(docDate(d), now) >= 7).forEach(d => todo.push({ k: "Relancer le devis", c: "t-envoye", txt: d.entreprise || d.nom, sub: `${d.numero || ""} · envoyé il y a ${jours(docDate(d), now)} jours`, go: () => openDoc("devis", d.id) }));
  rappelsDus().forEach(r => todo.push({ k: "Rappel", c: "t-nouveau", txt: r.titre, sub: `${new Date(r.date + "T12:00").toLocaleDateString("fr-FR")}${r.heure ? " à " + r.heure.replace(":", " h ") : ""}${r.note ? " · " + r.note : ""}`, go: () => ouvrirRappel(r) }));
  expires.forEach(d => todo.push({ k: "Devis expiré", c: "t-refuse", txt: d.entreprise || d.nom, sub: `${d.numero || ""} · relancer avec un nouveau devis ou le passer en refusé`, go: () => openDoc("devis", d.id) }));
  relancesDues().forEach(c => todo.push({ k: "Relancer le prospect", c: "t-envoye", txt: c.entreprise || c.nom, sub: `${ETAPES[c.etape]} · relance prévue le ${new Date(c.fiche.relance + "T12:00").toLocaleDateString("fr-FR")}`, go: () => { ficheRetour = "prospects"; tab = "clients"; ficheKey = c.key; renderList(); } }));
  projRetard.forEach(p => todo.push({ k: "Projet en retard", c: "t-refuse", txt: p.titre || "Projet", sub: `${p.client || ""} · livraison prévue le ${new Date(p.echeance + "T12:00").toLocaleDateString("fr-FR")}`, go: () => { tab = "projets"; projetOuvert = p.id; renderList(); } }));
  enRetard.forEach(f => todo.push({ k: "Facture en retard", c: "t-refuse", txt: f.entreprise || f.nom, sub: `${f.numero || ""} · ${eur(reste(f))} à encaisser`, go: () => openDoc("factures", f.id) }));

  // prochains rendez-vous
  const auj = new Date(y, mo, now.getDate());
  const rdvs = data.devis.filter(d => isRdvDoc(d) && d.statut === "accepte" && d.rdvJour && new Date(d.rdvJour + "T23:59:00") >= auj)
    .sort((a, b) => (a.rdvJour + a.rdvHeure).localeCompare(b.rdvJour + b.rdvHeure)).slice(0, 5);

  // entonnoir
  const envoyes = dem.filter(d => ["envoye", "accepte", "refuse"].includes(d.statut));
  const refuses = dem.filter(d => d.statut === "refuse");
  const payes = acceptes.filter(d => data.factures.some(f => f.devisRef && f.devisRef === d.numero && f.statut === "payee"));
  const tauxSign = acceptes.length + refuses.length ? Math.round(acceptes.length / (acceptes.length + refuses.length) * 100) : null;
  const steps = [["Demandes", dem.length], ["Devis envoyés", envoyes.length], ["Acceptés", acceptes.length], ["Payés", payes.length]];
  const maxStep = Math.max(1, dem.length);

  // répartition des ventes (devis acceptés)
  const famille = d => { const s = ((d.lignes && d.lignes[0] && d.lignes[0].des) || d.formule || "").toLowerCase();
    return /premium/.test(s) ? "Premium" : /refonte/.test(s) ? "Refonte" : /cr[ée]ation|vitrine/.test(s) ? "Création" : /google/.test(s) ? "Fiche Google" : "Autre"; };
  const COUL = { "Création": "#2F5BFF", "Refonte": "#7f9bff", "Premium": "#B4C6FF", "Fiche Google": "#3DD68C", "Autre": "#5f6578" };
  const rep = {}; acceptes.forEach(d => { const f = famille(d); rep[f] = (rep[f] || 0) + total(d); });
  const repL = Object.entries(rep).sort((a, b) => b[1] - a[1]), repT = repL.reduce((s, x) => s + x[1], 0);

  // objectif annuel
  let obj = 0; try { obj = parseFloat(localStorage.getItem("objectif-ca")) || 0; } catch {}
  const pct = obj ? Math.min(1, annee / obj) : 0, ARC = Math.PI * 90;

  const abos = data.devis.filter(d => !isRdvDoc(d) && d.statut === "accepte" && lignesMaint(d).length);
  const actifs = abos.filter(d => !d.maintFin);
  const mrr = actifs.reduce((s, d) => s + lignesMaint(d).reduce((u, l) => u + num(l.pu), 0), 0);

  $("items").innerHTML = `
  <div class="db">
    <div class="kp">
      ${K(`CA de ${MOIS_C[mo].replace(".", "")}`, I.eur, eur(moisCe), diff == null ? "Encaissé ce mois" : `<span class="${diff >= 0 ? "up" : "down"}">${diff >= 0 ? "▲ +" : "▼ "}${diff} %</span> vs mois dernier`, `<div class="spark" aria-hidden="true">${spark}</div>`)}
      ${K(`CA ${y}`, I.up, eur(annee), `${payees.length} facture${pl(payees.length)} payée${pl(payees.length)} cette année`)}
      ${K(`Résultat estimé`, I.ok, eur(benef), t ? "Encaissé − dépenses − cotisations" : "Règle ton taux de cotisations plus bas", "", "hl")}
      ${K(`Dépenses de ${MOIS_C[mo].replace(".", "")}`, I.out, eur(depMois), `${eur(charges)} depuis janvier`)}
      ${K("Devis en attente", I.doc, attente.length, attente.length ? `${eur(attente.reduce((s, d) => s + total(d), 0))} en jeu` : "Aucun devis envoyé en attente")}
      ${K("Devis acceptés", I.ok, accAn.length, `${eur(accAn.reduce((s, d) => s + total(d), 0))} signés en ${y}`)}
      ${K("Factures impayées", I.alert, impayees.length, impayees.length ? `${eur(resteDu)} à encaisser${enRetard.length ? ` · <span class="down">${enRetard.length} en retard</span>` : ""}` : "Tout est réglé", "", enRetard.length ? "alert" : "")}
      ${K("Projets en cours", I.proj, projCours.length, projRetard.length ? `<span class="down">${projRetard.length} en retard</span> · ${nbClients} client${pl(nbClients)}` : `${nbClients} client${pl(nbClients)} · ${ann.length - nbClients} prospect${pl(ann.length - nbClients)}`, "", projRetard.length ? "alert" : "")}
    </div>

    <div class="row2">
      <div class="card">
        <div class="card-h"><div><h3>Recettes et dépenses ${y}</h3><p>Montants réellement encaissés et dépensés, mois par mois</p></div>
          <div class="seg" role="group" aria-label="Affichage"><button class="on" data-mode="mois">Mensuel</button><button data-mode="cumul">Cumulé</button></div></div>
        <div class="lg"><span><i style="background:#4470FF"></i>Recettes</span><span><i style="background:#FF8A8F"></i>Dépenses</span></div>
        <div class="cw" id="lcw"></div>
      </div>
      <div class="card">
        <div class="card-h"><div><h3>Objectif ${y}</h3><p>Chiffre d’affaires encaissé</p></div></div>
        <div class="gauge"><svg viewBox="0 0 220 130" aria-hidden="true"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#2F5BFF"/><stop offset="1" stop-color="#B4C6FF"/></linearGradient></defs>
          <path class="g-bg" d="M20 115a90 90 0 0 1 180 0" fill="none" stroke-linecap="round"/>
          <path class="g-v" d="M20 115a90 90 0 0 1 180 0" fill="none" stroke-linecap="round" stroke-dasharray="${ARC}" stroke-dashoffset="${ARC * (1 - pct)}"/></svg>
          <div class="g-num"><b>${obj ? Math.round(pct * 100) + " %" : eur(annee)}</b><small>${obj ? "de l’objectif atteint" : "encaissés cette année"}</small></div></div>
        <div class="g-foot"><div><small>Encaissé</small><b>${eur(annee)}</b></div><div><small>${obj ? "Reste à faire" : "Revenu régulier"}</small><b>${obj ? eur(Math.max(0, obj - annee)) : eur(mrr) + "/mois"}</b></div></div>
        <label class="obj">Objectif annuel<input id="objIn" inputmode="decimal" value="${obj || ""}" placeholder="ex. 10000"> €</label>
      </div>
    </div>

    <div class="row2b">
      <div class="panel">
        <h3>À faire <span class="count">${todo.length}</span></h3>
        ${todo.length ? `<ul class="todo">${todo.map((x, i) => `<li><button data-todo="${i}"><span class="tag ${x.c}">${esc(x.k)}</span><b>${esc(x.txt || "Sans nom")}</b><small>${esc(x.sub)}</small></button></li>`).join("")}</ul>` : `<p class="calm">Rien en attente. Bon moment pour prospecter.</p>`}
      </div>
      <div class="panel">
        <h3>Prochains rendez-vous</h3>
        ${rdvs.length ? `<ul class="agenda">${rdvs.map(d => { const x = new Date(d.rdvJour + "T12:00:00"); return `<li><div class="cal"><small>${x.toLocaleDateString("fr-FR", { weekday: "short" })}</small><b>${x.getDate()}</b><small>${MOIS_C[x.getMonth()]}</small></div><div><b>${esc(d.rdvHeure.replace(":", " h "))} · ${esc(d.entreprise || d.nom)}</b><small>${esc(d.mode || "")}${d.tel ? " · " + `<a href="tel:${esc(d.tel)}">${esc(d.tel)}</a>` : ""}</small></div></li>`; }).join("")}</ul>` : `<p class="calm">Aucun rendez-vous confirmé à venir.</p>`}
      </div>
    </div>

    <div class="row2b">
      <div class="panel">
        <h3>Répartition des ventes</h3>
        ${repL.length ? (() => { let off = 0; const C = 2 * Math.PI * 52;
          return `<div class="donut"><svg viewBox="0 0 150 150" aria-hidden="true"><circle cx="75" cy="75" r="52" fill="none" stroke="rgba(255,255,255,.06)"/>${repL.map(([k, v]) => { const len = v / repT * C, s = `<circle cx="75" cy="75" r="52" fill="none" stroke="${COUL[k]}" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}"/>`; off += len; return s; }).join("")}</svg>
          <ul>${repL.map(([k, v]) => `<li><i style="background:${COUL[k]}"></i><span>${k}</span><b>${Math.round(v / repT * 100)} %</b></li>`).join("")}</ul></div>`; })() : `<p class="calm">La répartition apparaîtra dès ton premier devis accepté.</p>`}
      </div>
      <div class="panel">
        <h3>Entonnoir${tauxSign != null ? ` <span class="count">${tauxSign} % de devis signés</span>` : ""}</h3>
        <div class="funnel">${steps.map(([l, v]) => `<div class="f-row"><span>${l}</span><div class="f-bar"><i style="width:${Math.max(v ? 6 : 0, v / maxStep * 100)}%"></i></div><b>${v}</b></div>`).join("")}</div>
      </div>
    </div>

    <div class="row2b">
      <div class="panel">
        <h3>Abonnements maintenance <span class="count">${eur(mrr)} / mois</span></h3>
        ${abos.length ? `<ul class="abos">${abos.map(d => `<li><div><b>${esc(d.entreprise || d.nom)}</b><small>${d.maintFin ? "Arrêté le " + esc(d.maintFin) : "Depuis le " + esc(d.dateAccept || d.date || "")}</small></div>
          <div class="r">${eur(lignesMaint(d).reduce((u, l) => u + num(l.pu), 0))}<small>/ mois</small>${d.maintFin ? "" : `<button data-stop="${d.id}">Arrêter</button>`}</div></li>`).join("")}</ul>` : `<p class="calm">Aucun abonnement. Ils apparaissent ici quand un devis accepté contient une ligne « Maintenance ».</p>`}
      </div>
      <div class="panel">
        <h3>Cotisations et livre des recettes</h3>
        <div class="mini">
          <div><small>À mettre de côté</small><b>${t ? eur(annee * t / 100) : "—"}</b></div>
          <div><small>Taux</small><b><input id="tauxIn" inputmode="decimal" value="${t || ""}" placeholder="—" aria-label="Taux de cotisations en pourcentage" style="width:56px;height:28px;padding:0 6px;border-radius:8px;font-size:14px;text-align:center"> %</b></div>
          <div><small>Base ${y}</small><b>${eur(annee)}</b></div>
        </div>
        <button class="exp" id="expR" style="margin:0">Exporter le livre des recettes ${y}</button>
      </div>
    </div>
  </div>`;

  // courbe recettes / dépenses
  const drawChart = mode => {
    const cum = a => { let s = 0; return a.map(v => s += v); };
    const R = mode === "cumul" ? cum(recM) : recM, D = mode === "cumul" ? cum(depM) : depM;
    const etroit = $("lcw").clientWidth < 520, W = etroit ? 420 : 760, H = etroit ? 300 : 250, L = etroit ? 38 : 48, B = 26, T = 10, max = Math.max(100, ...R, ...D);
    const step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step;
    const x = i => L + i * (W - L - 10) / 11, yv = v => T + (H - T - B) * (1 - v / top);
    // les mois à venir ne sont pas tracés
    const path = a => a.slice(0, mo + 1).map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + yv(v).toFixed(1)).join(" ");
    const area = path(R) + ` L${x(mo)} ${yv(0)} L${x(0)} ${yv(0)} Z`;
    const ticks = [0, .25, .5, .75, 1].map(k => top * k);
    $("lcw").innerHTML = `<svg class="lc" viewBox="0 0 ${W} ${H}" role="img" aria-label="Recettes et dépenses ${y}">
      <defs><linearGradient id="ar" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2F5BFF" stop-opacity=".35"/><stop offset="1" stop-color="#2F5BFF" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map(v => `<line class="gr" x1="${L}" x2="${W - 10}" y1="${yv(v)}" y2="${yv(v)}"/><text x="${L - 8}" y="${yv(v) + 4}" text-anchor="end">${v >= 1000 ? (v / 1000).toLocaleString("fr-FR") + " k" : Math.round(v)}</text>`).join("")}
      ${MOIS_C.map((m, i) => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" ${i === mo ? 'style="fill:#fff"' : ""}>${m.replace(".", "")}</text>`).join("")}
      <path d="${area}" fill="url(#ar)"/><path class="s2" d="${path(D)}"/><path class="s1" d="${path(R)}"/>
      <line class="hov" id="hov" x1="0" x2="0" y1="${T}" y2="${H - B}" style="display:none"/>
      ${R.map((v, i) => i <= mo ? `<circle class="dot" cx="${x(i)}" cy="${yv(v)}" r="${i === mo ? 4.5 : 3}"/>` : "").join("")}
      ${MOIS_C.map((_, i) => `<rect class="hit" data-i="${i}" x="${x(i) - (W - L) / 24}" y="0" width="${(W - L) / 12}" height="${H}"/>`).join("")}
    </svg><div class="tip" id="tip"></div>`;
    const svg = $("lcw").querySelector("svg"), tip = $("tip"), hov = $("hov");
    svg.querySelectorAll(".hit").forEach(r => {
      const show = () => { const i = +r.dataset.i, bx = svg.getBoundingClientRect(), sc = bx.width / W;
        hov.style.display = ""; hov.setAttribute("x1", x(i)); hov.setAttribute("x2", x(i));
        tip.innerHTML = `<b>${MOIS_C[i]} ${y}</b>Recettes ${eur(R[i])}<br>Dépenses ${eur(D[i])}`;
        tip.style.left = (x(i) * sc) + "px"; tip.style.top = (yv(Math.max(R[i], D[i])) * sc) + "px"; tip.style.opacity = 1; };
      r.addEventListener("mouseenter", show); r.addEventListener("click", show);
    });
    svg.addEventListener("mouseleave", () => { tip.style.opacity = 0; hov.style.display = "none"; });
  };
  drawChart("mois");
  document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => { document.querySelectorAll("[data-mode]").forEach(z => z.classList.toggle("on", z === b)); drawChart(b.dataset.mode); });

  document.querySelectorAll("[data-todo]").forEach(b => b.onclick = () => todo[+b.dataset.todo].go());
  document.querySelectorAll("[data-stop]").forEach(b => b.onclick = async () => {
    if (!confirm("Arrêter cet abonnement maintenance ?")) return;
    await updateDoc(doc(db, "devis", b.dataset.stop), { maintFin: today() });
    await load();
  });
  $("tauxIn").onchange = e => { try { localStorage.setItem("taux-urssaf", String(num(e.target.value))); } catch {} renderDash(); };
  $("objIn").onchange = e => { try { localStorage.setItem("objectif-ca", String(num(e.target.value))); } catch {} renderDash(); };
  $("expR").onclick = () => exportRecettes(y);
}

// ================= CLIENTS =================
const cleClient = o => String(o.email || o.entreprise || o.nom || "").trim().toLowerCase();
const idClient = k => k.replace(/[\/#\[\]$.]/g, "_").slice(0, 140) || "sans-nom";
function annuaire(){
  const map = new Map();
  const add = (k, patch) => { if (!k) return; const c = map.get(k) || { key: k, devis: [], factures: [], rdv: [], projets: [] }; map.set(k, Object.assign(c, patch)); return c; };
  // fiches enregistrées
  data.clients.forEach(c => add(c.key || c.id, { fiche: c, entreprise: c.entreprise, nom: c.nom, email: c.email, tel: c.tel }));
  const lier = (d, liste) => {
    const k = cleClient(d); if (!k) return;
    const c = add(k, {});
    c.entreprise = c.entreprise || d.entreprise; c.nom = c.nom || d.nom; c.email = c.email || d.email; c.tel = c.tel || d.tel;
    c[liste].push(d);
  };
  data.devis.forEach(d => lier(d, isRdvDoc(d) ? "rdv" : "devis"));
  data.factures.forEach(f => lier(f, "factures"));
  data.projets.forEach(p => { const c = p.clientKey && map.get(p.clientKey); if (c) c.projets.push(p); });
  return [...map.values()].map(c => {
    c.ca = c.factures.reduce((s, f) => s + paye(f), 0);
    c.etape = etapeDe(c);
    c.archive = !!(c.fiche && c.fiche.archive);
    c.client = c.ca > 0 || c.devis.some(d => d.statut === "accepte") || c.etape === "gagne";
    const dates = [...c.devis, ...c.factures, ...c.rdv].map(docDate).filter(Boolean);
    if (c.fiche && c.fiche.cree) dates.push(frDate(c.fiche.cree));
    c.derniere = dates.length ? new Date(Math.max(...dates)) : null;
    return c;
  });
}

function bandeauRegles(k){
  return data[k].bloque ? `<div class="warn">Cet onglet a besoin des nouvelles règles Firestore. Publie-les dans Firebase, puis recharge la page.</div>` : "";
}

function renderClients(){
  const tout = annuaire(), nbA = tout.filter(c => c.archive).length;
  let list = filtreC === "archives" ? tout.filter(c => c.archive) : tout.filter(c => !c.archive);
  const nbC = list.filter(c => c.client).length, nbP = list.length - nbC;
  if (filtreC === "clients") list = list.filter(c => c.client);
  if (filtreC === "prospects") list = list.filter(c => !c.client);
  const q = rechC.trim().toLowerCase();
  if (q) list = list.filter(c => [c.entreprise, c.nom, c.email, c.tel].some(v => String(v || "").toLowerCase().includes(q)));
  list.sort((a, b) => (b.derniere || 0) - (a.derniere || 0));
  $("items").innerHTML = `${bandeauRegles("clients")}
    <div class="bar cbar">
      <input id="rechC" placeholder="Rechercher un client" value="${esc(rechC)}" aria-label="Rechercher">
      <select id="filtreC" aria-label="Filtrer"><option value="tous">Tous (${nbC + nbP})</option><option value="clients" ${filtreC === "clients" ? "selected" : ""}>Clients (${nbC})</option><option value="prospects" ${filtreC === "prospects" ? "selected" : ""}>Prospects (${nbP})</option><option value="archives" ${filtreC === "archives" ? "selected" : ""}>Archivés (${nbA})</option></select>
      <button class="pri" id="newC">Nouveau contact</button>
    </div>
    ${list.length ? list.map(c => `<button class="item" data-c="${esc(c.key)}">
      <div><strong>${esc(c.entreprise || c.nom || c.email)}</strong><small>${esc([c.nom !== c.entreprise ? c.nom : "", c.email, c.tel].filter(Boolean).join(" · "))}</small>
        ${tagContact(c)}</div>
      <div class="r">${c.ca ? eur(c.ca) : "—"}<small>${c.derniere ? "Dernier contact " + c.derniere.toLocaleDateString("fr-FR") : ""}</small></div>
    </button>`).join("") : `<div class="empty">Aucun contact${q ? " pour cette recherche" : ""}. Les clients apparaissent ici dès qu'ils font une demande, ou ajoute un prospect rencontré en démarchage.</div>`}`;
  $("rechC").oninput = e => { rechC = e.target.value; const pos = e.target.selectionStart; renderClients(); const r = $("rechC"); r.focus(); r.setSelectionRange(pos, pos); };
  $("filtreC").onchange = e => { filtreC = e.target.value; renderClients(); };
  $("newC").onclick = () => { ficheRetour = "clients"; ficheKey = "__nouveau"; renderFiche(ficheKey); };
  document.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { ficheRetour = "clients"; ficheKey = b.dataset.c; renderFiche(ficheKey); });
}

function renderFiche(key){
  const nouveau = key === "__nouveau";
  const c = nouveau ? { key: "", devis: [], factures: [], rdv: [], projets: [], ca: 0, etape: "nouveau" } : annuaire().find(x => x.key === key);
  if (!c) { ficheKey = null; return renderClients(); }
  const f = c.fiche || {};
  const v = k => esc(f[k] ?? c[k] ?? "");
  const histo = [
    ...c.devis.map(d => ({ d: docDate(d), t: "Devis", lab: `${d.numero || "Demande"} · ${d.formule || ""}`, st: STATUTS.devis[statutD(d)] || d.statut, cl: "t-" + statutD(d), m: total(d), go: () => openDoc("devis", d.id) })),
    ...c.factures.map(x => ({ d: docDate(x), t: "Facture", lab: x.numero || "", st: STATUTS.factures[statutF(x)], cl: "t-" + statutF(x), m: total(x), go: () => openDoc("factures", x.id) })),
    ...c.rdv.map(r => ({ d: docDate(r), t: "Rendez-vous", lab: quand(r), st: STATUTS_RDV[r.statut] || r.statut, cl: "t-" + r.statut, m: null, go: () => { tab = "rdv"; renderList(); } })),
    ...data.documents.filter(o => o.clientKey && o.clientKey === c.key).map(o => ({ d: frDate(o.date), t: "Document", lab: o.titre || "", st: o.categorie || "Document", cl: "t-nouveau", m: null, go: () => { tab = "documents"; docEdit = o.id; renderList(); } })),
    ...c.projets.map(p => ({ d: p.debut ? new Date(p.debut + "T12:00") : null, t: "Projet", lab: `${p.titre || "Projet"} · ${avancement(p)} %`, st: STATUTS_P[p.statut] || p.statut, cl: "t-" + (p.statut === "enligne" ? "accepte" : "envoye"), m: null, go: () => { tab = "projets"; projetOuvert = p.id; renderList(); } }))
  ].sort((a, b) => (b.d || 0) - (a.d || 0));
  const facturé = c.factures.reduce((s, x) => s + total(x), 0);
  $("items").innerHTML = `${bandeauRegles("clients")}
  <div class="bar"><button id="backC">${ficheRetour === "prospects" ? "Retour aux prospects" : "Tous les contacts"}</button>${nouveau ? "" : `<button id="devisC">Créer un devis</button><button id="projC">Créer un projet</button><button id="archC">${c.archive ? "Désarchiver" : "Archiver"}</button>`}<span class="msg" id="msgC"></span></div>
  <div class="grid2">
    <div class="panel fiche">
      <h3>${nouveau ? "Nouveau contact" : esc(c.entreprise || c.nom || c.email)} ${nouveau ? "" : tagContact(c)}</h3>
      <div class="cols3">
        <label>Étape<select id="cEt">${Object.entries(ETAPES).map(([k, l]) => `<option value="${k}" ${c.etape === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Source<select id="cSo"><option value="">—</option>${SOURCES.map(s => `<option ${f.source === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <label>Prochaine relance<input id="cRe" type="date" value="${esc(f.relance || "")}"></label>
      </div>
      <label>Entreprise<input id="cE" value="${v("entreprise")}"></label>
      <label>Contact<input id="cN" value="${v("nom")}"></label>
      <label>E-mail<input id="cM" type="email" value="${v("email")}"></label>
      <label>Téléphone<input id="cT" type="tel" value="${v("tel")}"></label>
      <label>Adresse<input id="cA" value="${v("adresse")}"></label>
      <label>Site actuel<input id="cS" value="${v("site")}" placeholder="https://"></label>
      <label>Notes<textarea id="cO" rows="5" placeholder="Rencontré le…, à rappeler en…, veut…">${v("notes")}</textarea></label>
      <button class="pri" id="saveC">Enregistrer</button>
    </div>
    <div class="panel">
      ${nouveau ? `<p class="calm">Enregistre le contact, son historique s'affichera ici au fil des demandes, devis et factures.</p>` : `
      <div class="mini">
        <div><small>Encaissé</small><b>${eur(c.ca)}</b></div>
        <div><small>Facturé</small><b>${eur(facturé)}</b></div>
        <div><small>Devis</small><b>${c.devis.length}</b></div>
      </div>
      <h3>Historique</h3>
      ${histo.length ? `<ul class="todo">${histo.map((x, i) => `<li><button data-h="${i}"><span class="tag ${x.cl}">${x.t} · ${esc(x.st)}</span><b>${esc(x.lab)}${x.m != null ? " · " + eur(x.m) : ""}</b><small>${x.d ? x.d.toLocaleDateString("fr-FR") : ""}</small></button></li>`).join("")}</ul>` : `<p class="calm">Pas encore d'échange enregistré.</p>`}`}
    </div>
  </div>`;
  $("backC").onclick = () => { ficheKey = null; if (ficheRetour === "prospects") { tab = "prospects"; renderList(); } else renderClients(); };
  if ($("projC")) $("projC").onclick = () => { tab = "projets"; projetOuvert = "__nouveau"; projetPreset = { clientKey: c.key }; renderList(); };
  if ($("archC")) $("archC").onclick = async () => {
    try { await majContact(c, { archive: !c.archive }); await load(); tab = "clients"; ficheKey = c.key; renderList(); $("msgC").textContent = c.archive ? "Contact désarchivé." : "Contact archivé : il n'apparaît plus dans les listes."; }
    catch (e) { $("msgC").textContent = "Échec : vérifie les règles Firestore."; }
  };
  document.querySelectorAll("[data-h]").forEach(b => b.onclick = () => histo[+b.dataset.h].go());
  if ($("devisC")) $("devisC").onclick = () => openDoc("devis", null, { entreprise: $("cE").value, nom: $("cN").value, email: $("cM").value, adresse: $("cA").value, statut: "envoye" });
  $("saveC").onclick = async () => {
    const fiche = { entreprise: $("cE").value.trim(), nom: $("cN").value.trim(), email: $("cM").value.trim(), tel: $("cT").value.trim(), adresse: $("cA").value.trim(), site: $("cS").value.trim(), notes: $("cO").value,
      source: $("cSo").value, relance: $("cRe").value };
    const et = $("cEt").value;
    if (et !== c.etape || nouveau) { fiche.etape = et; fiche.etapeDate = today(); }
    const k = nouveau ? cleClient(fiche) : c.key;
    if (!k) { $("msgC").textContent = "Indique au moins une entreprise ou un e-mail."; return; }
    fiche.key = k; fiche.cree = f.cree || today();
    try { await setDoc(doc(db, "clients", idClient(k)), fiche, { merge: true }); await load(); tab = "clients"; ficheKey = k; renderList(); $("msgC").textContent = "Enregistré."; }
    catch (e) { $("msgC").textContent = "Échec : vérifie les règles Firestore."; }
  };
}

// ================= PROSPECTS =================
const ETAPES = { nouveau: "Nouveau", contacte: "Contacté", rdv: "RDV prévu", devis: "Devis envoyé", gagne: "Gagné", perdu: "Perdu" };
const ORDRE_ET = ["nouveau", "contacte", "rdv", "devis", "gagne"];
const SOURCES = ["Porte-à-porte", "Téléphone", "Site internet", "Bouche-à-oreille", "Réseaux sociaux", "Autre"];
const isoJour = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// étape : la plus avancée entre celle choisie à la main et celle déduite des devis / rendez-vous
function etapeDe(c){
  const auto = c.devis.some(d => d.statut === "accepte") ? "gagne"
    : c.devis.some(d => d.statut === "envoye") ? "devis"
    : c.rdv.some(r => r.statut !== "refuse") ? "rdv" : "nouveau";
  const main = c.fiche && c.fiche.etape;
  if (main === "perdu") return auto === "gagne" ? "gagne" : "perdu";
  if (!main || !ORDRE_ET.includes(main)) return auto;
  return ORDRE_ET.indexOf(main) >= ORDRE_ET.indexOf(auto) ? main : auto;
}
function tagContact(c){
  if (c.archive) return `<span class="tag t-archive">Archivé</span>`;
  return c.client ? `<span class="tag t-accepte">Client</span>` : `<span class="tag t-nouveau">Prospect · ${ETAPES[c.etape] || "Nouveau"}</span>`;
}
// crée ou complète la fiche Firestore d'un contact (même s'il ne vient que d'une demande du site)
function majContact(c, patch){
  const base = { key: c.key, cree: (c.fiche && c.fiche.cree) || today() };
  ["entreprise", "nom", "email", "tel"].forEach(k => { if (!(c.fiche && c.fiche[k]) && c[k]) base[k] = c[k]; });
  return setDoc(doc(db, "clients", idClient(c.key)), { ...base, ...patch }, { merge: true });
}
function relancesDues(){
  const auj = isoJour();
  return annuaire().filter(c => !c.archive && !c.client && c.etape !== "perdu" && c.fiche && c.fiche.relance && c.fiche.relance <= auj);
}

function renderProspects(){
  const auj = isoJour(), il60 = Date.now() - 60 * 864e5;
  let list = annuaire().filter(c => !c.archive && (!c.client || c.etape === "gagne"));
  // gagnés et perdus : seulement ceux des 60 derniers jours, pour garder le tableau lisible
  list = list.filter(c => !["gagne", "perdu"].includes(c.etape) || (c.derniere && c.derniere.getTime() > il60) || (c.fiche && frDate(c.fiche.etapeDate) && frDate(c.fiche.etapeDate).getTime() > il60));
  const q = rechP.trim().toLowerCase();
  if (q) list = list.filter(c => [c.entreprise, c.nom, c.email, c.tel, c.fiche && c.fiche.notes].some(v => String(v || "").toLowerCase().includes(q)));
  const actifs = list.filter(c => !["gagne", "perdu"].includes(c.etape)).length;
  const dues = relancesDues().length;
  const gagnes = annuaire().filter(c => c.etape === "gagne").length, perdus = annuaire().filter(c => c.etape === "perdu").length;
  const conv = gagnes + perdus ? Math.round(gagnes / (gagnes + perdus) * 100) : null;
  const carte = c => {
    const r = c.fiche && c.fiche.relance, due = r && r <= auj && !["gagne", "perdu"].includes(c.etape);
    return `<article class="pc ${due ? "due" : ""}">
      <button class="pc-o" data-pc="${esc(c.key)}"><b>${esc(c.entreprise || c.nom || c.email)}</b>
        <small>${esc([c.entreprise && c.nom !== c.entreprise ? c.nom : "", c.fiche && c.fiche.source].filter(Boolean).join(" · ")) || "&nbsp;"}</small>
        ${r ? `<span class="pc-r">${due ? "Relance à faire" : "Relance"} · ${new Date(r + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>` : ""}</button>
      <div class="pc-f">${c.tel ? `<a href="tel:${esc(c.tel.replace(/\s/g, ""))}" aria-label="Appeler">${esc(c.tel)}</a>` : `<span>${c.derniere ? c.derniere.toLocaleDateString("fr-FR") : ""}</span>`}
        <select data-et="${esc(c.key)}" aria-label="Changer l'étape">${Object.entries(ETAPES).map(([k, l]) => `<option value="${k}" ${c.etape === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    </article>`;
  };
  $("items").innerHTML = `${bandeauRegles("clients")}
    <div class="bar cbar">
      <input id="rechP" placeholder="Rechercher un prospect" value="${esc(rechP)}" aria-label="Rechercher">
      <button class="pri" id="newP">Nouveau prospect</button>
    </div>
    <div class="mini pstats">
      <div><small>Prospects actifs</small><b>${actifs}</b></div>
      <div><small>Relances à faire</small><b class="${dues ? "down" : ""}">${dues}</b></div>
      <div><small>Taux de transformation</small><b>${conv == null ? "—" : conv + " %"}</b></div>
    </div>
    <div class="kanban">${Object.entries(ETAPES).map(([k, l]) => { const col = list.filter(c => c.etape === k).sort((a, b) => ((a.fiche && a.fiche.relance) || "9999").localeCompare((b.fiche && b.fiche.relance) || "9999"));
      return `<section class="kcol k-${k}"><h4>${l}<span>${col.length}</span></h4>${col.map(carte).join("") || `<p class="kvide">Vide</p>`}</section>`; }).join("")}</div>`;
  $("rechP").oninput = e => { rechP = e.target.value; const pos = e.target.selectionStart; renderProspects(); const r = $("rechP"); r.focus(); r.setSelectionRange(pos, pos); };
  $("newP").onclick = () => { ficheRetour = "prospects"; tab = "clients"; ficheKey = "__nouveau"; renderList(); };
  document.querySelectorAll("[data-pc]").forEach(b => b.onclick = () => { ficheRetour = "prospects"; tab = "clients"; ficheKey = b.dataset.pc; renderList(); });
  document.querySelectorAll("[data-et]").forEach(s => s.onchange = async () => {
    const c = annuaire().find(x => x.key === s.dataset.et); if (!c) return;
    s.disabled = true;
    try { await majContact(c, { etape: s.value, etapeDate: today() }); await load(); }
    catch (e) { s.disabled = false; alert("Échec : vérifie les règles Firestore."); }
  });
}

// ================= PROJETS =================
const STATUTS_P = { demarrage: "À démarrer", maquette: "Maquette", dev: "Développement", retours: "Retours client", enligne: "En ligne", pause: "En pause" };
const COUL_P = { demarrage: "t-nouveau", maquette: "t-nouveau", dev: "t-nouveau", retours: "t-envoye", enligne: "t-accepte", pause: "t-archive" };
let projetPreset = null;
function tachesDefaut(devis){
  const s = devis ? (devis.lignes || []).map(l => l.des || "").join(" ").toLowerCase() + " " + (devis.formule || "").toLowerCase() : "";
  const t = ["Contenus reçus (textes, photos, logo)", "Maquette validée par le client", "Pages intégrées", "Retouches · tour 1", "Retouches · tour 2"];
  if (/premium/.test(s)) t.push("Retouches · tour 3");
  t.push("Référencement de base", "Nom de domaine branché", "Mise en ligne");
  if (/google/.test(s)) t.push("Fiche Google créée");
  t.push("Accès remis au client");
  return t.map(x => ({ t: x, ok: false }));
}
const avancement = p => { const t = p.taches || []; return t.length ? Math.round(t.filter(x => x.ok).length / t.length * 100) : 0; };
const projetEnRetard = p => p.echeance && !["enligne", "pause"].includes(p.statut) && p.echeance < isoJour();
const facturesDe = p => data.factures.filter(f => (f.projetId && f.projetId === p.id) || (p.devisNum && f.devisRef === p.devisNum));
function echeanceTxt(p){
  if (!p.echeance) return "";
  const j = Math.round((new Date(p.echeance + "T12:00") - new Date(isoJour() + "T12:00")) / 864e5);
  if (p.statut === "enligne") return "Livré";
  return j < 0 ? `<span class="down">En retard de ${-j} j</span>` : j === 0 ? "Livraison aujourd’hui" : `Livraison dans ${j} j`;
}

function renderProjets(){
  let list = [...data.projets];
  const nCours = list.filter(p => p.statut !== "enligne").length, nLiv = list.length - nCours;
  if (filtreJ === "cours") list = list.filter(p => p.statut !== "enligne");
  if (filtreJ === "livres") list = list.filter(p => p.statut === "enligne");
  const q = rechJ.trim().toLowerCase();
  if (q) list = list.filter(p => [p.titre, p.client, p.devisNum].some(v => String(v || "").toLowerCase().includes(q)));
  list.sort((a, b) => (projetEnRetard(b) - projetEnRetard(a)) || (a.echeance || "9999").localeCompare(b.echeance || "9999"));
  $("items").innerHTML = `${bandeauRegles("projets")}
    <div class="bar cbar">
      <input id="rechJ" placeholder="Rechercher un projet" value="${esc(rechJ)}" aria-label="Rechercher">
      <div class="seg" role="group" aria-label="Filtrer"><button data-fj="cours" class="${filtreJ === "cours" ? "on" : ""}">En cours (${nCours})</button><button data-fj="livres" class="${filtreJ === "livres" ? "on" : ""}">Livrés (${nLiv})</button><button data-fj="tous" class="${filtreJ === "tous" ? "on" : ""}">Tous</button></div>
      <button class="pri" id="newJ">Nouveau projet</button>
    </div>
    ${list.length ? `<div class="pgrid">${list.map(p => { const a = avancement(p), suiv = (p.taches || []).find(x => !x.ok), enc = facturesDe(p).reduce((s, f) => s + paye(f), 0);
      return `<button class="pj ${projetEnRetard(p) ? "late" : ""}" data-pj="${p.id}">
        <div class="pj-h"><b>${esc(p.titre || "Projet sans titre")}</b><span class="tag ${COUL_P[p.statut] || "t-nouveau"}">${STATUTS_P[p.statut] || "À démarrer"}</span></div>
        <small>${esc(p.client || "Sans client")}${p.devisNum ? " · " + esc(p.devisNum) : ""}</small>
        <div class="pj-p"><div class="f-bar"><i style="width:${a}%"></i></div><b>${a} %</b></div>
        <small class="pj-n">${suiv ? "Prochaine étape : " + esc(suiv.t) : (p.taches || []).length ? "Toutes les étapes sont faites" : "Aucune étape"}</small>
        <div class="pj-f"><span>${echeanceTxt(p) || "Pas de date de livraison"}</span><span>${p.montant ? eur(enc) + " / " + eur(p.montant) : enc ? eur(enc) + " encaissés" : ""}</span></div>
      </button>`; }).join("")}</div>`
    : `<div class="empty">${data.projets.length ? "Aucun projet dans ce filtre." : "Aucun projet. Crée-en un ici, depuis une fiche client, ou avec le bouton « Créer le projet » d'un devis accepté."}</div>`}`;
  $("rechJ").oninput = e => { rechJ = e.target.value; const pos = e.target.selectionStart; renderProjets(); const r = $("rechJ"); r.focus(); r.setSelectionRange(pos, pos); };
  document.querySelectorAll("[data-fj]").forEach(b => b.onclick = () => { filtreJ = b.dataset.fj; renderProjets(); });
  $("newJ").onclick = () => { projetOuvert = "__nouveau"; projetPreset = null; renderProjet(projetOuvert); };
  document.querySelectorAll("[data-pj]").forEach(b => b.onclick = () => { projetOuvert = b.dataset.pj; renderProjet(projetOuvert); });
}

function renderProjet(id){
  const nouveau = id === "__nouveau";
  let p;
  if (nouveau) {
    const pr = projetPreset || {}, dv = pr.devisId && data.devis.find(d => d.id === pr.devisId);
    const cl = pr.clientKey && annuaire().find(c => c.key === pr.clientKey);
    p = { titre: dv ? `Site ${dv.entreprise || dv.nom || ""}`.trim() : cl ? `Site ${cl.entreprise || cl.nom || ""}`.trim() : "", clientKey: pr.clientKey || "", devisId: pr.devisId || "", statut: "demarrage", debut: isoJour(), echeance: "", taches: tachesDefaut(dv), liens: "", notes: "" };
  } else {
    p = data.projets.find(x => x.id === id);
    if (!p) { projetOuvert = null; return renderProjets(); }
    p = JSON.parse(JSON.stringify(p));
  }
  titre("Production · Projets", nouveau ? "Nouveau projet" : (p.titre || "Projet"));
  const contacts = annuaire().filter(c => !c.archive || c.key === p.clientKey).sort((a, b) => String(a.entreprise || a.nom || a.email).localeCompare(String(b.entreprise || b.nom || b.email)));
  const optsDevis = k => { const c = annuaire().find(x => x.key === k); return `<option value="">Aucun</option>` + (c ? c.devis : []).map(d => `<option value="${d.id}" ${d.id === p.devisId ? "selected" : ""}>${esc(d.numero || "Demande")} · ${eur(total(d))} · ${esc(STATUTS.devis[d.statut] || d.statut)}</option>`).join(""); };
  const liens = l => String(l || "").split(/\n+/).map(s => s.trim()).filter(Boolean);

  const dessinerDroite = () => {
    const a = avancement(p), dv = p.devisId && data.devis.find(d => d.id === p.devisId);
    const fx = nouveau ? [] : facturesDe({ ...p, id, devisNum: dv ? dv.numero : p.devisNum });
    const montant = dv ? total(dv) : num(p.montant), fact = fx.reduce((s, f) => s + total(f), 0), enc = fx.reduce((s, f) => s + paye(f), 0);
    $("pjR").innerHTML = `
      <h3>Avancement <span class="count">${a} %</span></h3>
      <div class="f-bar big"><i style="width:${a}%"></i></div>
      <ul class="chk">${(p.taches || []).map((x, i) => `<li><label><input type="checkbox" data-tk="${i}" ${x.ok ? "checked" : ""}><span>${esc(x.t)}</span></label><button class="x" data-tx="${i}" aria-label="Retirer cette étape">×</button></li>`).join("")}</ul>
      <div class="addt"><input id="newT" placeholder="Ajouter une étape" aria-label="Nouvelle étape"><button id="addT">Ajouter</button></div>
      <h3 style="margin-top:22px">Argent</h3>
      <div class="mini">
        <div><small>Devis</small><b>${montant ? eur(montant) : "—"}</b></div>
        <div><small>Facturé</small><b>${eur(fact)}</b></div>
        <div><small>Encaissé</small><b>${eur(enc)}</b></div>
      </div>
      ${fx.length ? `<ul class="todo">${fx.map(f => `<li><button data-fx="${f.id}"><span class="tag t-${statutF(f)}">Facture · ${STATUTS.factures[statutF(f)]}</span><b>${esc(f.numero || "")} · ${eur(total(f))}</b><small>${esc(f.date || "")}</small></button></li>`).join("")}</ul>` : `<p class="calm">${nouveau ? "Enregistre le projet pour lui rattacher des factures." : "Aucune facture liée."}</p>`}
      ${!nouveau ? `<button id="factJ" style="margin-top:12px;width:100%">Créer une facture pour ce projet</button>` : ""}
      ${!nouveau ? `<h3 style="margin-top:22px">Documents</h3>
      ${data.documents.filter(o => o.projetId === id).map(o => `<div class="pdoc"><b>${esc(o.titre)}</b><div class="liens">${lienListe(o.liens).map(lienHtml).join("")}</div></div>`).join("") || `<p class="calm">Aucun document lié.</p>`}
      <button id="docJ" style="margin-top:10px;width:100%">Ajouter un document</button>` : ""}`;
    document.querySelectorAll("[data-tk]").forEach(cb => cb.onchange = async () => { p.taches[+cb.dataset.tk].ok = cb.checked; await majTaches(); });
    document.querySelectorAll("[data-tx]").forEach(b => b.onclick = async () => { p.taches.splice(+b.dataset.tx, 1); await majTaches(); });
    const ajouter = async () => { const v = $("newT").value.trim(); if (!v) return; p.taches = p.taches || []; p.taches.push({ t: v, ok: false }); await majTaches(); $("newT").focus(); };
    $("addT").onclick = ajouter;
    $("newT").onkeydown = e => { if (e.key === "Enter") ajouter(); };
    document.querySelectorAll("[data-fx]").forEach(b => b.onclick = () => { tab = "factures"; openDoc("factures", b.dataset.fx); });
    if ($("docJ")) $("docJ").onclick = () => { tab = "documents"; docEdit = "__nouveau"; docPreset = { projetId: id, clientKey: p.clientKey, categorie: "Contenus client", retour: id }; renderList(); };
    if ($("factJ")) $("factJ").onclick = () => {
      const c = annuaire().find(x => x.key === p.clientKey) || {};
      tab = "factures";
      openDoc("factures", null, dv ? { entreprise: dv.entreprise, nom: dv.nom, adresse: dv.adresse, email: dv.email, objet: dv.objet || p.titre, lignes: (dv.lignes || []).map(l => ({ ...l })), devisRef: dv.numero, projetId: id }
        : { entreprise: c.entreprise, nom: c.nom, email: c.email, adresse: c.fiche && c.fiche.adresse, objet: p.titre, projetId: id });
    };
  };
  // les cases cochées s'enregistrent tout de suite pour un projet existant
  const majTaches = async () => {
    dessinerDroite();
    if (nouveau) return;
    try { await updateDoc(doc(db, "projets", id), { taches: p.taches }); const o = data.projets.find(x => x.id === id); if (o) o.taches = JSON.parse(JSON.stringify(p.taches)); $("nbJ").textContent = data.projets.filter(projetEnRetard).length || ""; }
    catch (e) { $("msgJ").textContent = "Échec : vérifie les règles Firestore."; }
  };

  $("items").innerHTML = `${bandeauRegles("projets")}
  <div class="bar"><button id="backJ">Tous les projets</button><button class="pri" id="saveJ">Enregistrer</button>${p.clientKey ? `<button id="ficheJ">Fiche client</button>` : ""}${nouveau ? "" : `<button class="dan" id="delJ">Supprimer</button>`}<span class="msg" id="msgJ"></span></div>
  <div class="grid2">
    <div class="panel fiche">
      <label>Nom du projet<input id="jT" value="${esc(p.titre)}" placeholder="Site Garage Bernard"></label>
      <label>Client<select id="jC"><option value="">Choisir un contact</option>${contacts.map(c => `<option value="${esc(c.key)}" ${c.key === p.clientKey ? "selected" : ""}>${esc(c.entreprise || c.nom || c.email)}</option>`).join("")}</select></label>
      <label>Devis lié<select id="jD">${optsDevis(p.clientKey)}</select></label>
      <div class="cols3">
        <label>Statut<select id="jS">${Object.entries(STATUTS_P).map(([k, l]) => `<option value="${k}" ${p.statut === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Début<input id="jB" type="date" value="${esc(p.debut || "")}"></label>
        <label>Livraison prévue<input id="jE" type="date" value="${esc(p.echeance || "")}"></label>
      </div>
      <label>Montant hors devis (si pas de devis lié)<input id="jM" inputmode="decimal" value="${p.montant || ""}" placeholder="—"></label>
      <label>Liens (un par ligne : site en ligne, maquette, dossier des contenus…)<textarea id="jL" rows="3" placeholder="https://">${esc(p.liens || "")}</textarea></label>
      ${liens(p.liens).length ? `<div class="liens">${liens(p.liens).map(u => /^https?:\/\//i.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, "").slice(0, 60))}</a>` : `<span>${esc(u)}</span>`).join("")}</div>` : ""}
      <label>Notes<textarea id="jN" rows="4" placeholder="Couleurs, accès, remarques du client…">${esc(p.notes || "")}</textarea></label>
    </div>
    <div class="panel" id="pjR"></div>
  </div>`;
  dessinerDroite();
  $("jC").onchange = e => { p.clientKey = e.target.value; p.devisId = ""; $("jD").innerHTML = optsDevis(p.clientKey); };
  $("jD").onchange = e => { p.devisId = e.target.value; dessinerDroite(); };
  $("backJ").onclick = () => { projetOuvert = null; renderList(); };
  if ($("ficheJ")) $("ficheJ").onclick = () => { ficheRetour = "clients"; tab = "clients"; ficheKey = p.clientKey; renderList(); };
  $("saveJ").onclick = async () => {
    const ck = $("jC").value, c = annuaire().find(x => x.key === ck), dv = $("jD").value && data.devis.find(d => d.id === $("jD").value);
    const out = { titre: $("jT").value.trim() || "Projet sans titre", clientKey: ck, client: c ? (c.entreprise || c.nom || c.email || "") : "", devisId: dv ? dv.id : "", devisNum: dv ? (dv.numero || "") : "",
      statut: $("jS").value, debut: $("jB").value, echeance: $("jE").value, montant: num($("jM").value), liens: $("jL").value, notes: $("jN").value, taches: p.taches || [] };
    if (out.statut === "enligne" && !p.livre) out.livre = today();
    $("saveJ").disabled = true;
    try {
      if (nouveau) { out.createdAt = serverTimestamp(); const r = await addDoc(collection(db, "projets"), out); projetOuvert = r.id; }
      else await updateDoc(doc(db, "projets", id), out);
      projetPreset = null; await load(); tab = "projets"; renderList(); if ($("msgJ")) $("msgJ").textContent = "Enregistré.";
    } catch (e) { console.error(e); if ($("saveJ")) $("saveJ").disabled = false; if ($("msgJ")) $("msgJ").textContent = "Échec : " + (e.code === "permission-denied" ? "ajoute la règle « projets » dans Firestore." : (e.message || "erreur inconnue")); }
  };
  if ($("delJ")) $("delJ").onclick = async () => {
    if (!confirm("Supprimer ce projet ? Les devis et factures liés ne sont pas touchés.")) return;
    try { await deleteDoc(doc(db, "projets", id)); projetOuvert = null; await load(); }
    catch (e) { $("msgJ").textContent = "Échec : vérifie les règles Firestore."; }
  };
}

// ================= FACTURES ET AVOIRS (liste) =================
function renderFactures(){
  const avo = filtreF === "avoirs";
  const L = (avo ? data.avoirs : data.factures).slice();
  const totDu = data.factures.reduce((s, f) => s + reste(f), 0), nRet = data.factures.filter(enRetardF).length;
  const aVenir = data.factures.filter(f => reste(f) > 0.005 && !enRetardF(f)).sort((a, b) => echeanceF(a) - echeanceF(b))[0];
  $("items").innerHTML = `${avo ? bandeauRegles("avoirs") : ""}
    <div class="bar cbar">
      <div class="seg" role="group" aria-label="Type"><button data-ff="factures" class="${avo ? "" : "on"}">Factures (${data.factures.length})</button><button data-ff="avoirs" class="${avo ? "on" : ""}">Avoirs (${data.avoirs.length})</button></div>
      <span style="flex:1"></span>
      ${avo ? `<span class="calm" style="font-size:13px">Un avoir se crée depuis la facture concernée.</span>` : `<button class="pri" id="newF">Nouvelle facture</button>`}
    </div>
    ${avo ? "" : `<div class="mini pstats">
      <div><small>Reste à encaisser</small><b>${eur(totDu)}</b></div>
      <div><small>En retard</small><b class="${nRet ? "down" : ""}">${nRet}</b></div>
      <div><small>Prochaine échéance</small><b>${aVenir ? echeanceF(aVenir).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}</b></div>
    </div>`}
    ${L.length ? L.map(d => { const s = avo ? d.statut : statutF(d), e = !avo && echeanceF(d);
      return `<button class="item" data-fid="${d.id}">
      <div><strong>${esc(d.entreprise || d.nom || "Sans nom")}</strong>
        <small>${esc(d.numero || "")} · ${esc(d.date || "")}${avo && d.factureRef ? " · sur " + esc(d.factureRef) : ""}</small>
        <small>${!avo && reste(d) > 0.005 && e ? (enRetardF(d) ? `<span class="down">Échéance dépassée depuis le ${e.toLocaleDateString("fr-FR")}</span>` : `Échéance le ${e.toLocaleDateString("fr-FR")}`) : esc((d.lignes && d.lignes[0] && d.lignes[0].des) || "")}</small></div>
      <div class="r"><strong>${avo ? "− " : ""}${eur(total(d))}</strong>${!avo && s === "partielle" ? `<small>reste ${eur(reste(d))}</small>` : "<br>"}
        <span class="tag t-${s}">${esc(STATUTS[avo ? "avoirs" : "factures"][s] || s)}</span></div>
    </button>`; }).join("")
    : `<div class="empty">${avo ? "Aucun avoir. Ouvre une facture et clique sur « Créer un avoir » si tu dois rembourser ou corriger un montant." : "Aucune facture. Crée-en une, ou transforme un devis accepté en facture."}</div>`}`;
  document.querySelectorAll("[data-ff]").forEach(b => b.onclick = () => { filtreF = b.dataset.ff; renderFactures(); });
  if ($("newF")) $("newF").onclick = () => openDoc("factures");
  document.querySelectorAll("[data-fid]").forEach(b => b.onclick = () => openDoc(avo ? "avoirs" : "factures", b.dataset.fid));
}

// ================= RAPPELS =================
const rappelsDus = () => data.rappels.filter(r => !r.fait && r.date && r.date <= isoJour());
function ouvrirRappel(r, jour){
  const nouveau = !r;
  r = r || { titre: "", date: jour || isoJour(), heure: "", note: "", fait: false };
  const ov = document.createElement("div");
  ov.className = "modal";
  ov.innerHTML = `<div class="mbox" role="dialog" aria-modal="true" aria-label="Rappel">
    <h3>${nouveau ? "Nouveau rappel" : "Rappel"}</h3>
    <div class="fiche">
      <label>Quoi<input id="rT" value="${esc(r.titre)}" placeholder="Appeler Dorne Jardins, envoyer la maquette…"></label>
      <div class="cols3"><label>Date<input id="rD" type="date" value="${esc(r.date)}"></label><label>Heure<input id="rH" type="time" value="${esc(r.heure || "")}"></label>
        <label>Fait<select id="rF"><option value="0">Non</option><option value="1" ${r.fait ? "selected" : ""}>Oui</option></select></label></div>
      <label>Note<textarea id="rN" rows="3">${esc(r.note || "")}</textarea></label>
    </div>
    <div class="bar" style="margin:4px 0 0"><button class="pri" id="rS">Enregistrer</button><button id="rC">Annuler</button>${nouveau ? "" : `<button class="dan" id="rX">Supprimer</button>`}<span class="msg" id="rM"></span></div>
  </div>`;
  document.body.appendChild(ov);
  const fermer = () => { ov.remove(); document.removeEventListener("keydown", esc_); };
  const esc_ = e => { if (e.key === "Escape") fermer(); };
  document.addEventListener("keydown", esc_);
  ov.onclick = e => { if (e.target === ov) fermer(); };
  $("rC").onclick = fermer;
  setTimeout(() => $("rT").focus(), 30);
  $("rS").onclick = async () => {
    const out = { titre: $("rT").value.trim(), date: $("rD").value, heure: $("rH").value, note: $("rN").value.trim(), fait: $("rF").value === "1" };
    if (!out.titre || !out.date) { $("rM").textContent = "Indique au moins un titre et une date."; return; }
    try {
      if (nouveau) await addDoc(collection(db, "rappels"), { ...out, createdAt: serverTimestamp() }); else await updateDoc(doc(db, "rappels", r.id), out);
      fermer(); await load();
    } catch (e) { $("rM").textContent = "Échec : ajoute la règle « rappels » dans Firestore."; }
  };
  if ($("rX")) $("rX").onclick = async () => { if (!confirm("Supprimer ce rappel ?")) return; try { await deleteDoc(doc(db, "rappels", r.id)); fermer(); await load(); } catch (e) { $("rM").textContent = "Échec : vérifie les règles Firestore."; } };
}

// ================= PLANNING =================
// tous les événements datés de l'activité, au format { jour: "aaaa-mm-jj", heure, titre, type, go }
function evenements(){
  const E = [], iso = d => d ? isoJour(d) : null;
  data.devis.filter(d => isRdvDoc(d) && d.rdvJour && d.statut !== "refuse").forEach(d => E.push({ jour: d.rdvJour, heure: d.rdvHeure || "", titre: (d.statut === "nouveau" ? "À confirmer · " : "") + "RDV " + (d.entreprise || d.nom || ""), sub: d.mode || "", type: d.statut === "nouveau" ? "rdv attente" : "rdv", go: () => { tab = "rdv"; renderList(); } }));
  data.rappels.forEach(r => E.push({ jour: r.date, heure: r.heure || "", titre: r.titre, sub: r.note || "", type: "rap" + (r.fait ? " fait" : ""), go: () => ouvrirRappel(r) }));
  annuaire().filter(c => !c.archive && !c.client && c.etape !== "perdu" && c.fiche && c.fiche.relance).forEach(c => E.push({ jour: c.fiche.relance, heure: "", titre: "Relancer " + (c.entreprise || c.nom || ""), sub: ETAPES[c.etape], type: "rel", go: () => { ficheRetour = "prospects"; tab = "clients"; ficheKey = c.key; renderList(); } }));
  data.projets.filter(p => p.echeance && p.statut !== "enligne").forEach(p => E.push({ jour: p.echeance, heure: "", titre: "Livraison · " + (p.titre || "Projet"), sub: `${avancement(p)} % fait`, type: "proj", go: () => { tab = "projets"; projetOuvert = p.id; renderList(); } }));
  data.factures.filter(f => reste(f) > 0.005 && echeanceF(f)).forEach(f => E.push({ jour: iso(echeanceF(f)), heure: "", titre: "Échéance " + (f.numero || "facture"), sub: `${f.entreprise || f.nom || ""} · ${eur(reste(f))}`, type: "fac", go: () => { tab = "factures"; openDoc("factures", f.id); } }));
  data.devis.filter(d => !isRdvDoc(d) && d.statut === "envoye" && validiteD(d)).forEach(d => E.push({ jour: iso(validiteD(d)), heure: "", titre: "Fin de validité " + (d.numero || "devis"), sub: d.entreprise || d.nom || "", type: "dev", go: () => { tab = "devis"; openDoc("devis", d.id); } }));
  return E.filter(e => e.jour).sort((a, b) => (a.jour + (a.heure || "99")).localeCompare(b.jour + (b.heure || "99")));
}
const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const lundi = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; };

function renderPlanning(){
  const E = evenements(), parJour = {};
  E.forEach(e => (parJour[e.jour] = parJour[e.jour] || []).push(e));
  const auj = isoJour(), d0 = datePl;
  const pill = (e, i) => `<button class="ev ev-${e.type.split(" ").join(" ev-")}" data-ev="${i}" title="${esc(e.titre)}">${e.heure ? `<b>${esc(e.heure.replace(":", "h"))}</b> ` : ""}${esc(e.titre)}</button>`;
  const idx = new Map(E.map((e, i) => [e, i]));
  let titreVue, corps;
  if (vuePl === "mois") {
    const premier = new Date(d0.getFullYear(), d0.getMonth(), 1), debut = lundi(premier);
    titreVue = premier.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    const cases = [...Array(42)].map((_, i) => ajoutJours(debut, i));
    const utiles = cases[35].getMonth() !== d0.getMonth() ? cases.slice(0, 35) : cases;
    corps = `<div class="cal-m"><div class="cal-h">${JOURS.map(j => `<span>${j}</span>`).join("")}</div><div class="cal-g">${utiles.map(c => { const k = isoJour(c), ev = parJour[k] || [];
      return `<div class="cj ${c.getMonth() !== d0.getMonth() ? "hors" : ""} ${k === auj ? "auj" : ""}"><button class="cj-n" data-jour="${k}" aria-label="Voir le ${c.toLocaleDateString("fr-FR")}">${c.getDate()}</button>
        <div class="cj-e">${ev.slice(0, 3).map(e => pill(e, idx.get(e))).join("")}${ev.length > 3 ? `<button class="plus" data-jour="${k}">+${ev.length - 3}</button>` : ""}</div>
        ${ev.length ? `<i class="dots">${ev.slice(0, 4).map(e => `<em class="d-${e.type.split(" ")[0]}"></em>`).join("")}</i>` : ""}</div>`; }).join("")}</div></div>`;
  } else if (vuePl === "semaine") {
    const deb = lundi(d0), jrs = [...Array(7)].map((_, i) => ajoutJours(deb, i));
    titreVue = `Semaine du ${deb.getDate()} ${MOIS_C[deb.getMonth()]} au ${jrs[6].getDate()} ${MOIS_C[jrs[6].getMonth()]} ${jrs[6].getFullYear()}`;
    corps = `<div class="cal-w">${jrs.map(c => { const k = isoJour(c), ev = parJour[k] || [];
      return `<div class="cw-d ${k === auj ? "auj" : ""}"><button class="cw-h" data-jour="${k}"><span>${JOURS[(c.getDay() + 6) % 7]}</span><b>${c.getDate()}</b></button><div class="cw-e">${ev.map(e => pill(e, idx.get(e))).join("") || `<p class="kvide">—</p>`}</div></div>`; }).join("")}</div>`;
  } else {
    const k = isoJour(d0), ev = parJour[k] || [];
    titreVue = d0.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    corps = `<div class="cal-d">${ev.length ? ev.map(e => `<button class="dl-e ev-${e.type.split(" ").join(" ev-")}" data-ev="${idx.get(e)}"><span class="dl-t">${e.heure ? esc(e.heure.replace(":", " h ")) : "Journée"}</span><span><b>${esc(e.titre)}</b><small>${esc(e.sub || "")}</small></span></button>`).join("") : `<p class="calm" style="padding:20px 4px">Rien de prévu ce jour-là.</p>`}
      <button id="addRj" class="add-r">Ajouter un rappel ce jour-là</button></div>`;
  }
  $("items").innerHTML = `${bandeauRegles("rappels")}
    <div class="bar cbar pl-bar">
      <div class="pl-nav"><button id="plP" aria-label="Précédent">‹</button><button id="plT">Aujourd’hui</button><button id="plN" aria-label="Suivant">›</button></div>
      <h2 class="pl-t">${titreVue.charAt(0).toUpperCase() + titreVue.slice(1)}</h2>
      <div class="seg" role="group" aria-label="Vue">${[["mois", "Mois"], ["semaine", "Semaine"], ["jour", "Jour"]].map(([k, l]) => `<button data-vue="${k}" class="${vuePl === k ? "on" : ""}">${l}</button>`).join("")}</div>
      <button class="pri" id="addR">Nouveau rappel</button>
    </div>
    ${corps}
    <div class="leg"><span><i class="d-rdv"></i>Rendez-vous</span><span><i class="d-rap"></i>Rappels</span><span><i class="d-rel"></i>Relances</span><span><i class="d-proj"></i>Livraisons</span><span><i class="d-fac"></i>Échéances factures</span><span><i class="d-dev"></i>Fin de devis</span></div>`;
  const pas = s => { const x = new Date(datePl); if (vuePl === "mois") { x.setDate(1); x.setMonth(x.getMonth() + s); } else x.setDate(x.getDate() + (vuePl === "semaine" ? 7 : 1) * s); datePl = x; renderPlanning(); };
  $("plP").onclick = () => pas(-1); $("plN").onclick = () => pas(1);
  $("plT").onclick = () => { datePl = new Date(); renderPlanning(); };
  document.querySelectorAll("[data-vue]").forEach(b => b.onclick = () => { vuePl = b.dataset.vue; renderPlanning(); });
  document.querySelectorAll("[data-jour]").forEach(b => b.onclick = () => { datePl = new Date(b.dataset.jour + "T12:00"); vuePl = "jour"; renderPlanning(); });
  document.querySelectorAll("[data-ev]").forEach(b => b.onclick = e => { e.stopPropagation(); E[+b.dataset.ev].go(); });
  $("addR").onclick = () => ouvrirRappel(null, vuePl === "jour" ? isoJour(datePl) : undefined);
  if ($("addRj")) $("addRj").onclick = () => ouvrirRappel(null, isoJour(datePl));
}

// ================= DOCUMENTS =================
const CATS_DOC = ["Contrat ou devis signé", "Maquette", "Contenus client", "Accès et identifiants", "Administratif", "Justificatif", "Autre"];
const lienListe = s => String(s || "").split(/\n+/).map(x => x.trim()).filter(Boolean);
const lienHtml = u => /^https?:\/\//i.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48))}</a>` : `<span>${esc(u)}</span>`;
let docEdit = null, docPreset = null;
function renderDocuments(){
  // documents enregistrés + justificatifs des dépenses, réunis au même endroit
  const docs = data.documents.map(d => ({ ...d, src: "doc" }))
    .concat(data.depenses.filter(x => lienListe(x.justificatif).length).map(x => ({ id: x.id, titre: `${x.fournisseur || x.categorie} · ${eur(num(x.montant))}`, categorie: "Justificatif", liens: x.justificatif, date: x.date, src: "dep" })));
  let L = docs;
  if (catDoc) L = L.filter(d => d.categorie === catDoc);
  const q = rechDoc.trim().toLowerCase();
  if (q) L = L.filter(d => [d.titre, d.client, d.notes, d.liens, d.categorie].some(v => String(v || "").toLowerCase().includes(q)));
  L.sort((a, b) => (frDate(b.date) || 0) - (frDate(a.date) || 0));
  const e = docEdit === "__nouveau" ? { date: today(), categorie: "Autre", ...(docPreset || {}) } : docEdit ? data.documents.find(d => d.id === docEdit) : null;
  const contacts = annuaire().filter(c => !c.archive || (e && c.key === e.clientKey));
  $("items").innerHTML = `${bandeauRegles("documents")}
    ${e ? `<div class="panel fiche" style="margin-bottom:14px">
      <h3>${docEdit === "__nouveau" ? "Ajouter un document" : "Modifier le document"}</h3>
      <label>Nom<input id="oT" value="${esc(e.titre || "")}" placeholder="Devis signé Garage Bernard, logo HD…"></label>
      <div class="cols3"><label>Catégorie<select id="oC">${CATS_DOC.map(c => `<option ${e.categorie === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label>Client<select id="oK"><option value="">—</option>${contacts.map(c => `<option value="${esc(c.key)}" ${c.key === e.clientKey ? "selected" : ""}>${esc(c.entreprise || c.nom || c.email)}</option>`).join("")}</select></label>
        <label>Projet<select id="oP"><option value="">—</option>${data.projets.map(p => `<option value="${p.id}" ${p.id === e.projetId ? "selected" : ""}>${esc(p.titre || "Projet")}</option>`).join("")}</select></label></div>
      <label>Liens (un par ligne : OneDrive, Google Drive, WeTransfer…)<textarea id="oL" rows="3" placeholder="https://">${esc(e.liens || "")}</textarea></label>
      <label>Note<input id="oN" value="${esc(e.notes || "")}"></label>
      <div class="bar" style="margin:4px 0 0"><button class="pri" id="oS">Enregistrer</button><button id="oX">Annuler</button>${docEdit !== "__nouveau" ? `<button class="dan" id="oD">Supprimer</button>` : ""}<span class="msg" id="oM"></span></div>
    </div>` : ""}
    <div class="bar cbar">
      <input id="rechO" placeholder="Rechercher un document" value="${esc(rechDoc)}" aria-label="Rechercher">
      <select id="catO" aria-label="Catégorie"><option value="">Toutes les catégories (${docs.length})</option>${CATS_DOC.map(c => { const n = docs.filter(d => d.categorie === c).length; return n ? `<option ${catDoc === c ? "selected" : ""}>${c}</option>` : ""; }).join("")}</select>
      ${e ? "" : `<button class="pri" id="newO">Ajouter un document</button>`}
    </div>
    ${L.length ? `<div class="dgrid">${L.map(d => `<div class="dc">
      <div class="dc-h"><span class="tag ${d.src === "dep" ? "t-envoye" : "t-nouveau"}">${esc(d.categorie || "Autre")}</span><small>${esc(d.date || "")}</small></div>
      <b>${esc(d.titre || "Sans nom")}</b>
      ${d.client || d.projetId ? `<small>${esc([d.client, (data.projets.find(p => p.id === d.projetId) || {}).titre].filter(Boolean).join(" · "))}</small>` : ""}
      <div class="liens">${lienListe(d.liens).map(lienHtml).join("") || `<span class="calm">Aucun lien</span>`}</div>
      ${d.notes ? `<small>${esc(d.notes)}</small>` : ""}
      <button class="dc-m" data-${d.src === "dep" ? "dep" : "od"}="${d.id}">${d.src === "dep" ? "Voir la dépense" : "Modifier"}</button>
    </div>`).join("")}</div>`
    : `<div class="empty">${docs.length ? "Aucun document pour cette recherche." : "Aucun document. Range ici tes devis signés, maquettes, contenus clients ou papiers administratifs, sous forme de liens vers ton OneDrive ou ton Google Drive."}</div>`}`;
  $("rechO").oninput = ev => { rechDoc = ev.target.value; const pos = ev.target.selectionStart; renderDocuments(); const r = $("rechO"); r.focus(); r.setSelectionRange(pos, pos); };
  $("catO").onchange = ev => { catDoc = ev.target.value; renderDocuments(); };
  if ($("newO")) $("newO").onclick = () => { docEdit = "__nouveau"; docPreset = null; renderDocuments(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  document.querySelectorAll("[data-od]").forEach(b => b.onclick = () => { docEdit = b.dataset.od; renderDocuments(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  document.querySelectorAll("[data-dep]").forEach(b => b.onclick = () => { depEdit = b.dataset.dep; tab = "depenses"; renderList(); });
  if ($("oX")) $("oX").onclick = () => { docEdit = null; docPreset = null; renderDocuments(); };
  if ($("oS")) $("oS").onclick = async () => {
    const k = $("oK").value, c = annuaire().find(x => x.key === k);
    const out = { titre: $("oT").value.trim(), categorie: $("oC").value, clientKey: k, client: c ? (c.entreprise || c.nom || c.email || "") : "", projetId: $("oP").value, liens: $("oL").value.trim(), notes: $("oN").value.trim(), date: e.date || today() };
    if (!out.titre || !out.liens) { $("oM").textContent = "Indique un nom et au moins un lien."; return; }
    try {
      if (docEdit === "__nouveau") await addDoc(collection(db, "documents"), { ...out, createdAt: serverTimestamp() }); else await updateDoc(doc(db, "documents", docEdit), out);
      const retour = docPreset && docPreset.retour; docEdit = null; docPreset = null; await load();
      if (retour) { tab = "projets"; projetOuvert = retour; renderList(); }
    } catch (err) { $("oM").textContent = "Échec : ajoute la règle « documents » dans Firestore."; }
  };
  if ($("oD")) $("oD").onclick = async () => { if (!confirm("Supprimer ce document ? Le fichier lui-même reste sur ton Drive.")) return; try { await deleteDoc(doc(db, "documents", docEdit)); docEdit = null; await load(); } catch (err) { $("oM").textContent = "Échec : vérifie les règles Firestore."; } };
}

// ================= DÉPENSES =================
const CATS = ["Nom de domaine", "Logiciels et abonnements", "Matériel", "Transport", "Téléphone et internet", "Publicité", "Formation", "Banque et assurance", "Autre"];
function renderDepenses(){
  const y = new Date().getFullYear();
  const L = data.depenses.slice().sort((a, b) => (frDate(b.date) || 0) - (frDate(a.date) || 0));
  const deLAnnee = L.filter(x => (frDate(x.date) || new Date(0)).getFullYear() === y);
  const tot = deLAnnee.reduce((s, x) => s + num(x.montant), 0);
  const parCat = CATS.map(c => [c, deLAnnee.filter(x => x.categorie === c).reduce((s, x) => s + num(x.montant), 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
  const maxC = Math.max(1, ...parCat.map(x => x[1]));
  const e = depEdit ? data.depenses.find(x => x.id === depEdit) || {} : {};
  $("items").innerHTML = `${bandeauRegles("depenses")}
  <div class="grid2">
    <div class="panel">
      <h3>${depEdit ? "Modifier la dépense" : "Ajouter une dépense"}</h3>
      <div class="dform">
        <label>Date<input id="xD" value="${esc(e.date || today())}" placeholder="jj/mm/aaaa"></label>
        <label>Montant (€)<input id="xM" inputmode="decimal" value="${esc(e.montant ?? "")}" placeholder="0,00"></label>
        <label class="wide">Fournisseur<input id="xF" value="${esc(e.fournisseur || "")}" placeholder="OVH, SNCF, Apple…"></label>
        <label class="wide">Catégorie<select id="xC">${CATS.map(c => `<option ${e.categorie === c ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label class="wide">Justificatifs (un lien par ligne)<textarea id="xJ" rows="2" placeholder="Lien vers la facture (OneDrive, Google Drive…)">${esc(e.justificatif || "")}</textarea></label>
        <label class="wide">Note<input id="xN" value="${esc(e.note || "")}"></label>
      </div>
      <div class="bar" style="margin:14px 0 0"><button class="pri" id="xSave">${depEdit ? "Enregistrer" : "Ajouter"}</button>${depEdit ? `<button id="xCancel">Annuler</button><button class="dan" id="xDel">Supprimer</button>` : ""}<span class="msg" id="xMsg"></span></div>
    </div>
    <div class="panel">
      <h3>Charges ${y} <span class="count">${eur(tot)}</span></h3>
      ${parCat.length ? `<div class="funnel">${parCat.map(([c, v]) => `<div class="f-row cat"><span>${esc(c)}</span><div class="f-bar"><i style="width:${Math.max(6, v / maxC * 100)}%"></i></div><b>${Math.round(v).toLocaleString("fr-FR")} €</b></div>`).join("")}</div>` : `<p class="calm">Aucune dépense cette année.</p>`}
    </div>
  </div>
  <div class="panel" style="margin-top:14px">
    <h3>Toutes les dépenses</h3>
    ${L.length ? `<ul class="abos">${L.map(x => `<li><div><b>${esc(x.fournisseur || x.categorie)}</b><small>${esc(x.date)} · ${esc(x.categorie)}${lienListe(x.justificatif).length ? " · " + lienListe(x.justificatif).map((u, i, a) => /^https?:\/\//i.test(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener">justificatif${a.length > 1 ? " " + (i + 1) : ""}</a>` : esc(u)).join(" · ") : " · <span class='nojust'>sans justificatif</span>"}</small></div>
      <div class="r">${eur(num(x.montant))}<button data-x="${x.id}">Modifier</button></div></li>`).join("")}</ul>` : `<p class="calm">Rien pour l'instant.</p>`}
  </div>`;
  $("xSave").onclick = async () => {
    const payload = { date: $("xD").value.trim(), montant: num($("xM").value), fournisseur: $("xF").value.trim(), categorie: $("xC").value, justificatif: $("xJ").value.trim(), note: $("xN").value.trim() };
    if (!frDate(payload.date) || !payload.montant) { $("xMsg").textContent = "Indique une date (jj/mm/aaaa) et un montant."; return; }
    try {
      if (depEdit) await updateDoc(doc(db, "depenses", depEdit), payload);
      else await addDoc(collection(db, "depenses"), { ...payload, createdAt: serverTimestamp() });
      depEdit = null; await load(); tab = "depenses"; renderList();
    } catch (err) { $("xMsg").textContent = "Échec : vérifie les règles Firestore."; }
  };
  if ($("xCancel")) $("xCancel").onclick = () => { depEdit = null; renderDepenses(); };
  if ($("xDel")) $("xDel").onclick = async () => { if (!confirm("Supprimer cette dépense ?")) return; await deleteDoc(doc(db, "depenses", depEdit)); depEdit = null; await load(); tab = "depenses"; renderList(); };
  document.querySelectorAll("[data-x]").forEach(b => b.onclick = () => { depEdit = b.dataset.x; renderDepenses(); window.scrollTo({ top: 0, behavior: "smooth" }); });
}

// ================= LIVRE DES RECETTES (export) =================
function exportRecettes(annee){
  const lignes = [];
  data.factures.forEach(f => {
    const nature = (f.lignes || []).map(l => l.des).filter(Boolean).join(" + ");
    const client = f.entreprise || f.nom || "";
    const R = reglements(f);
    R.forEach((p, i) => lignes.push([p.date, f.numero + (R.length > 1 ? ` (règlement ${i + 1}/${R.length})` : ""), client, nature, p.montant, p.mode]));
  });
  data.avoirs.filter(a => a.statut === "rembourse").forEach(a => lignes.push([frDate(a.dateRemb) || docDate(a), a.numero + " (avoir remboursé)", a.entreprise || a.nom || "", a.objet || "Avoir", -total(a), a.modePaiement || "Virement"]));
  const L = lignes.filter(l => l[0] && l[0].getFullYear() === annee).sort((a, b) => a[0] - b[0]);
  const cell = v => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [["Date d'encaissement", "Référence", "Client", "Nature de la prestation", "Montant (€)", "Mode de règlement"].map(cell).join(";"),
    ...L.map(l => [l[0].toLocaleDateString("fr-FR"), l[1], l[2], l[3], l[4].toFixed(2).replace(".", ","), l[5]].map(cell).join(";")),
    ["", "", "", "Total", L.reduce((s, l) => s + l[4], 0).toFixed(2).replace(".", ","), ""].map(cell).join(";")].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `livre-des-recettes-${annee}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
}

async function reserverNumero(kind, dateStr) {
  const an = (frDate(dateStr) || new Date()).getFullYear();
  const p = PREFIXES[kind] + an + "-";
  const maxLocal = data[kind].map(d => d.numero || "").filter(n => n.startsWith(p)).map(n => parseInt(n.slice(p.length)) || 0).reduce((a, b) => Math.max(a, b), 0);
  try {
    const ref = doc(db, "compteurs", kind + "-" + an);
    const n = await runTransaction(db, async t => {
      const s = await t.get(ref);
      const suiv = Math.max(s.exists() ? (s.data().n || 0) : 0, maxLocal) + 1;
      t.set(ref, { n: suiv });
      return suiv;
    });
    return p + String(n).padStart(3, "0");
  } catch (e) {
    // règles Firestore pas encore à jour : on garde l'ancien calcul
    console.warn("Compteur indisponible", e);
    return p + String(maxLocal + 1).padStart(3, "0");
  }
}

const PREFIXES = { devis: "D-", factures: "F-", avoirs: "AV-" };
function nextNum(kind) {
  const p = PREFIXES[kind] + new Date().getFullYear() + "-";
  const max = data[kind].map(d => d.numero || "").filter(n => n.startsWith(p)).map(n => parseInt(n.slice(p.length)) || 0).reduce((a, b) => Math.max(a, b), 0);
  return p + String(max + 1).padStart(3, "0");
}

function openDoc(kind, id, preset) {
  const base = id ? JSON.parse(JSON.stringify(data[kind].find(d => d.id === id), (k, v) => k === "createdAt" ? undefined : v)) : (preset || {});
  if (!base.lignes) base.lignes = base.formule ? [{ des: base.formule, qte: 1, pu: num(base.prix) }] : [{ des: "", qte: 1, pu: 0 }];
  let provisoire = null;
  if (!base.numero) { base.numero = nextNum(kind); provisoire = base.numero; }
  if (!base.date) base.date = today();
  if (!base.statut) base.statut = kind === "devis" ? "brouillon" : kind === "avoirs" ? "emis" : "attente";
  if (!base.conditions) base.conditions = kind === "devis" ? COND_DEVIS : kind === "avoirs" ? COND_AVOIR : COND_FACT;
  const plus30 = () => ajoutJours(frDate(base.date) || new Date(), 30).toLocaleDateString("fr-FR");
  if (kind === "devis" && !base.validite) base.validite = plus30();
  if (kind === "factures") {
    if (!base.echeance) base.echeance = plus30();
    // ancien format (acompte + statut) converti en liste de paiements
    if (!Array.isArray(base.paiements)) base.paiements = reglements(base).map(p => ({ date: p.date ? p.date.toLocaleDateString("fr-FR") : today(), montant: p.montant, mode: p.mode }));
  }
  cur = { kind, id: id || null, d: base, provisoire };
  renderEditor();
}

function renderEditor() {
  const { kind, d } = cur;
  const isD = kind === "devis", isF = kind === "factures", isA = kind === "avoirs";
  const NOM = isD ? "Devis" : isA ? "Avoir" : "Facture";
  titre(isD ? "Commercial · Devis" : "Gestion · " + (isA ? "Avoirs" : "Factures"), NOM + " " + (d.numero || ""));
  $("list").classList.add("hide");
  const ed = $("editor");
  ed.classList.remove("hide");
  ed.innerHTML = `
  <div class="bar">
    <button id="back">Retour</button>
    <button class="pri" id="save">Enregistrer</button>
    <button id="print">Imprimer ou PDF</button>
    ${isD && cur.id ? `<button id="toF">Transformer en facture</button>` : ""}
    ${isD && cur.id && d.statut === "accepte" ? `<button id="toP">${data.projets.some(p => p.devisId === cur.id) ? "Voir le projet" : "Créer le projet"}</button>` : ""}
    ${isF && cur.id ? `<button id="toAv">Créer un avoir</button>` : ""}
    ${cur.id ? `<button class="dan" id="del">Supprimer</button>` : ""}
    ${isF ? `<span class="tag t-${statutF(d)}" id="stF" style="margin:0">${STATUTS.factures[statutF(d)]}</span>`
      : `<select id="statut" aria-label="Statut">${Object.entries(STATUTS[kind]).filter(([k]) => k !== "expire").map(([k, v]) => `<option value="${k}" ${d.statut === k ? "selected" : ""}>${v}</option>`).join("")}</select>`}
    ${isD && statutD(d) === "expire" ? `<span class="tag t-expire" style="margin:0">Expiré depuis le ${validiteD(d).toLocaleDateString("fr-FR")}</span>` : ""}
    ${isA ? `<label class="inl" id="rembL" ${d.statut === "rembourse" ? "" : "hidden"}>Remboursé le <input id="rembD" value="${esc(d.dateRemb || today())}"></label>` : ""}
    <span class="msg" id="msg"></span>
  </div>
  <div class="doc">
    <div class="dh">
      <div class="logo"><b>M</b><div>Studio <span>Mel</span><small>Création de sites web · Région lyonnaise</small></div></div>
      <div class="ty"><h2>${NOM.toUpperCase()}</h2>
        <input data-k="numero" value="${esc(d.numero)}" aria-label="Numéro"><br>
        <input data-k="date" value="${esc(d.date)}" aria-label="Date">
        ${isD ? `<small class="dl">Valable jusqu’au <input data-k="validite" value="${esc(d.validite)}" aria-label="Date de validité"></small>` : ""}
        ${isF ? `<small class="dl">Échéance <input data-k="echeance" value="${esc(d.echeance)}" aria-label="Date d'échéance"></small>` : ""}
        ${isA && d.factureRef ? `<small class="dl">Sur facture ${esc(d.factureRef)}</small>` : ""}</div>
    </div>
    <div class="cols">
      <div class="f"><h3>Émetteur</h3>
        <input data-k="emNom" value="${esc(d.emNom || "Mel · Studio Mel")}" aria-label="Nom">
        <input data-k="emAdr" value="${esc(d.emAdr || "[Adresse]")}" aria-label="Adresse">
        <input data-k="emSiret" value="${esc(d.emSiret || "SIRET : [à compléter]")}" aria-label="SIRET">
        <input data-k="emMail" value="${esc(d.emMail || "studio-mel@outlook.fr")}" aria-label="E-mail"></div>
      <div class="f"><h3>Client</h3>
        <input data-k="entreprise" value="${esc(d.entreprise)}" placeholder="Entreprise">
        <input data-k="nom" value="${esc(d.nom)}" placeholder="Nom du contact">
        <input data-k="adresse" value="${esc(d.adresse)}" placeholder="Adresse">
        <input data-k="email" value="${esc(d.email)}" placeholder="E-mail"></div>
    </div>
    <h3>Objet</h3>
    <input data-k="objet" value="${esc(d.objet || (d.entreprise ? "Site internet de " + d.entreprise : ""))}" placeholder="Objet du ${isD ? "devis" : "document"}">
    <div class="wrap"><table class="dt">
      <thead><tr><th>Désignation</th><th class="n">Qté</th><th class="n">Prix unitaire</th><th class="n">Total</th><th class="x noprint"></th></tr></thead>
      <tbody id="lines"></tbody>
    </table></div>
    <button class="add noprint" id="addL">Ajouter une ligne</button>
    <div class="tot" id="tot"></div>
    ${isF ? `<div class="pay noprint" id="pay"></div>` : ""}
    ${d.message ? `<div class="cm"><strong>Message du client :</strong> ${esc(d.message)}</div>` : ""}
    <h3 style="margin-top:20px">Conditions</h3>
    <textarea data-k="conditions" rows="4">${esc(d.conditions)}</textarea>
    ${isD ? `<div class="sig">Bon pour accord, date et signature du client :<div></div></div>` : ""}
    <div class="foot">Studio Mel · studio-mel@outlook.fr</div>
  </div>`;

  ed.querySelectorAll("[data-k]").forEach(el => el.oninput = () => { cur.d[el.dataset.k] = el.value; });
  if ($("statut")) $("statut").onchange = e => { cur.d.statut = e.target.value; if ($("rembL")) $("rembL").hidden = e.target.value !== "rembourse"; };
  if ($("rembD")) $("rembD").oninput = e => { cur.d.dateRemb = e.target.value; };
  if ($("toAv")) $("toAv").onclick = () => {
    const f = cur.d; tab = "factures"; filtreF = "avoirs";
    openDoc("avoirs", null, { entreprise: f.entreprise, nom: f.nom, adresse: f.adresse, email: f.email, objet: "Avoir sur la facture " + (f.numero || ""), lignes: (f.lignes || []).map(l => ({ ...l })), remise: f.remise, remiseType: f.remiseType, factureRef: f.numero, factureId: cur.id, projetId: f.projetId });
  };
  $("back").onclick = renderList;
  $("save").onclick = save;
  $("print").onclick = () => { const t = document.title; document.title = cur.d.numero + " " + (cur.d.entreprise || ""); window.print(); document.title = t; };
  if ($("pay")) renderPaiements();
  $("addL").onclick = () => { cur.d.lignes.push({ des: "", qte: 1, pu: 0 }); renderLines(); };
  if ($("del")) $("del").onclick = remove;
  if ($("toF")) $("toF").onclick = toFacture;
  if ($("toP")) $("toP").onclick = () => {
    const p = data.projets.find(x => x.devisId === cur.id);
    tab = "projets";
    if (p) projetOuvert = p.id; else { projetOuvert = "__nouveau"; projetPreset = { clientKey: cleClient(cur.d), devisId: cur.id }; }
    renderList();
  };
  renderLines();
}

function renderLines() {
  const L = cur.d.lignes;
  $("lines").innerHTML = L.map((l, i) => `
    <tr><td><input data-i="${i}" data-f="des" value="${esc(l.des)}" placeholder="Prestation"></td>
    <td class="n"><input data-i="${i}" data-f="qte" value="${esc(l.qte)}" inputmode="decimal" style="text-align:right"></td>
    <td class="n"><input data-i="${i}" data-f="pu" value="${esc(l.pu)}" inputmode="decimal" style="text-align:right"></td>
    <td class="n" id="lt${i}">${eur(num(l.qte) * num(l.pu))}</td>
    <td class="x noprint"><button data-rm="${i}" aria-label="Supprimer la ligne">✕</button></td></tr>`).join("");
  $("lines").querySelectorAll("input").forEach(el => el.oninput = () => {
    const i = +el.dataset.i;
    L[i][el.dataset.f] = el.value;
    $("lt" + i).textContent = eur(num(L[i].qte) * num(L[i].pu));
    renderTot();
  });
  $("lines").querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { L.splice(+b.dataset.rm, 1); if (!L.length) L.push({ des: "", qte: 1, pu: 0 }); renderLines(); });
  renderTot();
}

function renderTot() {
  const d = cur.d, b = brut(d), r = montantRemise(d), t = total(d), isF = cur.kind === "factures";
  $("tot").innerHTML = `
    ${r || d.remise ? `<div><span>Sous-total</span><strong>${eur(b)}</strong></div>` : ""}
    <div class="${num(d.remise) ? "" : "noprint"} rem"><span>Remise</span><span class="remi"><input id="remV" value="${esc(d.remise ?? "")}" inputmode="decimal" placeholder="0" aria-label="Remise"><select id="remT" aria-label="Type de remise"><option value="pct" ${d.remiseType !== "eur" ? "selected" : ""}>%</option><option value="eur" ${d.remiseType === "eur" ? "selected" : ""}>€</option></select>${r ? `<b>− ${eur(r)}</b>` : ""}</span></div>
    ${isF && paye(d) ? `<div><span>Total</span><strong>${eur(t)}</strong></div><div><span>Déjà réglé</span><strong>− ${eur(paye(d))}</strong></div>` : ""}
    <div class="big"><span>${isF ? (paye(d) ? "Reste à payer" : "Total à payer") : cur.kind === "avoirs" ? "Montant de l’avoir" : "Total"}</span><span>${eur(isF ? reste(d) : t)}</span></div>`;
  const maj = () => { const pos = document.activeElement && document.activeElement.id; renderTot(); if (pos === "remV") { const i = $("remV"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); } if ($("pay")) renderPaiements(); };
  $("remV").oninput = e => { d.remise = e.target.value; maj(); };
  $("remT").onchange = e => { d.remiseType = e.target.value; maj(); };
}

// paiements d'une facture (acomptes, solde, paiements partiels)
function renderPaiements() {
  const d = cur.d, P = d.paiements || (d.paiements = []), rest = reste(d), t = total(d);
  $("pay").innerHTML = `
    <h3>Paiements reçus <span class="count">${eur(paye(d))} / ${eur(t)}</span></h3>
    ${P.length ? `<ul class="pl">${P.map((p, i) => `<li><span>${esc(p.date)}</span><span>${esc(p.mode || "Virement")}</span><b>${eur(num(p.montant))}</b><button class="x" data-rp="${i}" aria-label="Retirer ce paiement">×</button></li>`).join("")}</ul>` : `<p class="calm">Aucun paiement enregistré.</p>`}
    ${rest > 0.005 ? `<div class="pform">
      <input id="pD" value="${today()}" aria-label="Date du paiement">
      <input id="pM" inputmode="decimal" value="${String(rest).replace(".", ",")}" aria-label="Montant">
      <select id="pMo" aria-label="Mode de règlement">${["Virement", "Chèque", "Espèces", "Carte bancaire"].map(m => `<option ${(d.modePaiement || "Virement") === m ? "selected" : ""}>${m}</option>`).join("")}</select>
      <button class="pri" id="pAdd">Ajouter</button>
    </div>
    <div class="pq"><button data-pq="0.3">Acompte 30 %</button><button data-pq="0.5">Acompte 50 %</button><button data-pq="1">Solde</button></div>` : `<p class="calm ok">Facture entièrement réglée.</p>`}
    <p class="calm" style="margin-top:8px;font-size:13px">Pense à cliquer sur Enregistrer après avoir ajouté un paiement.</p>`;
  const majStatut = () => { const s = statutF(d), el = $("stF"); if (el) { el.className = "tag t-" + s; el.textContent = STATUTS.factures[s]; } };
  document.querySelectorAll("[data-rp]").forEach(b => b.onclick = () => { P.splice(+b.dataset.rp, 1); renderTot(); renderPaiements(); majStatut(); });
  document.querySelectorAll("[data-pq]").forEach(b => b.onclick = () => { const k = +b.dataset.pq; $("pM").value = String(k === 1 ? rest : Math.min(rest, Math.round(t * k * 100) / 100)).replace(".", ","); });
  if ($("pAdd")) $("pAdd").onclick = () => {
    const m = num($("pM").value), dt = $("pD").value.trim();
    if (!m || !frDate(dt)) { $("msg").textContent = "Indique une date (jj/mm/aaaa) et un montant."; return; }
    P.push({ date: dt, montant: m, mode: $("pMo").value }); d.modePaiement = $("pMo").value;
    $("msg").textContent = ""; renderTot(); renderPaiements(); majStatut();
  };
}

async function save() {
  const { kind, id, d } = cur;
  const payload = { ...d };
  delete payload.id;
  payload.lignes = d.lignes.map(l => ({ des: l.des ?? "", qte: num(l.qte), pu: num(l.pu) }));
  // Firestore refuse les champs vides de type « undefined » (ex. adresse jamais remplie) : on les retire
  Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
  payload.remise = num(payload.remise); payload.remiseType = payload.remiseType === "eur" ? "eur" : "pct";
  if (kind === "factures") {
    payload.paiements = (d.paiements || []).map(p => ({ date: p.date, montant: num(p.montant), mode: p.mode || "Virement" }));
    payload.acompte = 0;
    payload.statut = statutF(payload) === "payee" ? "payee" : "attente";
    const der = payload.paiements.map(p => frDate(p.date)).filter(Boolean).sort((a, b) => b - a)[0];
    if (payload.statut === "payee" && der) payload.datePaiement = der.toLocaleDateString("fr-FR");
    else delete payload.datePaiement;
  }
  if (kind === "avoirs" && payload.statut === "rembourse" && !payload.dateRemb) payload.dateRemb = today();
  if (kind === "devis" && payload.statut === "accepte" && !payload.dateAccept) payload.dateAccept = today();
  try {
    // numéro définitif réservé dans Firebase (compteur protégé) : jamais deux documents avec le même numéro
    if (cur.provisoire && payload.numero === cur.provisoire) {
      payload.numero = await reserverNumero(kind, payload.date);
      cur.d.numero = payload.numero; cur.provisoire = null;
    }
    if (id) await updateDoc(doc(db, kind, id), payload);
    else { payload.createdAt = serverTimestamp(); const r = await addDoc(collection(db, kind), payload); cur.id = r.id; }
    await load();
    tab = kind === "avoirs" ? "factures" : kind;
    $("msg").textContent = "";
    openDoc(kind, cur.id);
    $("msg").textContent = "Enregistré.";
  } catch (e) {
    console.error(e);
    $("msg").style.color = "var(--ko)";
    $("msg").textContent = "Échec de l'enregistrement : " + (e.code === "permission-denied" ? "accès refusé par les règles Firestore." : (e.message || "erreur inconnue"));
  }
}

async function remove() {
  if (!confirm("Supprimer définitivement ce document ?")) return;
  await deleteDoc(doc(db, cur.kind, cur.id));
  await load();
}

function toFacture() {
  const d = cur.d;
  const t = total(d);
  tab = "factures";
  openDoc("factures", null, {
    entreprise: d.entreprise, nom: d.nom, adresse: d.adresse, email: d.email,
    objet: d.objet, lignes: d.lignes.map(l => ({ ...l })), remise: d.remise, remiseType: d.remiseType, paiements: [],
    devisRef: d.numero, projetId: (data.projets.find(p => p.devisId === cur.id) || {}).id
  });
}
