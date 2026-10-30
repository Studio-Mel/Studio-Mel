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
  devis: { nouveau: "Nouvelle demande", envoye: "Envoyé", accepte: "Accepté", refuse: "Refusé" },
  factures: { attente: "En attente", payee: "Payée" }
};
const COND_DEVIS = "Paiement : 50 % à la signature, 50 % à la mise en ligne (ou 30 % / 40 % / 30 % sur accord). 2 tours de retouches inclus, retouches supplémentaires 30 €/h. Délai : 1 à 3 semaines après réception des contenus. Le site et le nom de domaine appartiennent au client après paiement complet. Devis valable 30 jours. TVA non applicable, art. 293 B du CGI.";
const COND_FACT = "Paiement par virement à réception. IBAN : [à compléter]. Pénalités de retard : 3 fois le taux d'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 € (professionnels). Pas d'escompte pour paiement anticipé. TVA non applicable, art. 293 B du CGI.";

let data = { devis: [], factures: [], clients: [], depenses: [] };
let ficheKey = null, filtreC = "tous", rechC = "", depEdit = null;
let tab = "dash";
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
const TITRES = { dash: ["Pilotage", "Tableau de bord"], devis: ["Commercial", "Demandes et devis"], rdv: ["Commercial", "Rendez-vous"], clients: ["Commercial", "Clients"], factures: ["Gestion", "Factures"], depenses: ["Gestion", "Dépenses"] };
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
$("newDevis").onclick = () => openDoc("devis");
$("newFacture").onclick = () => openDoc("factures");

