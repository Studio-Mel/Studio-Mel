/* Studio Mel · admin des espaces clients */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY", authDomain: "studio-mel-2f2cc.firebaseapp.com", projectId: "studio-mel-2f2cc",
  storageBucket: "studio-mel-2f2cc.firebasestorage.app", messagingSenderId: "604457816435", appId: "1:604457816435:web:cfa47da9d5b08caa6bf506" });
const auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ETAPES = ["Premier échange", "Devis signé", "Maquette", "Création du site", "Mise en ligne", "Suivi"];
const AF = ["Vos textes (présentation, services)", "Vos photos de réalisations", "Votre logo", "L’accès à votre nom de domaine actuel (si vous en avez un)"];
const LIEN = "https://studiomel.eu/espace-client";
let LISTE = [], sel = null, stopMsg = null;
localStorage.setItem("sm-moi", "1");

const ts = x => x && x.toMillis ? x.toMillis() : 0;
function liste(){
  $("cl-liste").innerHTML = LISTE.length ? LISTE.map(c => {
    const nouv = ts(c.dernierClient) > ts(c.vuMel);
    return `<li><button type="button" data-id="${c.id}" class="${sel === c.id ? "on" : ""}"><b>${esc(c.nom || "Sans nom")}${nouv ? '<i class="pt" title="Nouveau message"></i>' : ""}</b><small>${esc(c.projet || "")} · ${ETAPES[c.etape || 0]}</small>${c.validation && c.validation.etat === "modifs" ? '<em class="tg o">Modifs demandées</em>' : c.validation && c.validation.etat === "ok" ? '<em class="tg g">Maquette validée</em>' : ""}</button></li>`;
  }).join("") : '<li class="vide">Aucun client pour l’instant. Crée le premier avec « Nouveau client ».</li>';
}
$("cl-liste").addEventListener("click", e => { const b = e.target.closest("[data-id]"); if (b) ouvrir(b.dataset.id); });
$("cl-nouveau").addEventListener("click", () => ouvrir(null));

function lignes(id, L, champs){
  $(id).innerHTML = L.map((x, i) => `<div class="ln" data-i="${i}">${champs.map(([k, ph]) => k === "fait" ? `<label class="mini"><input type="checkbox" data-k="fait" ${x.fait ? "checked" : ""}> fait</label>` : `<input data-k="${k}" placeholder="${ph}" value="${esc(x[k] || "")}">`).join("")}<button type="button" class="x" title="Retirer">×</button></div>`).join("");
}
function lire(id){ return [...$(id).querySelectorAll(".ln")].map(l => { const o = {}; l.querySelectorAll("[data-k]").forEach(inp => o[inp.dataset.k] = inp.type === "checkbox" ? inp.checked : inp.value.trim()); return o; }); }
["cl-docs", "cl-af"].forEach(id => $(id).addEventListener("click", e => { if (e.target.classList.contains("x")) e.target.closest(".ln").remove(); }));
$("cl-docs-plus").addEventListener("click", () => { const L = lire("cl-docs"); L.push({ t: "", u: "" }); lignes("cl-docs", L, [["t", "Titre (ex. Devis signé)"], ["u", "Lien https://…"]]); });
$("cl-af-plus").addEventListener("click", () => { const L = lire("cl-af"); L.push({ t: "", fait: false }); lignes("cl-af", L, [["t", "Ce que le client doit fournir"], ["fait", ""]]); });

