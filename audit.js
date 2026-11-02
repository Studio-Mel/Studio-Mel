/* =========================================================
   Studio Mel · audit automatique
   Le visiteur tape l'adresse de son site : Google PageSpeed (Lighthouse) l'analyse
   en version téléphone, et ce script traduit le résultat en français simple :
   notes, résumé, priorités, points positifs.
   Si le relais Cloudflare avec IA est configuré (AUDIT_IA_API), c'est lui qui répond
   et le résumé est rédigé par l'IA. Sinon tout se passe ici, sans serveur.
   ========================================================= */
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var form = $('analyse-form'); if (!form) return;
  var out = $('analyse-out'), inp = $('analyse-url'), btn = form.querySelector('button[type=submit]');
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var NOMS = { performance: 'Vitesse', seo: 'Référencement', accessibilite: 'Accessibilité', bonnesPratiques: 'Fiabilité' };

  // Explications simples pour les contrôles Lighthouse les plus utiles à un artisan.
  // Les autres gardent le titre français fourni par Google.
  var CLAIR = {
    'document-title': ['Votre page n’a pas de titre pour Google', 'C’est le texte bleu affiché dans les résultats : il doit dire votre métier et votre ville.'],
    'meta-description': ['Pas de description pour Google', 'Sans elle, Google choisit lui-même un extrait de votre page, souvent peu engageant.'],
    'image-alt': ['Des images sans description', 'Google ne « voit » pas les images : une courte description l’aide à comprendre votre activité.'],
    'link-text': ['Des liens peu parlants', 'Des liens du type « cliquez ici » n’expliquent rien à Google ni aux visiteurs.'],
    'crawlable-anchors': ['Des liens que Google ne peut pas suivre', 'Certaines pages risquent de ne jamais être découvertes.'],
    'is-crawlable': ['Google n’a pas le droit d’afficher votre page', 'Une balise bloque l’indexation : votre site ne peut pas apparaître dans les recherches.'],
    'http-status-code': ['La page renvoie une erreur', 'Google considère la page comme cassée.'],
    'robots-txt': ['Le fichier robots.txt pose problème', 'Il donne les consignes aux robots de Google, et il contient une erreur.'],
    'canonical': ['L’adresse de référence est mal indiquée', 'Google peut hésiter entre plusieurs versions de votre page.'],
    'hreflang': ['Les versions de langue sont mal déclarées', ''],
    'viewport': ['Le site n’est pas prévu pour les téléphones', 'Sur mobile, il s’affiche en tout petit : la majorité de vos visiteurs sont sur téléphone.'],
    'is-on-https': ['Le site n’est pas entièrement sécurisé', 'Les navigateurs peuvent afficher « Non sécurisé », ce qui inquiète les clients.'],
    'color-contrast': ['Des textes difficiles à lire', 'Le contraste entre le texte et le fond est trop faible, surtout en plein soleil sur un téléphone.'],
    'html-has-lang': ['La langue de la page n’est pas indiquée', ''],
    'heading-order': ['Les titres sont dans le désordre', 'Une structure claire aide Google et les lecteurs d’écran.'],
    'button-name': ['Des boutons sans nom', 'Les personnes qui utilisent un lecteur d’écran ne savent pas à quoi ils servent.'],
    'link-name': ['Des liens sans nom', ''],
    'label': ['Des champs de formulaire sans étiquette', 'Le formulaire de contact est moins facile à remplir.'],
    'errors-in-console': ['Des erreurs techniques dans la page', 'Elles peuvent empêcher certaines parties du site de fonctionner.'],
    'image-aspect-ratio': ['Des images déformées', ''],
    'render-blocking-resources': ['Des fichiers retardent l’affichage', 'Le navigateur attend qu’ils soient chargés avant de montrer la page.'],
    'uses-optimized-images': ['Des images trop lourdes', 'Des photos non compressées ralentissent fortement le site sur téléphone.'],
    'modern-image-formats': ['Des images dans un format ancien', 'Les formats récents (WebP, AVIF) sont deux à trois fois plus légers.'],
    'uses-responsive-images': ['Des images trop grandes pour l’écran', 'Le téléphone télécharge des photos bien plus grandes que nécessaire.'],
    'offscreen-images': ['Des images chargées trop tôt', 'Les images du bas de page pourraient attendre qu’on y arrive.'],
    'unused-javascript': ['Du code inutile ralentit la page', ''],
    'unused-css-rules': ['Du style inutile ralentit la page', ''],
    'uses-text-compression': ['Les fichiers ne sont pas compressés', 'Une simple compression côté hébergeur accélérerait le site.'],
    'server-response-time': ['L’hébergement répond lentement', 'Le serveur met du temps à envoyer la page : l’hébergement est peut-être en cause.'],
    'total-byte-weight': ['La page est très lourde', 'Elle consomme beaucoup de données mobiles et charge lentement en 4G.'],
    'font-display': ['Le texte reste invisible pendant le chargement', ''],
    'redirects': ['Trop de redirections', 'Chaque redirection ajoute un temps d’attente.']
  };
  var METRIQUES = ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift', 'interactive', 'max-potential-fid'];

  function urlValide(v){
    v = (v || '').trim(); if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { var u = new URL(v); if (!/\./.test(u.hostname) || /\s/.test(v)) return null; return u.href; } catch (e) { return null; }
  }
  function erreur(msg){
    var e = form.querySelector('.err'); e.textContent = msg; inp.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) inp.focus();
  }

  // ---------- 1. analyse par Google PageSpeed, directement depuis le navigateur ----------
  function analyserGoogle(url, signal){
    var api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(url) + '&strategy=mobile&locale=fr' +
      '&category=performance&category=seo&category=accessibility&category=best-practices' + (window.PSI_KEY ? '&key=' + window.PSI_KEY : '');
    return fetch(api, { signal: signal }).then(function(r){
      return r.json().then(function(j){
        if (!r.ok || !j.lighthouseResult) {
          var m = j && j.error && j.error.message || '';
          throw new Error(/FAILED_DOCUMENT_REQUEST|ERRORED_DOCUMENT_REQUEST|DNS|NO_FCP/i.test(m) ? 'Google n’a pas réussi à ouvrir ce site. Vérifiez l’adresse : le site est peut-être hors ligne ou bloque les robots.'
            : /quota|rate/i.test(m) ? 'Trop d’analyses en ce moment. Réessayez dans quelques minutes.' : 'L’analyse a échoué. Vérifiez l’adresse et réessayez.');
        }
        return traduire(j.lighthouseResult);
      });
    });
  }

  // transforme le rapport Lighthouse en rapport simple
  function traduire(L){
    var C = L.categories, A = L.audits;
    var sc = function(k){ return C[k] && C[k].score != null ? Math.round(C[k].score * 100) : null; };
    var scores = { performance: sc('performance'), seo: sc('seo'), accessibilite: sc('accessibility'), bonnesPratiques: sc('best-practices') };
    var POIDS = { performance: 1, seo: 1.4, accessibility: .7, 'best-practices': .8 };
    var vus = {}, controles = [];
    Object.keys(POIDS).forEach(function(cat){
      if (!C[cat]) return;
      C[cat].auditRefs.forEach(function(ref){
        var a = A[ref.id]; if (!a || vus[ref.id] || METRIQUES.indexOf(ref.id) >= 0) return;
        if (a.scoreDisplayMode === 'notApplicable' || a.scoreDisplayMode === 'manual' || a.scoreDisplayMode === 'informative' || a.score == null) return;
        if (ref.weight === 0 && !(a.details && a.details.type === 'opportunity')) return;
        vus[ref.id] = 1;
        var gain = a.details && a.details.overallSavingsMs || 0;
        var imp = a.score >= .9 ? 0 : (1 - a.score) * (ref.weight || 1) * POIDS[cat] + gain / 400;
        var c = CLAIR[ref.id], ok = a.score >= .9;
        controles.push({
          id: ref.id, cat: cat, etat: ok ? 'ok' : a.score < .5 ? 'ko' : 'warn', imp: imp,
          titre: ok ? a.title : (c ? c[0] : a.title),
          detail: ok ? '' : ((c && c[1]) || '') + (gain > 300 ? (c && c[1] ? ' ' : '') + 'Gain possible : environ ' + (Math.round(gain / 100) / 10).toLocaleString('fr-FR') + ' s.' : '')
        });
      });
    });
    controles.sort(function(a, b){ return b.imp - a.imp; });
    var lcp = A['largest-contentful-paint'], lcpS = lcp && lcp.numericValue ? lcp.numericValue / 1000 : null;
    return { url: L.finalDisplayedUrl || L.finalUrl || L.requestedUrl, date: new Date().toISOString(), scores: scores, controles: controles, lcp: lcpS, synthese: resumer(scores, controles, lcpS), ia: false };
  }

  // résumé en français simple, construit à partir des mesures
  function resumer(S, ctrl, lcp){
    var ko = ctrl.filter(function(c){ return c.etat === 'ko'; }), warn = ctrl.filter(function(c){ return c.etat === 'warn'; });
    var p = S.performance, s = S.seo, phr = [];
    if (p != null) phr.push(p >= 90 ? 'Votre site est rapide sur téléphone' + (lcp ? ' : le contenu principal s’affiche en ' + lcp.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' s.' : '.')
      : p >= 50 ? 'Votre site est un peu lent sur téléphone' + (lcp ? ' : il faut ' + lcp.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' s pour voir l’essentiel, l’idéal étant moins de 2,5 s.' : '.')
      : 'Votre site est lent sur téléphone' + (lcp ? ' (' + lcp.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' s avant de voir l’essentiel)' : '') + ', et une partie des visiteurs part avant la fin du chargement.');
    if (s != null) phr.push(s >= 90 ? 'Les bases pour Google sont en place.' : s >= 70 ? 'Google comprend votre site, mais quelques réglages l’aideraient à mieux vous classer.' : 'Google a du mal à comprendre votre site, ce qui vous fait perdre des clients qui vous cherchent.');
    phr.push(ko.length ? ko.length + ' problème' + (ko.length > 1 ? 's importants' : ' important') + ' à corriger' + (warn.length ? ', et ' + warn.length + ' point' + (warn.length > 1 ? 's' : '') + ' à améliorer.' : '.') : warn.length ? 'Pas de problème grave, ' + warn.length + ' point' + (warn.length > 1 ? 's' : '') + ' à améliorer.' : 'Rien de grave à signaler, bravo.');
    return { resume: phr.join(' '), priorites: ko.concat(warn).slice(0, 3).map(function(c){ return c.titre; }) };
  }

  // ---------- 2. relais Cloudflare avec IA (si configuré) ----------
  function analyserRelais(url, signal){
    return fetch(window.AUDIT_IA_API + '?url=' + encodeURIComponent(url), { signal: signal }).then(function(r){
      return r.json().then(function(j){ if (!r.ok) throw new Error(j.erreur || 'L’analyse a échoué.'); return j; });
    });
  }

  // ---------- affichage ----------
  var ETAPES = ['Ouverture de votre site', 'Mesure de la vitesse sur téléphone', 'Vérification de ce que voit Google', 'Contrôle de la lisibilité', 'Rédaction du rapport'];
  function attente(){
    var i = 0;
    out.innerHTML = '<div class="an-wait"><div class="an-scan" aria-hidden="true"><i></i></div><ol>' + ETAPES.map(function(e){ return '<li>' + e + '</li>'; }).join('') + '</ol><p class="t-note">Comptez 20 à 60 secondes : Google charge réellement votre site, comme un visiteur sur téléphone.</p></div>';
    var lis = out.querySelectorAll('.an-wait li');
    lis[0].className = 'cur';
    return setInterval(function(){ if (i < lis.length - 1) { lis[i].className = 'done'; i++; lis[i].className = 'cur'; } }, 7000);
  }
  function anneau(v, nom, i){
    var cl = v == null ? '' : v >= 90 ? 'g' : v >= 50 ? 'o' : 'r';
    return '<div class="an-score" style="--i:' + i + '"><div class="ring ' + cl + '" style="--v:' + (v || 0) + '"><b data-n="' + (v == null ? '' : v) + '">' + (v == null ? '—' : v) + '</b></div><small>' + nom + '</small></div>';
  }
  function afficher(R){
    window.SM_RAPPORT = R;
    var S = R.scores || {}, ctrl = R.controles || [];
    var ko = ctrl.filter(function(c){ return c.etat === 'ko'; }), warn = ctrl.filter(function(c){ return c.etat === 'warn'; }), ok = ctrl.filter(function(c){ return c.etat === 'ok'; });
    var moy = Object.keys(NOMS).map(function(k){ return S[k]; }).filter(function(v){ return v != null; });
    var global = moy.length ? Math.round(moy.reduce(function(a, b){ return a + b; }, 0) / moy.length) : null;
    var verdict = global == null ? '' : global >= 90 ? 'Très bon site' : global >= 75 ? 'Bon site, à peaufiner' : global >= 50 ? 'Site à améliorer' : 'Site à revoir en priorité';
    var li = function(c){ return '<li class="' + c.etat + '"><span>' + esc(c.titre) + (c.detail ? '<small>' + esc(c.detail) + '</small>' : '') + '</span></li>'; };
    var syn = R.synthese || {};
    out.innerHTML =
      '<div class="an-report">' +
        '<div class="an-head"><div><span class="an-url">' + esc(R.url) + '</span><h2 class="an-verdict">' + verdict + '</h2><p class="an-date">Analyse du ' + new Date(R.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) + ' · version téléphone</p></div>' +
          (global != null ? '<div class="an-global"><b>' + global + '</b><small>/ 100</small></div>' : '') + '</div>' +
        '<div class="an-scores">' + Object.keys(NOMS).map(function(k, i){ return anneau(S[k], NOMS[k], i); }).join('') + '</div>' +
        (syn.resume ? '<div class="ia-sum"><h3>En résumé</h3><p>' + esc(syn.resume) + '</p>' + (syn.priorites && syn.priorites.length ? '<h3 style="margin-top:14px">À faire en premier</h3><ol>' + syn.priorites.map(function(p){ return '<li>' + esc(p) + '</li>'; }).join('') + '</ol>' : '') + '<small>' + (R.ia ? 'Résumé rédigé par une IA à partir des mesures : il peut contenir des imprécisions.' : 'Résumé automatique à partir des mesures de Google PageSpeed Insights.') + '</small></div>' : '') +
        '<div class="an-cols">' +
          (ko.length ? '<div class="q-box ko"><h3>Problèmes importants <span>' + ko.length + '</span></h3><ul class="chk-l">' + ko.slice(0, 8).map(li).join('') + '</ul></div>' : '') +
          (warn.length ? '<div class="q-box ko"><h3>À améliorer <span>' + warn.length + '</span></h3><ul class="chk-l">' + warn.slice(0, 8).map(li).join('') + '</ul></div>' : '') +
          (ok.length ? '<details class="q-box ok an-ok"><summary><h3>Ce qui va bien <span>' + ok.length + '</span></h3></summary><ul class="chk-l">' + ok.map(li).join('') + '</ul></details>' : '') +
        '</div>' +
        '<div class="an-actions"><button type="button" class="btn btn-sm btn-ghost" id="an-print">Imprimer ou enregistrer en PDF</button><button type="button" class="btn btn-sm btn-ghost" id="an-again">Analyser un autre site</button></div>' +
      '</div>';
    // les notes défilent jusqu'à leur valeur
    if (!window.SM_CALM) out.querySelectorAll('.an-score b[data-n], .an-global b').forEach(function(b){
      var n = parseInt(b.textContent, 10); if (isNaN(n)) return; var t0 = performance.now();
      (function pas(t){ var k = Math.min(1, (t - t0) / 1200); b.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas); })(t0);
    });
    $('an-print').addEventListener('click', function(){ window.print(); });
    $('an-again').addEventListener('click', function(){ out.innerHTML = ''; $('analyse-lead').hidden = true; inp.value = ''; inp.focus(); scrollTo({ top: form.getBoundingClientRect().top + scrollY - 120, behavior: window.SM_CALM ? 'auto' : 'smooth' }); });
    // proposition d'aide, préremplie
    var lead = $('analyse-lead'); lead.hidden = false;
    $('lead-site').value = R.url;
    out.querySelector('.an-report').scrollIntoView({ behavior: window.SM_CALM ? 'auto' : 'smooth', block: 'start' });
  }

  var enCours = false;
  form.addEventListener('submit', function(e){
    e.preventDefault(); if (enCours) return;
    var url = urlValide(inp.value);
    if (!url) return erreur('Indiquez l’adresse de votre site, par exemple www.monsite.fr');
    erreur(''); enCours = true;
    btn.disabled = true; btn.classList.add('loading'); btn.textContent = 'Analyse en cours…';
    $('analyse-lead').hidden = true;
    var tick = attente();
    var ctrl = window.AbortController ? new AbortController() : null, to = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 110000);
    var sig = ctrl ? ctrl.signal : undefined;
    var p = window.AUDIT_IA_API ? analyserRelais(url, sig).catch(function(){ return analyserGoogle(url, sig); }) : analyserGoogle(url, sig);
    p.then(afficher).catch(function(err){
      out.innerHTML = '<p class="statut ko" style="margin-top:20px">' + esc(err && err.name === 'AbortError' ? 'L’analyse a pris trop de temps. Réessayez dans un instant.' : (err && err.message) || 'L’analyse a échoué. Réessayez dans un instant.') + '</p>';
    }).then(function(){ clearInterval(tick); clearTimeout(to); enCours = false; btn.disabled = false; btn.classList.remove('loading'); btn.textContent = 'Analyser mon site'; });
  });

  // adresse transmise dans le lien (ex. /audit?site=monsite.fr) : on lance tout de suite
  var pre = new URLSearchParams(location.search).get('site');
  if (pre) { inp.value = pre; form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit')); }
})();
