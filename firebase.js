/* =========================================================
   Studio Mel · envoi des formulaires (Firebase + EmailJS)
   Repris tel quel de la V1 : mêmes collections (« devis », « creneaux »),
   mêmes champs, donc l'espace admin continue de fonctionner sans changement.
   Firebase et EmailJS ne se chargent que lorsqu'on commence à remplir un formulaire.
   ========================================================= */
// Firebase et EmailJS ne se chargent que quand quelqu'un commence à remplir un formulaire : le site s'ouvre plus vite.
const FB = "https://www.gstatic.com/firebasejs/13.1.0/";
let ready = null;
function loadScript(src){ return new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
export function load(){
  if (!ready) ready = (async () => {
    const [{ initializeApp }, fs] = await Promise.all([
      import(FB + "firebase-app.js"), import(FB + "firebase-firestore.js"),
      loadScript("https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js")
    ]);
    const app = initializeApp({
      apiKey: "AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY",
      authDomain: "studio-mel-2f2cc.firebaseapp.com",
      projectId: "studio-mel-2f2cc",
      storageBucket: "studio-mel-2f2cc.firebasestorage.app",
      messagingSenderId: "604457816435",
      appId: "1:604457816435:web:cfa47da9d5b08caa6bf506"
    });
    emailjs.init({ publicKey: "53BDiH6RSJl99cF65" });
    return { db: fs.getFirestore(app), fs };
  })();
  return ready;
}
document.addEventListener("focusin", e => { if (e.target.closest("form")) load().catch(() => { ready = null; }); });

// Créneaux déjà réservés : on les retire du choix
export async function chargerCreneaux(){
  try {
    const { db, fs } = await load();
    const snap = await fs.getDocs(fs.collection(db, "creneaux"));
    window.creneauxPris = new Set(snap.docs.map(d => d.id));
    window.creneauxOK = true;
    document.dispatchEvent(new Event("creneaux"));
  } catch (err) { console.error(err); }
}

export async function envoyer(form, statutId, demande, merci){
  const s = document.getElementById(statutId), btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.classList.add("loading"); btn.setAttribute("aria-busy", "true");
  s.className = "statut"; s.textContent = "Envoi en cours…";
  demande.date = new Date().toLocaleDateString("fr-FR");
  // nettoyage : pas d'espaces inutiles, longueurs limitées (les règles Firestore vérifient aussi)
  for (const k in demande) if (typeof demande[k] === "string") demande[k] = demande[k].trim().slice(0, k === "message" ? 2000 : 200);
  let enregistre = false;
  try {
    const { db, fs } = await load();
    const { titre, ...fiche } = demande;
    try { await fs.addDoc(fs.collection(db, "devis"), { ...fiche, statut: "nouveau", createdAt: fs.serverTimestamp() }); enregistre = true; } catch (err) { console.error(err); }
    await emailjs.send("service_nszz5ip", "template_ab96u3d", demande);
    s.classList.add("ok"); s.textContent = merci;
    form.reset(); form.dispatchEvent(new Event("reset-done"));
  } catch (err) {
    console.error(err); ready = null;
    s.classList.add(enregistre ? "ok" : "ko");
    s.innerHTML = enregistre
      ? "Votre demande est bien enregistrée. Je vous réponds sous 48 h."
      : "L’envoi n’a pas fonctionné. Réessayez dans un instant, ou contactez-moi directement au <a href=\"tel:+33604159858\">06 04 15 98 58</a> ou à <a href=\"mailto:studio-mel@outlook.fr\">studio-mel@outlook.fr</a>.";
  }
  btn.disabled = false; btn.classList.remove("loading"); btn.removeAttribute("aria-busy");
}

