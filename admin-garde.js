/* Studio Mel · garde de l'espace admin
   L'espace client et l'admin partagent la même connexion Firebase. Si la personne connectée n'est pas
   l'administrateur (un client, par exemple), on bloque l'admin et on lui propose son espace client.
   Les données restent de toute façon protégées par les règles Firestore. */
(function(){
  var MEL = 'studio-mel@outlook.fr', CLE = 'firebase:authUser:AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY:[DEFAULT]';
  function bloquer(mail, effacer){
    var f = function(){
      if (document.getElementById('garde')) return;
      var d = document.createElement('div'); d.id = 'garde';
      d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true');
      d.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#060912;color:#F3F4F8;font-family:system-ui,-apple-system,sans-serif;text-align:center';
      d.innerHTML = '<div style="max-width:440px;display:grid;gap:16px;justify-items:center">' +
        '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2F5BFF"/><path d="M17 45V21.5L32 36l15-14.5V38" fill="none" stroke="#fff" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47" cy="46" r="3.6" fill="#B4C6FF"/></svg>' +
        '<h1 style="margin:0;font-size:26px">Espace réservé</h1>' +
        '<p style="margin:0;color:#B9BFCE;line-height:1.6">Cette partie est réservée à l’administrateur de Studio Mel. Vous êtes connecté avec <b style="color:#fff">' + String(mail).replace(/[<>&"]/g, '') + '</b>.</p>' +
        '<a href="/espace-client" style="display:inline-block;padding:14px 22px;border-radius:99px;background:#fff;color:#050505;font-weight:700;text-decoration:none">Aller à mon espace client</a>' +
        '<button type="button" id="garde-admin" style="border:0;background:none;color:#B4C6FF;text-decoration:underline;font:inherit;cursor:pointer">Je suis l’administrateur : changer de compte</button></div>';
      document.body.appendChild(d); document.documentElement.style.overflow = 'hidden';
      document.getElementById('garde-admin').addEventListener('click', function(){ effacer(function(){ location.reload(); }); });
    };
    if (document.body) f(); else document.addEventListener('DOMContentLoaded', f);
  }
  // 1) connexion enregistrée dans IndexedDB (cas habituel de Firebase)
  try {
    var r = indexedDB.open('firebaseLocalStorageDb');
    r.onsuccess = function(){
      var db = r.result; if (!db.objectStoreNames.contains('firebaseLocalStorage')) return;
      var g = db.transaction('firebaseLocalStorage', 'readonly').objectStore('firebaseLocalStorage').get(CLE);
      g.onsuccess = function(){
        var v = g.result && g.result.value;
        if (v && v.email && v.email.toLowerCase() !== MEL) bloquer(v.email, function(fin){
          var t = db.transaction('firebaseLocalStorage', 'readwrite'); t.objectStore('firebaseLocalStorage').delete(CLE); t.oncomplete = fin; t.onerror = fin;
        });
      };
    };
  } catch (e) {}
  // 2) repli : connexion enregistrée dans localStorage
  try {
    var l = JSON.parse(localStorage.getItem(CLE) || 'null');
    if (l && l.email && l.email.toLowerCase() !== MEL) bloquer(l.email, function(fin){ localStorage.removeItem(CLE); fin(); });
  } catch (e) {}
})();