async function load() {
  for (const k of ["devis", "factures"]) {
    const snap = await getDocs(query(collection(db, k), orderBy("createdAt", "desc")));
    data[k] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  // clients et dépenses : si les règles Firestore ne sont pas encore à jour, on continue sans
  for (const k of ["clients", "depenses"]) {
    try { const snap = await getDocs(collection(db, k)); data[k] = snap.docs.map(d => ({ id: d.id, ...d.data() })); }
    catch (e) { console.warn(k, e); data[k] = []; data[k].bloque = true; }
  }
  renderList();
}

const total = d => (d.lignes || [{ qte: 1, pu: num(d.prix) }]).reduce((s, l) => s + num(l.qte) * num(l.pu), 0);

function renderList() {
  $("list").classList.remove("hide");
  $("editor").classList.add("hide");
  $("tabH").classList.toggle("on", tab === "dash");
  $("tabD").classList.toggle("on", tab === "devis");
  $("tabF").classList.toggle("on", tab === "factures");
  $("tabR").classList.toggle("on", tab === "rdv");
  $("tabC").classList.toggle("on", tab === "clients");
  $("tabX").classList.toggle("on", tab === "depenses");
  const nouv = data.devis.filter(d => d.statut === "nouveau").length;
  const acc = data.devis.filter(d => d.statut === "accepte" && d.type !== "rdv" && d.formule !== "Rendez-vous").length;
  const fact = data.factures.reduce((s, f) => s + total(f), 0);
  const enc = data.factures.filter(f => f.statut === "payee").reduce((s, f) => s + total(f), 0);
  $("stats").innerHTML = `
    <div class="stat"><small>Nouvelles demandes</small><div>${nouv}</div></div>
    <div class="stat"><small>Devis acceptés</small><div>${acc}</div></div>
    <div class="stat"><small>Facturé</small><div>${eur(fact)}</div></div>
    <div class="stat"><small>Encaissé</small><div>${eur(enc)}</div></div>`;
  const isRdv = d => d.type === "rdv" || d.formule === "Rendez-vous";
  titre(...(TITRES[tab] || TITRES.dash));
  $("nbD").textContent = data.devis.filter(d => !isRdv(d) && d.statut === "nouveau").length || "";
  $("nbR").textContent = data.devis.filter(d => isRdv(d) && d.statut === "nouveau").length || "";
  $("nbF").textContent = data.factures.filter(f => f.statut !== "payee" && docDate(f) && jours(docDate(f), new Date()) > 30).length || "";
  $("stats").classList.toggle("hide", ["dash", "clients", "depenses", "rdv"].includes(tab));
  if (tab === "dash") return renderDash();
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
        <span class="tag t-${esc(d.statut)}">${esc(STATUTS[tab][d.statut] || d.statut)}</span></div>
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
function encaissements(){
  const out = [];
  data.factures.forEach(f => {
    if (f.statut === "payee") {
      const ac = num(f.acompte);
      if (ac > 0) out.push({ date: docDate(f), montant: ac });
      out.push({ date: frDate(f.datePaiement) || docDate(f), montant: total(f) - ac });
    }
    else if (num(f.acompte) > 0) out.push({ date: docDate(f), montant: num(f.acompte) });
  });
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
  const attente = dem.filter(d => d.statut === "envoye"), acceptes = dem.filter(d => d.statut === "accepte");
  const accAn = acceptes.filter(d => (frDate(d.dateAccept) || docDate(d) || new Date(0)).getFullYear() === y);
  const payees = data.factures.filter(f => f.statut === "payee" && (frDate(f.datePaiement) || docDate(f) || new Date(0)).getFullYear() === y);
  const impayees = data.factures.filter(f => f.statut !== "payee");
  const resteDu = impayees.reduce((s, f) => s + total(f) - num(f.acompte), 0);
  const enRetard = impayees.filter(f => docDate(f) && jours(docDate(f), now) > 30);
  const ann = annuaire(), nbClients = ann.filter(c => c.client).length;

  const I = {
    eur: '<svg viewBox="0 0 24 24"><path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>',
    out: '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>'
  };
  const K = (lab, ic, val, sub, extra = "", cls = "") => `<div class="k ${cls}"><div class="k-h"><small>${lab}</small><span class="k-i">${ic}</span></div><div class="k-v">${val}</div><div class="k-s">${sub}</div>${extra}</div>`;
  const pl = n => n > 1 ? "s" : "";

  // à faire
  const todo = [];
  dem.filter(d => d.statut === "nouveau").forEach(d => todo.push({ k: "Rappeler", c: "t-nouveau", txt: d.entreprise || d.nom, sub: d.formule || "", go: () => openDoc("devis", d.id) }));
  data.devis.filter(d => isRdvDoc(d) && d.statut === "nouveau").forEach(d => todo.push({ k: "Rendez-vous à accepter", c: "t-nouveau", txt: d.entreprise || d.nom, sub: quand(d), go: () => { tab = "rdv"; renderList(); } }));
  attente.filter(d => docDate(d) && jours(docDate(d), now) >= 7).forEach(d => todo.push({ k: "Relancer le devis", c: "t-envoye", txt: d.entreprise || d.nom, sub: `${d.numero || ""} · envoyé il y a ${jours(docDate(d), now)} jours`, go: () => openDoc("devis", d.id) }));
  enRetard.forEach(f => todo.push({ k: "Facture en retard", c: "t-refuse", txt: f.entreprise || f.nom, sub: `${f.numero || ""} · ${eur(total(f) - num(f.acompte))} à encaisser`, go: () => openDoc("factures", f.id) }));

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
      ${K("Clients", I.users, nbClients, `${ann.length - nbClients} prospect${pl(ann.length - nbClients)} · ${eur(mrr)}/mois récurrents`)}
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
  const add = (k, patch) => { if (!k) return; const c = map.get(k) || { key: k, devis: [], factures: [], rdv: [] }; map.set(k, Object.assign(c, patch)); return c; };
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
  return [...map.values()].map(c => {
    c.ca = c.factures.filter(f => f.statut === "payee").reduce((s, f) => s + total(f), 0);
    c.client = c.ca > 0 || c.devis.some(d => d.statut === "accepte");
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
  let list = annuaire();
  const nbC = list.filter(c => c.client).length, nbP = list.length - nbC;
  if (filtreC === "clients") list = list.filter(c => c.client);
  if (filtreC === "prospects") list = list.filter(c => !c.client);
  const q = rechC.trim().toLowerCase();
  if (q) list = list.filter(c => [c.entreprise, c.nom, c.email, c.tel].some(v => String(v || "").toLowerCase().includes(q)));
  list.sort((a, b) => (b.derniere || 0) - (a.derniere || 0));
  $("items").innerHTML = `${bandeauRegles("clients")}
    <div class="bar cbar">
      <input id="rechC" placeholder="Rechercher un client" value="${esc(rechC)}" aria-label="Rechercher">
      <select id="filtreC" aria-label="Filtrer"><option value="tous">Tous (${nbC + nbP})</option><option value="clients" ${filtreC === "clients" ? "selected" : ""}>Clients (${nbC})</option><option value="prospects" ${filtreC === "prospects" ? "selected" : ""}>Prospects (${nbP})</option></select>
      <button class="pri" id="newC">Nouveau contact</button>
    </div>
    ${list.length ? list.map(c => `<button class="item" data-c="${esc(c.key)}">
      <div><strong>${esc(c.entreprise || c.nom || c.email)}</strong><small>${esc([c.nom !== c.entreprise ? c.nom : "", c.email, c.tel].filter(Boolean).join(" · "))}</small>
        <span class="tag ${c.client ? "t-accepte" : "t-nouveau"}">${c.client ? "Client" : "Prospect"}</span></div>
      <div class="r">${c.ca ? eur(c.ca) : "—"}<small>${c.derniere ? "Dernier contact " + c.derniere.toLocaleDateString("fr-FR") : ""}</small></div>
    </button>`).join("") : `<div class="empty">Aucun contact${q ? " pour cette recherche" : ""}. Les clients apparaissent ici dès qu'ils font une demande, ou ajoute un prospect rencontré en démarchage.</div>`}`;
  $("rechC").oninput = e => { rechC = e.target.value; const pos = e.target.selectionStart; renderClients(); const r = $("rechC"); r.focus(); r.setSelectionRange(pos, pos); };
  $("filtreC").onchange = e => { filtreC = e.target.value; renderClients(); };
  $("newC").onclick = () => { ficheKey = "__nouveau"; renderFiche(ficheKey); };
  document.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { ficheKey = b.dataset.c; renderFiche(ficheKey); });
}

function renderFiche(key){
  const nouveau = key === "__nouveau";
  const c = nouveau ? { key: "", devis: [], factures: [], rdv: [], ca: 0 } : annuaire().find(x => x.key === key);
  if (!c) { ficheKey = null; return renderClients(); }
  const f = c.fiche || {};
  const v = k => esc(f[k] ?? c[k] ?? "");
  const histo = [
    ...c.devis.map(d => ({ d: docDate(d), t: "Devis", lab: `${d.numero || "Demande"} · ${d.formule || ""}`, st: STATUTS.devis[d.statut] || d.statut, cl: "t-" + d.statut, m: total(d), go: () => openDoc("devis", d.id) })),
    ...c.factures.map(x => ({ d: docDate(x), t: "Facture", lab: x.numero || "", st: STATUTS.factures[x.statut] || x.statut, cl: "t-" + x.statut, m: total(x), go: () => openDoc("factures", x.id) })),
    ...c.rdv.map(r => ({ d: docDate(r), t: "Rendez-vous", lab: quand(r), st: STATUTS_RDV[r.statut] || r.statut, cl: "t-" + r.statut, m: null, go: () => { tab = "rdv"; renderList(); } }))
  ].sort((a, b) => (b.d || 0) - (a.d || 0));
  const facturé = c.factures.reduce((s, x) => s + total(x), 0);
  $("items").innerHTML = `${bandeauRegles("clients")}
  <div class="bar"><button id="backC">Tous les contacts</button>${nouveau ? "" : `<button id="devisC">Créer un devis</button>`}<span class="msg" id="msgC"></span></div>
  <div class="grid2">
    <div class="panel fiche">
      <h3>${nouveau ? "Nouveau contact" : esc(c.entreprise || c.nom || c.email)} ${nouveau ? "" : `<span class="tag ${c.client ? "t-accepte" : "t-nouveau"}">${c.client ? "Client" : "Prospect"}</span>`}</h3>
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
  $("backC").onclick = () => { ficheKey = null; renderClients(); };
  document.querySelectorAll("[data-h]").forEach(b => b.onclick = () => histo[+b.dataset.h].go());
  if ($("devisC")) $("devisC").onclick = () => openDoc("devis", null, { entreprise: $("cE").value, nom: $("cN").value, email: $("cM").value, adresse: $("cA").value, statut: "envoye" });
  $("saveC").onclick = async () => {
    const fiche = { entreprise: $("cE").value.trim(), nom: $("cN").value.trim(), email: $("cM").value.trim(), tel: $("cT").value.trim(), adresse: $("cA").value.trim(), site: $("cS").value.trim(), notes: $("cO").value };
    const k = nouveau ? cleClient(fiche) : c.key;
    if (!k) { $("msgC").textContent = "Indique au moins une entreprise ou un e-mail."; return; }
    fiche.key = k; fiche.cree = f.cree || today();
    try { await setDoc(doc(db, "clients", idClient(k)), fiche); await load(); tab = "clients"; ficheKey = k; renderList(); $("msgC").textContent = "Enregistré."; }
    catch (e) { $("msgC").textContent = "Échec : vérifie les règles Firestore."; }
  };
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
        <label class="wide">Justificatif (lien)<input id="xJ" value="${esc(e.justificatif || "")}" placeholder="Lien vers la facture (OneDrive, Google Drive…)"></label>
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
    ${L.length ? `<ul class="abos">${L.map(x => `<li><div><b>${esc(x.fournisseur || x.categorie)}</b><small>${esc(x.date)} · ${esc(x.categorie)}${x.justificatif ? ` · <a href="${esc(x.justificatif)}" target="_blank" rel="noopener">justificatif</a>` : " · <span class='nojust'>sans justificatif</span>"}</small></div>
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
    if (f.statut === "payee") {
      const acompte = num(f.acompte), dP = frDate(f.datePaiement) || docDate(f);
      if (acompte > 0) lignes.push([docDate(f), f.numero + " (acompte)", client, nature, acompte, f.modePaiement || "Virement"]);
      lignes.push([dP, f.numero + (acompte > 0 ? " (solde)" : ""), client, nature, total(f) - acompte, f.modePaiement || "Virement"]);
    } else if (num(f.acompte) > 0) lignes.push([docDate(f), f.numero + " (acompte)", client, nature, num(f.acompte), f.modePaiement || "Virement"]);
  });
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
  const p = (kind === "devis" ? "D-" : "F-") + an + "-";
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

function nextNum(kind) {
  const p = (kind === "devis" ? "D-" : "F-") + new Date().getFullYear() + "-";
  const max = data[kind].map(d => d.numero || "").filter(n => n.startsWith(p)).map(n => parseInt(n.slice(p.length)) || 0).reduce((a, b) => Math.max(a, b), 0);
  return p + String(max + 1).padStart(3, "0");
}

function openDoc(kind, id, preset) {
  const base = id ? { ...data[kind].find(d => d.id === id) } : (preset || {});
  if (!base.lignes) base.lignes = base.formule ? [{ des: base.formule, qte: 1, pu: num(base.prix) }] : [{ des: "", qte: 1, pu: 0 }];
  let provisoire = null;
  if (!base.numero) { base.numero = nextNum(kind); provisoire = base.numero; }
  if (!base.date) base.date = today();
  if (!base.statut) base.statut = kind === "devis" ? "nouveau" : "attente";
  if (!base.conditions) base.conditions = kind === "devis" ? COND_DEVIS : COND_FACT;
  if (kind === "factures" && base.acompte == null) base.acompte = 0;
  cur = { kind, id: id || null, d: base, provisoire };
  renderEditor();
}

function renderEditor() {
  const { kind, d } = cur;
  const isD = kind === "devis";
  titre(isD ? "Commercial · Devis" : "Gestion · Factures", (isD ? "Devis " : "Facture ") + (d.numero || ""));
  $("list").classList.add("hide");
  const ed = $("editor");
  ed.classList.remove("hide");
  ed.innerHTML = `
  <div class="bar">
    <button id="back">Retour</button>
    <button class="pri" id="save">Enregistrer</button>
    <button id="print">Imprimer ou PDF</button>
    ${isD && cur.id ? `<button id="toF">Transformer en facture</button>` : ""}
    ${cur.id ? `<button class="dan" id="del">Supprimer</button>` : ""}
    <select id="statut">${Object.entries(STATUTS[kind]).map(([k, v]) => `<option value="${k}" ${d.statut === k ? "selected" : ""}>${v}</option>`).join("")}</select>
    ${isD ? "" : `<select id="modeP" aria-label="Mode de règlement">${["Virement", "Chèque", "Espèces", "Carte bancaire"].map(m => `<option ${ (d.modePaiement || "Virement") === m ? "selected" : ""}>${m}</option>`).join("")}</select>`}
    <span class="msg" id="msg"></span>
  </div>
  <div class="doc">
    <div class="dh">
      <div class="logo"><b>M</b><div>Studio <span>Mel</span><small>Création de sites web · Région lyonnaise</small></div></div>
      <div class="ty"><h2>${isD ? "DEVIS" : "FACTURE"}</h2>
        <input data-k="numero" value="${esc(d.numero)}" aria-label="Numéro"><br>
        <input data-k="date" value="${esc(d.date)}" aria-label="Date"></div>
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
    ${d.message ? `<div class="cm"><strong>Message du client :</strong> ${esc(d.message)}</div>` : ""}
    <h3 style="margin-top:20px">Conditions</h3>
    <textarea data-k="conditions" rows="4">${esc(d.conditions)}</textarea>
    ${isD ? `<div class="sig">Bon pour accord, date et signature du client :<div></div></div>` : ""}
    <div class="foot">Studio Mel · studio-mel@outlook.fr</div>
  </div>`;

  ed.querySelectorAll("[data-k]").forEach(el => el.oninput = () => { cur.d[el.dataset.k] = el.value; });
  $("statut").onchange = e => { cur.d.statut = e.target.value; };
  if ($("modeP")) { if (!cur.d.modePaiement) cur.d.modePaiement = "Virement"; $("modeP").onchange = e => { cur.d.modePaiement = e.target.value; }; }
  $("back").onclick = renderList;
  $("save").onclick = save;
  $("print").onclick = () => { const t = document.title; document.title = cur.d.numero + " " + (cur.d.entreprise || ""); window.print(); document.title = t; };
  $("addL").onclick = () => { cur.d.lignes.push({ des: "", qte: 1, pu: 0 }); renderLines(); };
  if ($("del")) $("del").onclick = remove;
  if ($("toF")) $("toF").onclick = toFacture;
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
  const t = total(cur.d);
  if (cur.kind === "devis") {
    $("tot").innerHTML = `<div class="big"><span>Total</span><span>${eur(t)}</span></div>`;
  } else {
    $("tot").innerHTML = `<div><span>Total</span><strong>${eur(t)}</strong></div>
      <div><span>Acompte déjà versé</span><input id="acp" value="${esc(cur.d.acompte)}" inputmode="decimal"></div>
      <div class="big"><span>Reste à payer</span><span id="rest">${eur(t - num(cur.d.acompte))}</span></div>`;
    $("acp").oninput = e => { cur.d.acompte = e.target.value; $("rest").textContent = eur(t - num(e.target.value)); };
  }
}

async function save() {
  const { kind, id, d } = cur;
  const payload = { ...d };
  delete payload.id;
  payload.lignes = d.lignes.map(l => ({ des: l.des ?? "", qte: num(l.qte), pu: num(l.pu) }));
  // Firestore refuse les champs vides de type « undefined » (ex. adresse jamais remplie) : on les retire
  Object.keys(payload).forEach(k => { if (payload[k] === undefined) delete payload[k]; });
  if (kind === "factures" && payload.statut === "payee" && !payload.datePaiement) payload.datePaiement = today();
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
    tab = kind;
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
    objet: d.objet, lignes: d.lignes.map(l => ({ ...l })), acompte: Math.round(t / 2 * 100) / 100,
    devisRef: d.numero
  });
}