function ouvrir(id){
  sel = id; liste();
  const c = id ? LISTE.find(x => x.id === id) : { nom: "", email: "", projet: "", formule: "", etape: 0, maquette: "", site: "", docs: [], afournir: AF.map(t => ({ t, fait: false })) };
  $("cl-vide").hidden = true; $("cl-fiche").hidden = false;
  $("cl-titre").textContent = id ? c.nom || "Client" : "Nouveau client";
  ["nom", "email", "projet", "formule", "maquette", "site"].forEach(k => $("f-" + k).value = c[k] || "");
  $("f-etape").value = c.etape || 0;
  lignes("cl-docs", c.docs || [], [["t", "Titre (ex. Devis signé)"], ["u", "Lien https://…"]]);
  lignes("cl-af", c.afournir || [], [["t", "Ce que le client doit fournir"], ["fait", ""]]);
  const v = c.validation;
  $("cl-valid").innerHTML = !v ? "Le client n’a pas encore répondu sur la maquette." : v.etat === "ok" ? `<b class="g">✓ Maquette validée</b> le ${esc(v.date)}` : `<b class="o">Modifications demandées</b> le ${esc(v.date)} : « ${esc(v.note)} »`;
  $("cl-valid-reset").hidden = !v;
  $("cl-suppr").hidden = !id; $("cl-msgs-zone").hidden = !id; $("cl-invit").hidden = !id;
  if (id) {
    const mail = encodeURIComponent(c.email), sujet = encodeURIComponent("Votre espace client Studio Mel");
    const corps = encodeURIComponent(`Bonjour ${c.nom || ""},\n\nVotre espace client est prêt ! Vous pourrez y suivre l’avancement de votre site, valider la maquette, retrouver vos documents et m’écrire.\n\nPour y accéder : ${LIEN}\nEntrez simplement cette adresse e-mail (${c.email}), vous recevrez un lien de connexion.\n\nÀ très vite,\nMelvyn · Studio Mel\n06 04 15 98 58`);
    $("cl-invit").href = `mailto:${mail}?subject=${sujet}&body=${corps}`;
    if (ts(c.dernierClient) > ts(c.vuMel)) updateDoc(doc(db, "espaces", id), { vuMel: serverTimestamp() }).catch(() => {});
  }
  if (stopMsg) { stopMsg(); stopMsg = null; }
  if (id) stopMsg = onSnapshot(query(collection(db, "espaces", id, "messages"), orderBy("date")), s => {
    const L = s.docs.map(d => d.data());
    $("cl-msgs").innerHTML = L.length ? L.map(m => { const d = m.date && m.date.toDate ? m.date.toDate() : new Date(); return `<li class="${m.de === "client" ? "cli" : "moi"}"><p>${esc(m.texte).replace(/\n/g, "<br>")}</p><small>${m.de === "client" ? esc(c.nom || "Client") : "Toi"} · ${d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</small></li>`; }).join("") : '<li class="vide">Pas encore de message.</li>';
    $("cl-msgs").scrollTop = $("cl-msgs").scrollHeight;
  });
}

$("cl-enreg").addEventListener("click", async () => {
  const d = { nom: $("f-nom").value.trim(), email: $("f-email").value.trim().toLowerCase(), projet: $("f-projet").value.trim(), formule: $("f-formule").value.trim(),
    etape: +$("f-etape").value, maquette: $("f-maquette").value.trim(), site: $("f-site").value.trim(),
    docs: lire("cl-docs").filter(x => x.t && x.u), afournir: lire("cl-af").filter(x => x.t), maj: serverTimestamp() };
  if (!d.nom || !/^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(d.email)) { st("Il faut au moins un nom et un e-mail valide.", "ko"); return; }
  try {
    if (sel) await updateDoc(doc(db, "espaces", sel), d);
    else { d.creeLe = serverTimestamp(); d.validation = null; const r = await addDoc(collection(db, "espaces"), d); sel = r.id; }
    st("Enregistré ✓", "ok"); setTimeout(() => ouvrir(sel), 300);
  } catch (e) { st(e.code === "permission-denied" ? "Refusé : publie d’abord les règles Firestore (bloc espaces)." : "Erreur : " + e.message, "ko"); }
});
$("cl-valid-reset").addEventListener("click", async () => { if (sel && confirm("Remettre la validation de la maquette à zéro ? (par exemple après tes modifications)")) await updateDoc(doc(db, "espaces", sel), { validation: null }); });
$("cl-suppr").addEventListener("click", async () => { if (sel && confirm("Supprimer cet espace client ? Le client n’y aura plus accès.")) { await deleteDoc(doc(db, "espaces", sel)); sel = null; $("cl-fiche").hidden = true; $("cl-vide").hidden = false; } });
$("cl-copier").addEventListener("click", () => { navigator.clipboard.writeText(LIEN).then(() => st("Lien copié ✓", "ok")); });
$("cl-msg-form").addEventListener("submit", async e => {
  e.preventDefault(); const t = $("cl-msg").value.trim(); if (!t || !sel) return; $("cl-msg").value = "";
  await addDoc(collection(db, "espaces", sel, "messages"), { de: "mel", texte: t, date: serverTimestamp() });
  updateDoc(doc(db, "espaces", sel), { vuMel: serverTimestamp() }).catch(() => {});
});
function st(t, c){ $("st").textContent = t; $("st").className = "st " + (c || ""); setTimeout(() => { if ($("st").textContent === t) $("st").textContent = ""; }, 3500); }

onAuthStateChanged(auth, u => {
  $("login").classList.toggle("hide", !!u); $("app").classList.toggle("hide", !u);
  if (u) onSnapshot(query(collection(db, "espaces"), orderBy("maj", "desc")), s => { LISTE = s.docs.map(d => ({ id: d.id, ...d.data() })); liste(); if (sel && !LISTE.find(x => x.id === sel)) sel = null; },
    e => { if (e.code === "permission-denied") $("err-regles").classList.remove("hide"); });
});
$("lbtn").addEventListener("click", async () => { $("lerr").textContent = ""; try { await signInWithEmailAndPassword(auth, $("lmail").value.trim(), $("lpass").value); } catch (e) { $("lerr").textContent = "Identifiant ou mot de passe incorrect."; } });
$("lpass").addEventListener("keydown", e => { if (e.key === "Enter") $("lbtn").click(); });
