/* Studio Mel · statistiques de visite (espace admin) — lit la collection « visites » */
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const app = initializeApp({ apiKey: "AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY", authDomain: "studio-mel-2f2cc.firebaseapp.com", projectId: "studio-mel-2f2cc",
  storageBucket: "studio-mel-2f2cc.firebasestorage.app", messagingSenderId: "604457816435", appId: "1:604457816435:web:cfa47da9d5b08caa6bf506" });
const auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2, "0");
const jourDe = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const NOMS = { "/": "Accueil", "/realisations": "Réalisations", "/audit": "Audit gratuit", "/journal": "Le Journal", "/a-propos": "À propos", "/contact": "Contact", "/article": "Article (éditeur)", "/mentions-legales": "Mentions légales", "/confidentialite": "Confidentialité" };
const nomPage = p => NOMS[p] || p.replace(/^\//, "").replace(/^journal-/, "Article · ").replace(/^projet-/, "Projet · ").replace(/^site-internet-/, "Métier · ").replace(/-/g, " ");
function source(r){
  if (!r || r === "direct") return "Accès direct";
  if (r === "interne") return "Navigation interne";
  if (/google\./.test(r)) return "Google"; if (/bing\./.test(r)) return "Bing"; if (/duckduckgo/.test(r)) return "DuckDuckGo"; if (/qwant/.test(r)) return "Qwant";
  if (/facebook|fb\.|messenger/.test(r)) return "Facebook"; if (/instagram/.test(r)) return "Instagram"; if (/linkedin|lnkd/.test(r)) return "LinkedIn";
  if (/tiktok/.test(r)) return "TikTok"; if (/t\.co$|twitter|x\.com/.test(r)) return "X (Twitter)"; if (/whatsapp/.test(r)) return "WhatsApp";
  return r;
}
let TOUT = [], periode = 30, charge = 0;

// tes propres visites ne sont pas comptées sur cet appareil
localStorage.setItem("sm-moi", "1");
$("moi").checked = true;
$("moi").addEventListener("change", e => { e.target.checked ? localStorage.setItem("sm-moi", "1") : localStorage.removeItem("sm-moi"); });

document.querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => {
  periode = +b.dataset.p; document.querySelectorAll("[data-p]").forEach(x => x.setAttribute("aria-selected", x === b));
  periode > charge ? charger() : afficher();
}));

async function charger(){
  $("st").textContent = "Chargement…";
  const debut = new Date(); debut.setDate(debut.getDate() - (periode - 1));
  try {
    const snap = await getDocs(query(collection(db, "visites"), where("jour", ">=", jourDe(debut))));
    TOUT = snap.docs.map(d => d.data()); charge = periode; $("st").textContent = ""; $("erreur-regles").classList.add("hide"); afficher();
  } catch (e) {
    $("st").textContent = "";
    if (e.code === "permission-denied") $("erreur-regles").classList.remove("hide"); else $("st").textContent = "Erreur de chargement : " + e.message;
  }
}

function barres(liste, total){
  if (!liste.length) return '<p class="vide">Pas encore de données.</p>';
  const max = liste[0][1];
  return liste.map(([n, v]) => `<div class="bl"><span class="bl-n" title="${n}">${n}</span><span class="bl-b"><i style="width:${Math.max(2, v / max * 100)}%"></i></span><b>${v}</b><small>${total ? Math.round(v / total * 100) + " %" : ""}</small></div>`).join("");
}
function compter(arr, cle){ const m = {}; arr.forEach(x => { const k = cle(x); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }

function afficher(){
  const debut = new Date(); debut.setDate(debut.getDate() - (periode - 1));
  const d0 = jourDe(debut), L = TOUT.filter(x => x.jour >= d0), S = L.filter(x => x.sess);
  // période précédente pour comparer (si chargée)
  const avant = new Date(debut); avant.setDate(avant.getDate() - periode);
  const Lp = TOUT.filter(x => x.jour >= jourDe(avant) && x.jour < d0), compare = charge >= periode * 2;
  const evo = (a, b) => !compare || !b ? "" : `<em class="${a >= b ? "up" : "down"}">${a >= b ? "▲" : "▼"} ${Math.abs(Math.round((a - b) / b * 100))} %</em>`;
  const mob = S.length ? Math.round(S.filter(x => x.app === "mobile").length / S.length * 100) : 0;
  $("kpi").innerHTML = `
    <div class="k"><span>Visiteurs</span><b>${S.length}</b>${evo(S.length, Lp.filter(x => x.sess).length)}</div>
    <div class="k"><span>Pages vues</span><b>${L.length}</b>${evo(L.length, Lp.length)}</div>
    <div class="k"><span>Pages par visite</span><b>${S.length ? (L.length / S.length).toFixed(1).replace(".", ",") : "0"}</b></div>
    <div class="k"><span>Sur téléphone</span><b>${mob} %</b></div>`;
  // courbe jour par jour
  const jours = []; for (let i = 0; i < periode; i++){ const d = new Date(debut); d.setDate(d.getDate() + i); jours.push(jourDe(d)); }
  const parJour = {}; S.forEach(x => parJour[x.jour] = (parJour[x.jour] || 0) + 1);
  const mx = Math.max(1, ...jours.map(j => parJour[j] || 0));
  $("graph").innerHTML = jours.map(j => { const v = parJour[j] || 0, [a, m, dd] = j.split("-");
    return `<div class="gb" title="${dd}/${m} : ${v} visiteur${v > 1 ? "s" : ""}"><i style="height:${v ? Math.max(4, v / mx * 100) : 0}%"></i><span>${periode <= 31 && (periode <= 7 || +dd % 5 === 0) ? dd + "/" + m : ""}</span></div>`; }).join("");
  $("gmax").textContent = mx + " max / jour";
  $("pages").innerHTML = barres(compter(L, x => nomPage(x.page)).slice(0, 12), L.length);
  $("sources").innerHTML = barres(compter(S, x => source(x.ref)).slice(0, 10), S.length);
  const lib = { mobile: "Téléphone", tablette: "Tablette", ordi: "Ordinateur" };
  $("apps").innerHTML = barres(compter(S, x => lib[x.app] || x.app), S.length);
}

onAuthStateChanged(auth, u => { $("login").classList.toggle("hide", !!u); $("app").classList.toggle("hide", !u); if (u) charger(); });
$("lbtn").addEventListener("click", async () => {
  $("lerr").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("lmail").value.trim(), $("lpass").value); }
  catch (e) { $("lerr").textContent = "Identifiant ou mot de passe incorrect."; }
});
$("lpass").addEventListener("keydown", e => { if (e.key === "Enter") $("lbtn").click(); });
