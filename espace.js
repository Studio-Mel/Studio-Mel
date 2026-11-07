/* Studio Mel · espace client : connexion par lien e-mail, suivi du projet, maquette, documents, messages */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, addDoc, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY", authDomain: "studio-mel-2f2cc.firebaseapp.com", projectId: "studio-mel-2f2cc",
  storageBucket: "studio-mel-2f2cc.firebasestorage.app", messagingSenderId: "604457816435", appId: "1:604457816435:web:cfa47da9d5b08caa6bf506" });
const auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ETAPES = ["Premier échange", "Devis signé", "Maquette", "Création du site", "Mise en ligne", "Suivi"];
const vue = v => ["ec-login", "ec-envoye", "ec-vide", "ec-app", "ec-charge"].forEach(id => $(id).hidden = id !== v);
let espace = null, ref = null, stopMsg = null;

// ---------- connexion par lien e-mail ----------
$("ec-form").addEventListener("submit", async e => {
  e.preventDefault();
  const mail = $("ec-mail").value.trim().toLowerCase(), btn = $("ec-btn");
  if (!/^[^@ ]+@[^@ ]+\.[^@ ]+$/.test(mail)) { $("ec-err").textContent = "Cette adresse e-mail ne semble pas valide."; return; }
  btn.classList.add("loading"); $("ec-err").textContent = "";
  try {
    await sendSignInLinkToEmail(auth, mail, { url: location.origin + "/espace-client", handleCodeInApp: true });
    localStorage.setItem("sm-ec-mail", mail); $("ec-mail-vu").textContent = mail; vue("ec-envoye");
  } catch (err) {
    const c = (err && err.code) || "", M = {
      "auth/operation-not-allowed": "La connexion par lien e-mail n’est pas encore activée sur ce site.",
      "auth/unauthorized-continue-uri": "Ce site n’est pas encore autorisé pour la connexion.",
      "auth/unauthorized-domain": "Ce site n’est pas encore autorisé pour la connexion.",
      "auth/quota-exceeded": "Trop de liens envoyés aujourd’hui. Réessayez demain, ou appelez-moi.",
      "auth/too-many-requests": "Trop de tentatives d’affilée. Patientez quelques minutes.",
      "auth/invalid-email": "Cette adresse e-mail ne semble pas valide.",
      "auth/network-request-failed": "Pas de connexion internet. Vérifiez votre réseau."
    };
    $("ec-err").textContent = (M[c] || "Impossible d’envoyer le lien pour le moment. Réessayez, ou appelez-moi.") + (c ? " (code : " + c.replace("auth/", "") + ")" : "");
  }
  btn.classList.remove("loading");
});
$("ec-autre").addEventListener("click", () => vue("ec-login"));
$("ec-sortir").addEventListener("click", () => signOut(auth));
$("ec-sortir2").addEventListener("click", () => signOut(auth));

(async () => {
  if (isSignInWithEmailLink(auth, location.href)) {
    vue("ec-charge");
    let mail = localStorage.getItem("sm-ec-mail");
    if (!mail) mail = (prompt("Pour confirmer, quelle adresse e-mail avez-vous utilisée ?") || "").trim().toLowerCase();
    try { await signInWithEmailLink(auth, mail, location.href); localStorage.removeItem("sm-ec-mail"); history.replaceState(null, "", "/espace-client"); }
    catch (e) { vue("ec-login"); $("ec-err").textContent = "Ce lien a expiré ou a déjà servi. Demandez-en un nouveau."; }
  }
})();

onAuthStateChanged(auth, u => {
  if (stopMsg) { stopMsg(); stopMsg = null; }
  if (!u) { vue("ec-login"); return; }
  vue("ec-charge");
  onSnapshot(query(collection(db, "espaces"), where("email", "==", (u.email || "").toLowerCase())), snap => {
    if (snap.empty) { $("ec-vide-mail").textContent = u.email; vue("ec-vide"); return; }
    const d = snap.docs[0]; espace = d.data(); ref = doc(db, "espaces", d.id);
    afficher(); vue("ec-app");
    if (!stopMsg) stopMsg = onSnapshot(query(collection(db, "espaces", d.id, "messages"), orderBy("date")), s => messages(s.docs.map(x => x.data())));
  }, () => { vue("ec-vide"); $("ec-vide-mail").textContent = u.email; });
});

