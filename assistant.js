/* =========================================================
   Studio Mel · assistant guidé (sans IA) : réponses tirées du site
   ========================================================= */
(function(){
  var T = window.TARIFS, calm = window.SM_CALM;
  var $ = function(id){ return document.getElementById(id); };
  var eur = function(n){ return Math.round(n).toLocaleString('fr-FR') + ' €'; };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  if (!$('as-fab')) return;
  // ---------------- ASSISTANT GUIDÉ (sans IA) ----------------
  var R = {
    prix: { q: 'Combien coûte un site ?', r: function(){ return '<p>Voici les tarifs de lancement :</p><ul><li>Refonte : ' + eur(T.refonte) + '</li><li>Création de site vitrine : ' + eur(T.creation) + '</li><li>Premium : ' + eur(T.premium) + '</li><li>Boutique en ligne : dès ' + eur(T.boutique) + '</li></ul><p>Le simulateur vous donne une estimation selon vos options.</p>'; }, a: [['Ouvrir le simulateur', '/#formules']], s: ['inclus', 'paiement', 'boutique'] },
    inclus: { q: 'Qu’est-ce qui est inclus ?', r: function(){ return '<p>Chaque formule comprend le design, la version mobile, le formulaire de contact, le référencement de base et la mise en ligne. Deux tours de retouches, trois pour le Premium.</p><p>L’hébergement peut être gratuit, sur un compte à votre nom.</p>'; }, s: ['domaine', 'maintenance', 'delai'] },
    delai: { q: 'Combien de temps ça prend ?', r: function(){ return '<p>Comptez 1 à 3 semaines pour un site vitrine, et 3 à 5 semaines pour une boutique en ligne, une fois vos contenus reçus (textes, photos, logo).</p>'; }, a: [['Demander un devis', '/contact#formulaire']], s: ['etapes', 'prix'] },
    etapes: { q: 'Comment se passe un projet ?', r: function(){ return '<p>On échange sur votre besoin, je vous envoie un devis, puis je prépare une maquette. Vous la validez, je construis le site, on fait les retouches et je le mets en ligne.</p>'; }, a: [['Prendre rendez-vous', '/contact#rdv']], s: ['delai', 'paiement'] },
    paiement: { q: 'Comment se fait le paiement ?', r: function(){ return '<p>En 2 fois (50 % au démarrage, 50 % à la mise en ligne) ou en 3 fois (30 / 40 / 30), sans frais.</p>'; }, s: ['prix', 'devis'] },
    boutique: { q: 'Vous faites des boutiques en ligne ?', r: function(){ return '<p>Oui : la formule Premium Boutique démarre à ' + eur(T.boutique) + ' avec jusqu’à 20 produits, le panier et le paiement sécurisé. Ensuite ' + T.lotProduits + ' € par lot de 20 produits.</p><p>Je ne prends aucune commission sur vos ventes : seuls les frais du service de paiement s’appliquent.</p>'; }, a: [['Voir l’exemple ANYAE', '/realisations#anyae']], s: ['delai', 'maintenance'] },
    domaine: { q: 'Et le nom de domaine ?', r: function(){ return '<p>Votre adresse (par exemple votre-entreprise.fr) est achetée à votre nom, pour environ ' + T.domaine + ' € par an. Je m’occupe de l’acheter et de la renouveler si vous le souhaitez.</p>'; }, s: ['maintenance', 'inclus'] },
    maintenance: { q: 'Et après la mise en ligne ?', r: function(){ return '<p>La maintenance est facultative : ' + T.maint + ' € par mois avec 1 h de modifications (' + T.maintBoutique + ' € et 2 h pour une boutique), sur 6 mois minimum. Sans maintenance, le site reste à vous et en ligne.</p>'; }, s: ['prix', 'devis'] },
    audit: { q: 'Mon site actuel est-il bien fait ?', r: function(){ return '<p>Lancez l’audit gratuit : en moins d’une minute, vous avez les notes Google de votre site et les points à corriger, expliqués simplement.</p>'; }, a: [['Lancer l’audit gratuit', '/audit']], s: ['prix', 'devis'] },
    zone: { q: 'Vous intervenez où ?', r: function(){ return '<p>Studio Mel est basé dans la région de Tarare, L’Arbresle, Sain-Bel et Lyon. Le rendez-vous peut aussi se faire par téléphone ou en visio.</p>'; }, a: [['Prendre rendez-vous', '/contact#rdv']], s: ['devis'] },
    google: { q: 'Je veux apparaître sur Google Maps', r: function(){ return '<p>Il vous faut une fiche Google : je la crée et l’optimise pour ' + eur(T.google) + '. Le Journal explique aussi comment la faire vous-même.</p>'; }, a: [['Lire l’article', '/journal-fiche-google'], ['Tester ma présence', '/audit#diagnostic']], s: ['prix', 'devis'] },
    choix: { q: 'Je ne sais pas quel site choisir', r: function(){ return '<p>L’outil « Trouve ton site idéal » vous oriente en 5 questions, avec une estimation.</p>'; }, a: [['Faire le test', '/audit#site-ideal']], s: ['prix', 'devis'] },
    devis: { q: 'Je veux un devis', r: function(){ return '<p>Avec plaisir ! Le devis est gratuit et je réponds sous 48 h. Vous pouvez aussi appeler le 06 04 15 98 58.</p>'; }, a: [['Demander un devis', '/contact#formulaire']], s: [] },
    autre: { q: 'Autre question', r: function(){ return '<p>Je n’ai pas la réponse ici, et je préfère ne rien inventer. Écrivez directement à Melvyn : il vous répond sous 48 h.</p>'; }, a: [['Écrire à Studio Mel', '/contact#formulaire']], s: [] }
  };
  var DEP = ['prix', 'boutique', 'delai', 'audit', 'maintenance', 'google', 'zone', 'devis', 'autre'];
  var fab = $('as-fab'), box = $('as-box'), log = $('as-log'), ch = $('as-ch'), ouvert = false;
  function bulle(html, qui){ var d = document.createElement('div'); d.className = 'as-m ' + qui; d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function choix(keys){
    var k = keys.concat(DEP.filter(function(x){ return keys.indexOf(x) < 0; })).filter(function(x){ return x !== 'autre'; }).slice(0, 5);
    if (k.indexOf('autre') < 0) k.push('autre');
    ch.innerHTML = k.map(function(x){ return '<button type="button" data-q="' + x + '">' + R[x].q + '</button>'; }).join('');
  }
  function repondre(k){
    var x = R[k]; bulle(esc(x.q), 'me');
    setTimeout(function(){
      var d = bulle(x.r() + (x.a ? '<div class="as-act">' + x.a.map(function(b){ return '<button type="button" data-asgo="' + b[1] + '">' + b[0] + '</button>'; }).join('') + '</div>' : ''), 'bot');
      d.querySelectorAll('[data-asgo]').forEach(function(b){ b.addEventListener('click', function(){ location.href = b.dataset.asgo; }); });
      choix(x.s || []);
    }, calm ? 0 : 280);
  }
  function ouvrir(){
    ouvert = true; box.hidden = false; fab.setAttribute('aria-expanded', 'true');
    if (!log.children.length) { bulle('<p>Bonjour ! Je réponds aux questions fréquentes sur Studio Mel, à partir des informations du site. Que voulez-vous savoir ?</p>', 'bot'); choix([]); }
    var b = ch.querySelector('button'); if (b) b.focus();
  }
  function fermer(){ ouvert = false; box.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus({ preventScroll: true }); }
  fab.addEventListener('click', ouvrir);
  $('as-x').addEventListener('click', fermer);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && ouvert) fermer(); });
  ch.addEventListener('click', function(e){ var b = e.target.closest('[data-q]'); if (b) repondre(b.dataset.q); });
})();
