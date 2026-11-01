/* =========================================================
   Studio Mel · audit et outils gratuits
   Repris de la V1 + nouvel onglet « Audit automatique » (relais Cloudflare avec IA)
   ========================================================= */
(function(){
  var T = window.TARIFS, calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function(id){ return document.getElementById(id); };
  var eur = function(n){ return Math.round(n).toLocaleString('fr-FR') + ' €'; };
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  // ---- envoi vers le formulaire de contact (le visiteur relit puis envoie lui-même) ----
  function versContact(texte, formule){ window.versContact(texte, formule || ''); }

  // ---- onglets ----
  var tabs = document.querySelectorAll('[data-tool]');
  function ouvrir(k){
    tabs.forEach(function(b){ var on = b.dataset.tool === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
    document.querySelectorAll('[data-pane-tool]').forEach(function(p){ var on = p.dataset.paneTool === k; p.hidden = !on; p.classList.toggle('in', on && !calm); });
  }
  tabs.forEach(function(b){ b.addEventListener('click', function(){ ouvrir(b.dataset.tool); }); });

  // ---- moteur de questionnaire ----
  function quiz(el, questions, fin){
    var rep = {}, i = 0;
    function rendre(){
      if (i >= questions.length) { el.innerHTML = '<div class="q-step q-res">' + fin(rep) + '</div>'; brancherFin(); return; }
      var q = questions[i];
      el.innerHTML = '<div class="q-step"><div class="q-top"><div class="q-bar"><i style="width:' + (i / questions.length * 100) + '%"></i></div><small>Question ' + (i + 1) + ' sur ' + questions.length + '</small></div>' +
        '<h3 class="q-h">' + q.t + '</h3><div class="q-ch">' + q.c.map(function(c, k){ return '<button type="button" data-k="' + k + '">' + c[1] + (c[2] ? '<small>' + c[2] + '</small>' : '') + '</button>'; }).join('') + '</div>' +
        (i ? '<div class="q-nav"><button type="button" class="btn btn-sm btn-ghost" data-back>Retour</button></div>' : '') + '</div>';
      el.querySelectorAll('[data-k]').forEach(function(b){ b.addEventListener('click', function(){ rep[q.id] = q.c[+b.dataset.k][0]; i++; rendre(); }); });
      var bk = el.querySelector('[data-back]'); if (bk) bk.addEventListener('click', function(){ i--; rendre(); });
      var first = el.querySelector('[data-k]'); if (first && i) first.focus({ preventScroll: true });
    }
    function brancherFin(){
      var r = el.querySelector('[data-redo]'); if (r) r.addEventListener('click', function(){ rep = {}; i = 0; rendre(); });
      var s = el.querySelector('[data-send]'); if (s) s.addEventListener('click', function(){ versContact(s.dataset.txt, s.dataset.formule); });
      el.querySelectorAll('[data-go-tool]').forEach(function(b){ b.addEventListener('click', function(){ ouvrir(b.dataset.goTool); }); });
    }
    rendre();
  }
  var li = function(a){ return a.map(function(x){ return '<li>' + x + '</li>'; }).join(''); };

  // ---- 1. Trouve ton site idéal ----
  var METIERS = {
    artisan: { nom: 'Artisan', f: ['Galerie de chantiers avant/après', 'Zone d’intervention', 'Demande de devis rapide', 'Bouton d’appel sur mobile'], p: ['Accueil', 'Services', 'Réalisations', 'À propos', 'Contact et devis'], da: 'Moderne et rassurante : photos de chantiers en grand, couleurs franches, gros boutons d’appel.', at: 'moderne' },
    restaurant: { nom: 'Restaurant', f: ['Carte et menus faciles à mettre à jour', 'Horaires et accès', 'Réservation en ligne', 'Photos des plats'], p: ['Accueil', 'La carte', 'Réserver', 'Le lieu', 'Contact'], da: 'Chaleureuse et appétissante : grandes photos, typographie élégante, tons chauds.', at: 'elegante' },
    paysagiste: { nom: 'Paysagiste', f: ['Galerie de jardins avant/après', 'Zone d’intervention', 'Services d’entretien', 'Demande de devis'], p: ['Accueil', 'Création', 'Entretien', 'Réalisations', 'Contact'], da: 'Naturelle : verts profonds, beaucoup d’espace, photos plein écran.', at: 'minimaliste' },
    photographe: { nom: 'Photographe', f: ['Portfolio plein écran', 'Galeries par thème', 'Tarifs des séances', 'Prise de rendez-vous'], p: ['Accueil', 'Portfolio', 'Prestations', 'À propos', 'Contact'], da: 'Minimaliste : fond neutre, les photos font tout le travail.', at: 'minimaliste' },
    commerce: { nom: 'Commerce', f: ['Présentation des produits', 'Horaires et plan d’accès', 'Fiche Google à jour', 'Boutique en ligne si vous vendez à distance'], p: ['Accueil', 'Produits', 'La boutique', 'Contact'], da: 'Vivante : couleurs de votre enseigne, produits mis en avant.', at: 'audacieuse' },
    independant: { nom: 'Indépendant', f: ['Présentation claire de vos services', 'Avis clients', 'Prise de rendez-vous', 'Formulaire de contact'], p: ['Accueil', 'Services', 'À propos', 'Contact'], da: 'Personnelle et pro : votre photo, un ton direct, une couleur signature.', at: 'premium' },
    services: { nom: 'Entreprise de services', f: ['Services détaillés', 'Chiffres clés et références', 'Équipe', 'Demande de devis'], p: ['Accueil', 'Services', 'Références', 'Équipe', 'Contact'], da: 'Sérieuse et technologique : bleus profonds, structure nette, chiffres en avant.', at: 'techno' }
  };
  quiz($('q-ideal'), [
    { id: 'm', t: 'Quel est votre métier ?', c: Object.keys(METIERS).map(function(k){ return [k, METIERS[k].nom]; }) },
    { id: 'o', t: 'Qu’attendez-vous d’abord de votre site ?', c: [['appel', 'Être trouvé et recevoir des appels'], ['montrer', 'Montrer mon travail'], ['vendre', 'Vendre en ligne'], ['resa', 'Prendre des réservations']] },
    { id: 's', t: 'Avez-vous déjà un site ?', c: [['non', 'Non, pas encore'], ['vieux', 'Oui, mais il est daté'], ['ok', 'Oui, il est correct']] },
    { id: 'w', t: 'Quel effet voulez-vous produire ?', c: [['simple', 'Clair et efficace', 'L’essentiel, bien fait'], ['waouh', 'Marquer les esprits', 'Animations, effet waouh']] },
    { id: 'n', t: 'Voulez-vous vendre des produits en ligne ?', c: [['0', 'Non'], ['20', 'Oui, moins de 20 produits'], ['60', 'Oui, entre 20 et 60'], ['100', 'Oui, plus de 60']] }
  ], function(r){
    var m = METIERS[r.m], fo, base, plus = [];
    if (r.o === 'vendre' || r.n !== '0') { fo = ['Boutique en ligne', 'Premium Boutique']; base = T.boutique; var n = +r.n; if (n > 20) plus.push([Math.ceil((n - 20) / 20) + ' lot(s) de 20 produits en plus', Math.ceil((n - 20) / 20) * T.lotProduits]); }
    else if (r.w === 'waouh') { fo = ['Site Premium', 'Premium vitrine']; base = T.premium; }
    else if (r.s === 'vieux') { fo = ['Refonte de site', 'Refonte']; base = T.refonte; }
    else { fo = ['Création de site vitrine', 'Création']; base = T.creation; }
    if (r.o === 'resa' && fo[0] !== 'Boutique en ligne') plus.push(['Réservation en ligne', T.resa]);
    if (r.s === 'non') plus.push(['Fiche Google, pour apparaître sur la carte', T.google]);
    var tot = base + plus.reduce(function(s, x){ return s + x[1]; }, 0);
    var feats = m.f.slice(); if (r.o === 'vendre' && feats.indexOf('Boutique en ligne si vous vendez à distance') < 0) feats.push('Panier et paiement sécurisé');
    var txt = 'Résultat de « Trouve ton site idéal » : ' + m.nom + ', formule ' + fo[1] + (plus.length ? ' + ' + plus.map(function(x){ return x[0]; }).join(' + ') : '') + ', estimation ' + eur(tot) + '.';
    return '<p class="q-k">Notre recommandation</p><h3>' + fo[1] + ' pour ' + m.nom.toLowerCase() + '</h3>' +
      '<div class="q-price"><b>' + (fo[0] === 'Boutique en ligne' ? 'dès ' : '') + eur(tot) + '</b><small>Estimation indicative, tarifs de lancement' + (plus.length ? ', options comprises' : '') + '</small></div>' +
      '<div class="q-grid"><div class="q-box"><h4>Fonctionnalités utiles</h4><ul>' + li(feats) + '</ul></div>' +
      '<div class="q-box"><h4>Pages proposées</h4><ol>' + li(m.p) + '</ol></div>' +
      '<div class="q-box"><h4>Direction artistique</h4><p style="margin:0;color:var(--muted);font-size:14.5px;line-height:1.5">' + m.da + '</p><button type="button" class="inline-link" style="margin-top:10px" data-go-tool="atelier" onclick="window.atelierPreset && window.atelierPreset(\'' + m.at + '\')">L’essayer dans l’Atelier</button></div></div>' +
      '<div class="q-act"><button type="button" class="btn btn-lg btn-primary" data-send data-formule="' + fo[0] + '" data-txt="' + esc(txt) + '">Envoyer à Studio Mel</button><button type="button" class="btn btn-lg btn-ghost" data-redo>Recommencer</button></div>';
  });

  // ---- 2. Diagnostic de présence digitale ----
  var D = [
    { id: 'site', t: 'Avez-vous un site internet ?', w: 25, ok: 'Vous avez un site internet.', ko: 'Pas de site : une partie de vos futurs clients ne vous trouve pas.', reco: ['Créer un site vitrine', 'Création']},
    { id: 'mob', t: 'Votre site s’affiche-t-il bien sur téléphone ?', w: 20, ok: 'Votre site est adapté aux téléphones.', ko: 'Un site mal affiché sur téléphone fait fuir la majorité des visiteurs.', reco: ['Refaire le site pour le mobile', 'Refonte'], si: 'site' },
    { id: 'form', t: 'Peut-on vous contacter directement depuis le site ?', w: 10, ok: 'On peut vous contacter depuis le site.', ko: 'Sans formulaire ni bouton d’appel, vous perdez des demandes.', reco: ['Ajouter un formulaire et un bouton d’appel', 'Refonte'], si: 'site' },
    { id: 'gbp', t: 'Avez-vous une fiche Google (Google Maps) ?', w: 20, ok: 'Vous êtes sur Google Maps.', ko: 'Sans fiche Google, vous êtes invisible dans les recherches « près de moi ».', reco: ['Créer votre fiche Google', 'Fiche Google'] },
    { id: 'goo', t: 'Quand on tape votre nom et votre ville sur Google, vous apparaissez ?', w: 10, ok: 'On vous trouve en tapant votre nom.', ko: 'Même avec votre nom, on ne vous trouve pas facilement.', reco: ['Travailler le référencement de base', 'Création'] },
    { id: 'soc', t: 'Êtes-vous actif sur au moins un réseau social ?', w: 5, ok: 'Vous êtes présent sur les réseaux.', ko: 'Pas de réseau social : c’est secondaire, mais utile pour montrer votre travail.', reco: null },
    { id: 'id', t: 'Logo, couleurs, cartes de visite : votre image est-elle la même partout ?', w: 10, ok: 'Votre image est cohérente.', ko: 'Une image différente d’un support à l’autre brouille votre message.', reco: ['Harmoniser votre identité sur le site', 'Création'] }
  ];
  quiz($('q-diag'), D.map(function(q){ return { id: q.id, t: q.t, c: [['oui', 'Oui'], ['non', 'Non'], ['nsp', 'Je ne sais pas']] }; }), function(r){
    var pts = 0, max = 0, forts = [], faibles = [], recos = [], nsp = [];
    D.forEach(function(q){
      if (q.si && r[q.si] === 'non') return; // question sans objet sans site
      max += q.w;
      if (r[q.id] === 'oui') { pts += q.w; forts.push(q.ok); }
      else { faibles.push(q.ko); if (r[q.id] === 'nsp') nsp.push(q.t); if (q.reco && !recos.some(function(x){ return x[0] === q.reco[0]; })) recos.push(q.reco); }
    });
    var sc = Math.round(pts / max * 100), cl = sc >= 75 ? 'g' : sc >= 45 ? 'o' : 'r';
    var mot = sc >= 75 ? 'Bonne présence en ligne' : sc >= 45 ? 'Présence en ligne à renforcer' : 'Présence en ligne faible';
    var PR = { 'Création': ['Création de site vitrine', 'dès ' + eur(T.creation)], 'Refonte': ['Refonte de site', 'dès ' + eur(T.refonte)], 'Fiche Google': ['Fiche Google Business', eur(T.google)] };
    var serv = []; recos.forEach(function(x){ if (PR[x[1]] && serv.indexOf(x[1]) < 0) serv.push(x[1]); });
    var txt = 'Résultat du diagnostic de présence : ' + sc + '/100. À améliorer : ' + (recos.map(function(x){ return x[0].toLowerCase(); }).join(', ') || 'rien de prioritaire') + '.';
    return '<p class="q-k">Votre diagnostic</p><div class="score"><div class="ring ' + cl + '" style="--v:' + sc + '"><b>' + sc + '</b></div><div><h3>' + mot + '</h3><p class="t-note" style="margin:6px 0 0">Score calculé à partir de vos réponses, sur ' + max + ' points possibles. Un repère, pas une mesure de votre trafic.</p></div></div>' +
      '<div class="q-grid">' + (forts.length ? '<div class="q-box ok"><h4>Points forts</h4><ul>' + li(forts) + '</ul></div>' : '') +
      (faibles.length ? '<div class="q-box ko"><h4>À améliorer</h4><ul>' + li(faibles) + '</ul></div>' : '') +
      (recos.length ? '<div class="q-box"><h4>Par quoi commencer</h4><ol>' + li(recos.map(function(x){ return x[0]; })) + '</ol></div>' : '') + '</div>' +
      (nsp.length ? '<p class="t-note">Vous ne saviez pas pour ' + nsp.length + ' question' + (nsp.length > 1 ? 's' : '') + ' : l’<button type="button" class="inline-link" data-go-tool="perf">outil de test de vitesse</button> ou l’audit gratuit peuvent vous aider à y voir clair.</p>' : '') +
      (serv.length ? '<div class="q-box" style="margin-top:12px"><h4>Ce que Studio Mel peut faire</h4><ul>' + li(serv.map(function(k){ return PR[k][0] + ' · ' + PR[k][1]; })) + '</ul></div>' : '') +
      '<div class="q-act"><button type="button" class="btn btn-lg btn-primary" data-send data-formule="' + (serv[0] ? PR[serv[0]][0] : '') + '" data-txt="' + esc(txt) + '">Envoyer à Studio Mel</button><button type="button" class="btn btn-lg btn-ghost" data-redo>Recommencer</button></div>';
  });

  // ---- 3. L’Atelier ----
  var PAL = {
    nuit: ['Nuit', '#0B0D17', '#F2F4FA', '#2F5BFF', '#B4C6FF', '#A2A8BA', '#161A2B'],
    sable: ['Sable', '#F7F2EA', '#2A2420', '#B5704A', '#E3C9A8', '#7C7067', '#EFE6D8'],
    foret: ['Forêt', '#F4F6F1', '#18261C', '#2F6B45', '#A8C9A0', '#5F6E62', '#E6ECE2'],
    corail: ['Corail', '#FFF8F5', '#251715', '#F0604D', '#FFC2A8', '#866F6A', '#FDEAE3'],
    encre: ['Encre', '#FFFFFF', '#111111', '#111111', '#C9C9C9', '#6B6B6B', '#F2F2F2'],
    lilas: ['Lilas', '#14111F', '#F4F0FF', '#8B6CFF', '#E0A9FF', '#ABA3C2', '#1F1A30'],
    or: ['Or', '#0F0E0C', '#F6F0E3', '#C9A45C', '#EAD7A8', '#A9A290', '#1B1915']
  };
  var FONTS = {
    jakarta: ['Plus Jakarta Sans', "'Plus Jakarta Sans',sans-serif", "'Plus Jakarta Sans',sans-serif", ''],
    playfair: ['Playfair + Inter', "'Playfair Display',serif", "'Inter',sans-serif", 'Playfair+Display:wght@600;700&family=Inter:wght@400;600'],
    grotesk: ['Space Grotesk', "'Space Grotesk',sans-serif", "'Inter',sans-serif", 'Space+Grotesk:wght@500;700&family=Inter:wght@400;600'],
    dmserif: ['DM Serif + DM Sans', "'DM Serif Display',serif", "'DM Sans',sans-serif", 'DM+Serif+Display&family=DM+Sans:wght@400;600'],
    syne: ['Syne + Manrope', "'Syne',sans-serif", "'Manrope',sans-serif", 'Syne:wght@700;800&family=Manrope:wght@400;600'],
    cormorant: ['Cormorant + Montserrat', "'Cormorant Garamond',serif", "'Montserrat',sans-serif", 'Cormorant+Garamond:wght@600;700&family=Montserrat:wght@400;600']
  };
  var AMB = {
    minimaliste: { n: 'Minimaliste', pal: 'encre', font: 'grotesk', btn: 'carre', lay: 'centre', card: 'bord' },
    premium: { n: 'Premium', pal: 'or', font: 'cormorant', btn: 'pilule', lay: 'split', card: 'bord' },
    moderne: { n: 'Moderne', pal: 'foret', font: 'jakarta', btn: 'arrondi', lay: 'split', card: 'ombre' },
    elegante: { n: 'Élégante', pal: 'sable', font: 'playfair', btn: 'pilule', lay: 'plein', card: 'plein' },
    audacieuse: { n: 'Audacieuse', pal: 'corail', font: 'syne', btn: 'carre', lay: 'split', card: 'plein' },
    techno: { n: 'Technologique', pal: 'nuit', font: 'jakarta', btn: 'pilule', lay: 'split', card: 'verre' }
  };
  var SECT = {
    artisan: ['Bernard Rénovation', 'Votre maison, entre de bonnes mains.', 'Plâtrerie, peinture et isolation à Tarare et alentours. Devis gratuit sous 48 h.', ['Rénovation', 'Isolation', 'Peinture']],
    resto: ['La Table du Marché', 'Une cuisine de saison, faite maison.', 'Produits locaux, carte courte qui change chaque semaine. Réservez votre table.', ['La carte', 'Le lieu', 'Réserver']],
    jardin: ['Vert Horizon', 'Des jardins qui vous ressemblent.', 'Création, entretien et élagage dans les Monts du Lyonnais.', ['Création', 'Entretien', 'Élagage']],
    coiffure: ['Atelier Mèche', 'Votre coupe, votre style.', 'Salon de coiffure mixte, sur rendez-vous du mardi au samedi.', ['Coupes', 'Couleurs', 'Rendez-vous']],
    boutique: ['Maison Cire', 'Bougies coulées à la main.', 'Créations artisanales et personnalisables, livrées chez vous.', ['Bougies', 'Coffrets', 'Sur mesure']],
    services: ['Nova Conseil', 'Vos projets, notre méthode.', 'Accompagnement des TPE dans leur organisation et leur gestion.', ['Conseil', 'Formation', 'Références']]
  };
  var st = { amb: 'techno', pal: 'nuit', font: 'jakarta', btn: 'pilule', bstyle: 'plein', lay: 'split', card: 'verre', sect: 'artisan', ac: '' };
  try { var q0 = new URLSearchParams(location.search).get('atelier'); if (q0) { var o = JSON.parse(atob(q0)); Object.keys(st).forEach(function(k){ if (typeof o[k] === 'string') st[k] = o[k]; }); } } catch (e) {}
  var fontsCharges = {};
  function chargerFont(k){
    var f = FONTS[k]; if (!f || !f[3] || fontsCharges[k]) return; fontsCharges[k] = 1;
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f[3] + '&display=swap'; document.head.appendChild(l);
  }
  function groupe(titre, cle, opts){
    return '<div class="at-g"><h4>' + titre + '</h4><div class="chips">' + opts.map(function(o){ return '<button type="button" data-at="' + cle + '" data-v="' + o[0] + '" aria-pressed="' + (st[cle] === o[0]) + '">' + (o[2] || '') + o[1] + '</button>'; }).join('') + '</div></div>';
  }
  function rendreCtl(){
    $('at-ctl').innerHTML =
      groupe('Ambiance', 'amb', Object.keys(AMB).map(function(k){ return [k, AMB[k].n]; })) +
      groupe('Secteur de l’aperçu', 'sect', [['artisan', 'Artisan'], ['resto', 'Restaurant'], ['jardin', 'Paysagiste'], ['coiffure', 'Coiffure'], ['boutique', 'Boutique'], ['services', 'Services']]) +
      groupe('Palette', 'pal', Object.keys(PAL).map(function(k){ var p = PAL[k]; return [k, p[0], '<span class="sw3"><i style="background:' + p[1] + '"></i><i style="background:' + p[3] + '"></i><i style="background:' + p[4] + '"></i></span>']; })) +
      '<div class="at-g"><label class="at-col">Ou votre couleur principale <input type="color" id="at-ac" value="' + (st.ac || PAL[st.pal][3]) + '" aria-label="Couleur principale"></label>' + (st.ac ? ' <button type="button" class="inline-link" id="at-ac0" style="font-size:13px;margin-left:8px">Revenir à la palette</button>' : '') + '</div>' +
      groupe('Typographies', 'font', Object.keys(FONTS).map(function(k){ return [k, FONTS[k][0]]; })) +
      groupe('Boutons', 'btn', [['carre', 'Carrés'], ['arrondi', 'Arrondis'], ['pilule', 'Pilule']]) +
      groupe('Remplissage des boutons', 'bstyle', [['plein', 'Pleins'], ['contour', 'Contour']]) +
      groupe('Page d’accueil', 'lay', [['split', 'Texte et image'], ['centre', 'Centrée'], ['plein', 'Image plein écran']]) +
      groupe('Cartes', 'card', [['ombre', 'Ombre'], ['bord', 'Bordure'], ['plein', 'Fond coloré'], ['verre', 'Verre']]);
    $('at-ctl').querySelectorAll('[data-at]').forEach(function(b){ b.addEventListener('click', function(){
      var k = b.dataset.at, v = b.dataset.v;
      if (k === 'amb') { var a = AMB[v]; st.amb = v; st.pal = a.pal; st.font = a.font; st.btn = a.btn; st.lay = a.lay; st.card = a.card; st.ac = ''; }
      else { st[k] = v; if (k === 'pal') st.ac = ''; }
      rendreCtl(); rendrePrev();
    }); });
    $('at-ac').addEventListener('input', function(e){ st.ac = e.target.value; rendrePrev(); if (!$('at-ac0')) rendreCtl(); });
    if ($('at-ac0')) $('at-ac0').addEventListener('click', function(){ st.ac = ''; rendreCtl(); rendrePrev(); });
  }
  function couleurs(){ var p = PAL[st.pal].slice(); if (st.ac) p[3] = st.ac; return p; }
  function rendrePrev(){
    var p = couleurs(), f = FONTS[st.font], s = SECT[st.sect]; chargerFont(st.font);
    var el = $('at-prev');
    el.className = 'at-prev lay-' + st.lay + ' cd-' + st.card + ' bt-' + st.bstyle;
    el.style.cssText = '--bg:' + p[1] + ';--tx:' + p[2] + ';--ac:' + p[3] + ';--ac2:' + p[4] + ';--mu:' + p[5] + ';--sf:' + p[6] + ';--hf:' + f[1] + ';--bf:' + f[2] + ';--btnr:' + ({ carre: '4px', arrondi: '10px', pilule: '99px' })[st.btn] + ';--rad:' + ({ carre: '4px', arrondi: '12px', pilule: '18px' })[st.btn];
    el.innerHTML = '<div class="ap-nav"><b>' + s[0] + '</b><span><i>Accueil</i><i>' + s[3][0] + '</i><i>Contact</i></span></div>' +
      '<div class="ap-hero"><div style="display:grid;gap:12px"><h5>' + s[1] + '</h5><p>' + s[2] + '</p><div class="ap-btns"><span class="ap-b">Demander un devis</span><span class="ap-b s">Découvrir</span></div></div><div class="ap-img" aria-hidden="true"></div></div>' +
      '<div class="ap-cards">' + s[3].map(function(c, i){ return '<div class="ap-c"><b>' + c + '</b><span>' + ['Un savoir-faire local, expliqué simplement.', 'Des réalisations à découvrir en photos.', 'Une réponse rapide à chaque demande.'][i] + '</span></div>'; }).join('') + '</div>';
    var noms = ['Fond', 'Texte', 'Principale', 'Secondaire'];
    $('at-pal').innerHTML = [p[1], p[2], p[3], p[4]].map(function(c, i){ return '<button type="button" data-copy="' + c + '" title="Copier ' + c + '"><i style="background:' + c + '"></i>' + noms[i] + ' ' + c.toUpperCase() + '</button>'; }).join('');
    $('at-pal').querySelectorAll('[data-copy]').forEach(function(b){ b.addEventListener('click', function(){ copier(b.dataset.copy.toUpperCase(), 'Code ' + b.dataset.copy.toUpperCase() + ' copié.'); }); });
  }
  function copier(t, ok){
    var m = $('at-msg');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){ m.textContent = ok; }, function(){ m.textContent = 'Copie impossible ici : ' + t; });
    clearTimeout(copier.t); copier.t = setTimeout(function(){ m.textContent = ''; }, 4000);
  }
  function resume(){ var p = couleurs(); return 'ambiance ' + AMB[st.amb].n + ', palette ' + PAL[st.pal][0] + (st.ac ? ' (couleur ' + st.ac.toUpperCase() + ')' : '') + ', typographies ' + FONTS[st.font][0] + ', boutons ' + st.btn + ', accueil « ' + ({ split: 'texte et image', centre: 'centrée', plein: 'image plein écran' })[st.lay] + ' », couleurs ' + [p[1], p[2], p[3], p[4]].join(' ').toUpperCase(); }
  $('at-share').addEventListener('click', function(){
    var u = location.origin + '/outils/?atelier=' + encodeURIComponent(btoa(JSON.stringify(st))) + '#atelier';
    copier(u, 'Lien copié : il ouvre l’Atelier avec ce style.');
  });
  $('at-send').addEventListener('click', function(){ versContact('Style imaginé dans l’Atelier : ' + resume() + '.\nLien : ' + location.origin + '/outils/?atelier=' + encodeURIComponent(btoa(JSON.stringify(st))) + '#atelier'); });
  window.atelierPreset = function(k){ var a = AMB[k]; if (!a) return; st.amb = k; st.pal = a.pal; st.font = a.font; st.btn = a.btn; st.lay = a.lay; st.card = a.card; st.ac = ''; rendreCtl(); rendrePrev(); };
  rendreCtl(); rendrePrev();
  if (new URLSearchParams(location.search).get('atelier')) ouvrir('atelier');

  // ---- adresse saisie : vérification commune ----
  function urlValide(v){
    v = v.trim(); if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v); } catch (e) { return null; }
    var h = u.hostname.toLowerCase();
    if (!/\./.test(h) || /^(localhost|.*\.local|.*\.internal)$/.test(h) || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.indexOf(':') >= 0) return null;
    return u.href;
  }
  function erreur(input, msg){ var e = input.closest('.fld').querySelector('.err'); e.textContent = msg; input.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) input.focus(); }

  // ---- 4. Test de vitesse (Google PageSpeed Insights) ----
  var PSI_KEY = window.PSI_KEY || '';
  var NOMS_CAT = { performance: 'Performance', accessibility: 'Accessibilité', 'best-practices': 'Bonnes pratiques', seo: 'SEO' };
  $('perf-form').addEventListener('submit', function(e){
    e.preventDefault();
    var inp = $('perf-url'), url = urlValide(inp.value), out = $('perf-out'), btn = this.querySelector('button[type=submit]');
    if (!url) return erreur(inp, 'Indiquez une adresse de site valide, par exemple www.monsite.fr');
    erreur(inp, '');
    var strat = this.querySelector('[name=perf-st]:checked').value;
    var api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(url) + '&strategy=' + strat + '&locale=fr' + ['performance', 'accessibility', 'best-practices', 'seo'].map(function(c){ return '&category=' + c; }).join('') + (PSI_KEY ? '&key=' + PSI_KEY : '');
    btn.disabled = true; btn.textContent = 'Test en cours…';
    out.innerHTML = '<div class="loading-bar"><i></i></div><p class="t-note">Google charge votre site et le mesure. Comptez 20 à 40 secondes.</p>';
    var ctrl = window.AbortController ? new AbortController() : null, to = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 90000);
    fetch(api, ctrl ? { signal: ctrl.signal } : {}).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, s: r.status, j: j }; }); }).then(function(x){
      if (!x.ok) {
        var m = x.s === 429 ? 'Trop de tests en ce moment, le quota gratuit de Google est atteint. Réessayez dans quelques minutes.' : x.s === 400 || x.s === 500 ? 'Google n’a pas pu charger ce site. Vérifiez l’adresse, ou le site bloque peut-être les robots.' : 'Le test a échoué (erreur ' + x.s + '). Réessayez plus tard.';
        out.innerHTML = '<p class="statut ko" style="margin-top:20px">' + m + '</p>'; return;
      }
      var L = x.j.lighthouseResult, C = L.categories, A = L.audits, F = x.j.loadingExperience && x.j.loadingExperience.metrics;
      var cl = function(s){ return s >= 90 ? 'g' : s >= 50 ? 'o' : 'r'; };
      var rings = Object.keys(NOMS_CAT).map(function(k){ var s = C[k] && C[k].score != null ? Math.round(C[k].score * 100) : null;
        return '<div class="q-box">' + (s == null ? '<div class="ring"><b>—</b></div>' : '<div class="ring ' + cl(s) + '" style="--v:' + s + '"><b>' + s + '</b></div>') + '<small>' + NOMS_CAT[k] + '</small></div>'; }).join('');
      var mesure = function(id, nom){ var a = A[id]; if (!a || !a.displayValue) return ''; var s = a.score; return '<div class="' + (s >= .9 ? 'g' : s >= .5 ? 'o' : 'r') + '"><small>' + nom + '</small><b>' + esc(a.displayValue) + '</b></div>'; };
      var labo = mesure('largest-contentful-paint', 'Plus grand affichage (LCP)') + mesure('cumulative-layout-shift', 'Stabilité visuelle (CLS)') + mesure('total-blocking-time', 'Temps de blocage (TBT)') + mesure('first-contentful-paint', 'Premier affichage (FCP)') + mesure('speed-index', 'Indice de vitesse');
      var terrain = '';
      if (F && (F.LARGEST_CONTENTFUL_PAINT_MS || F.INTERACTION_TO_NEXT_PAINT || F.CUMULATIVE_LAYOUT_SHIFT_SCORE)) {
        var cat = function(m){ return m && m.category === 'FAST' ? 'g' : m && m.category === 'AVERAGE' ? 'o' : 'r'; };
        var v = function(m, f){ return m ? f(m.percentile) : null; };
        var items = [['LCP', v(F.LARGEST_CONTENTFUL_PAINT_MS, function(p){ return (p / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' s'; }), F.LARGEST_CONTENTFUL_PAINT_MS],
          ['INP', v(F.INTERACTION_TO_NEXT_PAINT, function(p){ return p + ' ms'; }), F.INTERACTION_TO_NEXT_PAINT],
          ['CLS', v(F.CUMULATIVE_LAYOUT_SHIFT_SCORE, function(p){ return (p / 100).toLocaleString('fr-FR'); }), F.CUMULATIVE_LAYOUT_SHIFT_SCORE]].filter(function(x){ return x[1] != null; });
        terrain = '<div class="q-box" style="margin-top:12px"><h4>Core Web Vitals · vrais visiteurs Chrome (28 derniers jours)</h4><div class="vit">' + items.map(function(x){ return '<div class="' + cat(x[2]) + '"><small>' + x[0] + '</small><b>' + x[1] + '</b></div>'; }).join('') + '</div></div>';
      } else terrain = '<p class="t-note">Core Web Vitals des vrais visiteurs : non disponibles, ce site n’a pas encore assez de trafic pour que Google les publie.</p>';
      var recos = Object.keys(A).map(function(k){ return A[k]; }).filter(function(a){ return a.details && a.details.type === 'opportunity' && a.score != null && a.score < .9 && (a.details.overallSavingsMs || 0) > 100; })
        .sort(function(a, b){ return (b.details.overallSavingsMs || 0) - (a.details.overallSavingsMs || 0); }).slice(0, 5);
      var date = new Date(L.fetchTime || Date.now()).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
      out.innerHTML = '<div class="res-h"><b>' + esc(L.finalDisplayedUrl || L.finalUrl || url) + '</b><span>Test ' + (strat === 'mobile' ? 'téléphone' : 'ordinateur') + ' du ' + date + ' · Lighthouse ' + esc(L.lighthouseVersion || '') + '</span></div>' +
        '<div class="rings">' + rings + '</div>' +
        (labo ? '<div class="q-box" style="margin-top:12px"><h4>Mesures du test</h4><div class="vit">' + labo + '</div></div>' : '') + terrain +
        (recos.length ? '<div class="q-box" style="margin-top:12px"><h4>Ce qui ralentit le plus votre site</h4><ul class="chk-l">' + recos.map(function(a){ return '<li class="' + (a.score < .5 ? 'ko' : 'warn') + '"><span>' + esc(a.title) + '<small>Gain possible : environ ' + (Math.round(a.details.overallSavingsMs / 100) / 10).toLocaleString('fr-FR') + ' s</small></span></li>'; }).join('') + '</ul></div>' : '') +
        '<div class="q-act"><button type="button" class="btn btn-lg btn-primary" id="perf-send">Faire analyser mon site par Studio Mel</button></div>';
      var sc = Object.keys(NOMS_CAT).map(function(k){ return NOMS_CAT[k] + ' ' + (C[k] && C[k].score != null ? Math.round(C[k].score * 100) : '—'); }).join(', ');
      $('perf-send').addEventListener('click', function(){ versContact('Test de vitesse de ' + url + ' (' + (strat === 'mobile' ? 'téléphone' : 'ordinateur') + ', ' + date + ') : ' + sc + '. J’aimerais un avis sur mon site.'); });
    }).catch(function(err){
      out.innerHTML = '<p class="statut ko" style="margin-top:20px">' + (err && err.name === 'AbortError' ? 'Le test a pris trop de temps. Réessayez dans un instant.' : 'Impossible de joindre le service de test de Google. Vérifiez votre connexion et réessayez.') + '</p>';
    }).then(function(){ clearTimeout(to); btn.disabled = false; btn.textContent = 'Lancer le test'; });
  });

  // ---- 5. Audit SEO express (relais Cloudflare, voir worker-audit-seo.js) ----
  var AUDIT_API = window.AUDIT_API || '';
  if (AUDIT_API) $('tool-seo-btn').hidden = false;
  $('seo-form').addEventListener('submit', function(e){
    e.preventDefault();
    var inp = $('seo-url'), url = urlValide(inp.value), out = $('seo-out'), btn = this.querySelector('button[type=submit]');
    if (!url) return erreur(inp, 'Indiquez une adresse de site valide, par exemple www.monsite.fr');
    erreur(inp, '');
    btn.disabled = true; btn.textContent = 'Analyse en cours…';
    out.innerHTML = '<div class="loading-bar"><i></i></div>';
    fetch(AUDIT_API + '?url=' + encodeURIComponent(url)).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); }).then(function(x){
      if (!x.ok) { out.innerHTML = '<p class="statut ko" style="margin-top:20px">' + esc(x.j.erreur || 'L’analyse a échoué.') + '</p>'; return; }
      var R = x.j, groupes = { ok: [], warn: [], ko: [], nv: [] };
      R.controles.forEach(function(c){ (groupes[c.etat] || groupes.nv).push(c); });
      var bloc = function(k, t){ return groupes[k].length ? '<div class="q-box ' + (k === 'ok' ? 'ok' : k === 'nv' ? '' : 'ko') + '"><h4>' + t + '</h4><ul class="chk-l">' + groupes[k].map(function(c){ return '<li class="' + k + '"><span>' + esc(c.titre) + (c.detail ? '<small>' + esc(c.detail) + '</small>' : '') + '</span></li>'; }).join('') + '</ul></div>' : ''; };
      out.innerHTML = '<div class="res-h"><b>' + esc(R.url) + '</b><span>Analyse du ' + new Date(R.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) + '</span></div>' +
        '<div class="q-grid">' + bloc('ko', 'Problèmes détectés') + bloc('warn', 'Points à améliorer') + bloc('ok', 'Points positifs') + bloc('nv', 'Non vérifié') + '</div>' +
        '<div class="q-act"><button type="button" class="btn btn-lg btn-primary" id="seo-send">Me faire aider sur ces points</button></div>';
      $('seo-send').addEventListener('click', function(){ versContact('Audit SEO express de ' + R.url + ' : ' + groupes.ko.length + ' problème(s), ' + groupes.warn.length + ' point(s) à améliorer. J’aimerais votre avis.'); });
    }).catch(function(){ out.innerHTML = '<p class="statut ko" style="margin-top:20px">Le service d’analyse ne répond pas. Réessayez plus tard.</p>'; })
      .then(function(){ btn.disabled = false; btn.textContent = 'Analyser'; });
  });

  // ---- 6. Audit automatique avec IA (relais Cloudflare, voir _cloudflare/audit-ia) ----
  var IA = window.AUDIT_IA_API || '';
  if (IA) {
    $('tool-ia-btn').hidden = false;
    if (!location.hash && !new URLSearchParams(location.search).get('atelier')) ouvrir('ia');
  }
  var NOMS_SC = { performance: 'Vitesse', seo: 'Référencement', accessibilite: 'Accessibilité', bonnesPratiques: 'Bonnes pratiques' };
  if ($('ia-form')) $('ia-form').addEventListener('submit', function(e){
    e.preventDefault();
    var inp = $('ia-url'), url = urlValide(inp.value), out = $('ia-out'), btn = this.querySelector('button[type=submit]');
    if (!url) return erreur(inp, 'Indiquez une adresse de site valide, par exemple www.monsite.fr');
    erreur(inp, '');
    btn.disabled = true; btn.textContent = 'Analyse en cours…';
    out.innerHTML = '<div class="loading-bar"><i></i></div><p class="t-note">Je charge votre site, Google le mesure, puis l’IA résume ce qu’il faut retenir. Comptez 30 à 60 secondes.</p>';
    var ctrl = window.AbortController ? new AbortController() : null, to = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 100000);
    fetch(IA + '?url=' + encodeURIComponent(url), ctrl ? { signal: ctrl.signal } : {}).then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j }; }); }).then(function(x){
      if (!x.ok) { out.innerHTML = '<p class="statut ko" style="margin-top:20px">' + esc(x.j.erreur || 'L’analyse a échoué. Réessayez dans un instant.') + '</p>'; return; }
      var R = x.j, S = R.scores || {}, cl = function(v){ return v >= 90 ? 'g' : v >= 50 ? 'o' : 'r'; };
      var rings = Object.keys(NOMS_SC).map(function(k){ var v = S[k]; return '<div class="q-box">' + (v == null ? '<div class="ring"><b>—</b></div>' : '<div class="ring ' + cl(v) + '" style="--v:' + v + '"><b>' + v + '</b></div>') + '<small>' + NOMS_SC[k] + '</small></div>'; }).join('');
      var groupes = { ko: [], warn: [], ok: [] };
      (R.controles || []).forEach(function(c){ (groupes[c.etat] || groupes.warn).push(c); });
      var bloc = function(k, t){ return groupes[k].length ? '<div class="q-box ' + (k === 'ok' ? 'ok' : 'ko') + '"><h4>' + t + '</h4><ul class="chk-l">' + groupes[k].map(function(c){ return '<li class="' + k + '"><span>' + esc(c.titre) + (c.detail ? '<small>' + esc(c.detail) + '</small>' : '') + '</span></li>'; }).join('') + '</ul></div>' : ''; };
      var syn = R.synthese || {};
      out.innerHTML = '<div class="res-h"><b>' + esc(R.url) + '</b><span>Analyse du ' + new Date(R.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) + ' · version téléphone</span></div>' +
        (syn.resume ? '<div class="ia-sum"><h4>En résumé</h4><p>' + esc(syn.resume) + '</p>' + (syn.priorites && syn.priorites.length ? '<ol>' + syn.priorites.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>' : '') + '<small>' + (R.ia ? 'Résumé rédigé par une IA à partir des mesures ci-dessous : il peut contenir des imprécisions.' : 'Résumé automatique à partir des mesures ci-dessous.') + '</small></div>' : '') +
        '<div class="rings" style="margin-top:14px">' + rings + '</div>' +
        '<div class="q-grid" style="margin-top:12px">' + bloc('ko', 'Problèmes détectés') + bloc('warn', 'Points à améliorer') + bloc('ok', 'Points positifs') + '</div>' +
        '<div class="q-act"><button type="button" class="btn btn-lg btn-primary" id="ia-send">Me faire aider sur ces points</button></div>';
      var sc = Object.keys(NOMS_SC).map(function(k){ return NOMS_SC[k] + ' ' + (S[k] == null ? '—' : S[k]); }).join(', ');
      $('ia-send').addEventListener('click', function(){ versContact('Audit automatique de ' + R.url + ' : ' + sc + '. ' + groupes.ko.length + ' problème(s), ' + groupes.warn.length + ' point(s) à améliorer. J’aimerais votre avis.', 'Refonte de site'); });
    }).catch(function(err){
      out.innerHTML = '<p class="statut ko" style="margin-top:20px">' + (err && err.name === 'AbortError' ? 'L’analyse a pris trop de temps. Réessayez dans un instant.' : 'Le service d’analyse ne répond pas. Réessayez plus tard, ou demandez l’audit fait à la main juste en dessous.') + '</p>';
    }).then(function(){ clearTimeout(to); btn.disabled = false; btn.textContent = 'Analyser mon site'; });
  });

  // ouvre l'onglet indiqué dans l'adresse (ex. /outils/#vitesse)
  var H = { '#vitesse': 'perf', '#diagnostic': 'diag', '#site-ideal': 'ideal', '#atelier': 'atelier', '#seo': 'seo', '#audit-auto': 'ia' };
  if (H[location.hash]) { var bt = document.querySelector('[data-tool="' + H[location.hash] + '"]'); if (bt && !bt.hidden) ouvrir(H[location.hash]); }
})();