// ---------- affichage ----------
function afficher(){
  const e = espace, k = Math.max(0, Math.min(ETAPES.length - 1, e.etape || 0));
  $("ec-nom").textContent = e.nom || "";
  $("ec-projet").textContent = [e.projet, e.formule].filter(Boolean).join(" · ");
  $("ec-etape").textContent = ETAPES[k];
  $("ec-frise").style.setProperty("--p", (k / (ETAPES.length - 1) * 100) + "%");
  $("ec-frise-ol").innerHTML = ETAPES.map((t, i) => `<li class="${i < k ? "fait" : i === k ? "cours" : ""}"><b>${i < k ? "✓" : i + 1}</b><span>${t}</span></li>`).join("");
  // maquette
  const v = e.validation || null, mq = $("ec-maquette");
  mq.hidden = !e.maquette;
  if (e.maquette) {
    $("ec-mq-lien").href = e.maquette;
    const valide = v && v.etat === "ok";
    $("ec-mq-etat").innerHTML = valide ? '<span class="ec-ok">✓ Vous avez validé la maquette</span>' : v && v.etat === "modifs" ? '<span class="ec-att">Modifications demandées, je m’en occupe</span>' : "";
    $("ec-mq-act").hidden = valide;
  }
  // site en ligne
  $("ec-site").hidden = !e.site; if (e.site) $("ec-site-lien").href = e.site;
  // à fournir
  const af = e.afournir || [];
  $("ec-af").innerHTML = af.length ? af.map((x, i) => `<li><label><input type="checkbox" data-i="${i}" ${x.fait ? "checked" : ""}><span>${esc(x.t)}</span></label></li>`).join("") : '<li class="ec-rien">Rien à fournir pour le moment.</li>';
  const n = af.filter(x => x.fait).length; $("ec-af-n").textContent = af.length ? `${n}/${af.length}` : "";
  // documents
  const docs = e.docs || [];
  $("ec-docs").innerHTML = docs.length ? docs.map(x => `<li><a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.t)} <span aria-hidden="true">↗</span></a></li>`).join("") : '<li class="ec-rien">Vos devis, factures et fichiers apparaîtront ici.</li>';
}
$("ec-af").addEventListener("change", async ev => {
  const i = +ev.target.dataset.i; if (isNaN(i)) return;
  const af = (espace.afournir || []).map((x, j) => j === i ? { t: x.t, fait: ev.target.checked } : x);
  try { await updateDoc(ref, { afournir: af }); } catch (e) { ev.target.checked = !ev.target.checked; alert("L’enregistrement n’a pas fonctionné. Réessayez."); }
});
$("ec-ok").addEventListener("click", async () => {
  if (!confirm("Vous validez la maquette ? Je passe ensuite à la création du site.")) return;
  await updateDoc(ref, { validation: { etat: "ok", note: "", date: new Date().toISOString().slice(0, 10) } });
  feter();
});
$("ec-modif").addEventListener("click", () => { $("ec-modif-zone").hidden = false; $("ec-modif-txt").focus(); });
$("ec-modif-env").addEventListener("click", async () => {
  const t = $("ec-modif-txt").value.trim(); if (!t) { $("ec-modif-txt").focus(); return; }
  await updateDoc(ref, { validation: { etat: "modifs", note: t.slice(0, 1500), date: new Date().toISOString().slice(0, 10) } });
  await addDoc(collection(ref, "messages"), { de: "client", texte: "Modifications demandées sur la maquette : " + t.slice(0, 1900), date: serverTimestamp() });
  updateDoc(ref, { dernierClient: serverTimestamp() }).catch(() => {});
  $("ec-modif-zone").hidden = true; $("ec-modif-txt").value = "";
});

// ---------- messages ----------
function messages(L){
  const box = $("ec-msgs");
  box.innerHTML = L.length ? L.map(m => {
    const d = m.date && m.date.toDate ? m.date.toDate() : new Date();
    return `<li class="${m.de === "client" ? "moi" : "mel"}"><p>${esc(m.texte).replace(/\n/g, "<br>")}</p><small>${m.de === "client" ? "Vous" : "Mel"} · ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small></li>`;
  }).join("") : '<li class="ec-rien">Une question ? Écrivez-moi ici, je vous réponds rapidement.</li>';
  box.scrollTop = box.scrollHeight;
}
$("ec-msg-form").addEventListener("submit", async e => {
  e.preventDefault();
  const t = $("ec-msg").value.trim(); if (!t || !ref) return;
  $("ec-msg").value = "";
  try { await addDoc(collection(ref, "messages"), { de: "client", texte: t.slice(0, 2000), date: serverTimestamp() }); updateDoc(ref, { dernierClient: serverTimestamp() }).catch(() => {}); }
  catch (err) { $("ec-msg").value = t; alert("Le message n’est pas parti. Réessayez."); }
});
function feter(){
  const s = document.querySelector(".ec-mq-etat-zone"); if (!s) return;
  s.classList.remove("statut"); void s.offsetWidth; s.classList.add("statut", "ok");
}
