/* =========================================================
   Studio Mel · contenu modifiable depuis l'espace admin
   Le site affiche d'abord le contenu écrit dans les pages (lu par Google),
   puis remplace ce qui a été modifié dans l'admin (Firestore : site/contenu
   et collection « articles »). Lecture directe, sans charger Firebase.
   ========================================================= */
(function(){
  var PROJET = 'studio-mel-2f2cc', CLE = 'AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY';
  var BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJET + '/databases/(default)/documents/';
  var CACHE = 'sm-cms-v1', DUREE = 5 * 60 * 1000;
  var esc = function(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var euro = function(n){ return Math.round(n).toLocaleString('fr-FR') + ' €'; };

  // format Firestore (REST) -> objet JavaScript simple
  function val(v){
    if (!v) return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return +v.integerValue;
    if ('doubleValue' in v) return +v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(val);
    if ('mapValue' in v) return champs(v.mapValue.fields || {});
    return null;
  }
  function champs(f){ var o = {}; for (var k in f) o[k] = val(f[k]); return o; }
  function lire(chemin, cle){ return chemin.split('.').reduce(function(o, k){ return o && o[k] != null ? o[k] : null; }, cle); }

  // mini-mise en forme des articles : ## titre, - liste, 1. liste, > encadré, **gras**, [lien](adresse)
  function enLigne(t){
    return esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]*)\)/g, function(m, txt, url){ return '<a href="' + url.replace(/"/g, '') + '"' + (/^https?:/.test(url) ? ' target="_blank" rel="noopener"' : '') + '>' + txt + '</a>'; });
  }
  function mettreEnForme(md){
    var out = [], liste = null, blocs = String(md || '').replace(/\r/g, '').split('\n');
    function fermer(){ if (liste) { out.push('</' + liste + '>'); liste = null; } }
    blocs.forEach(function(l){
      var t = l.trim();
      if (!t) { fermer(); return; }
      var m;
      if ((m = t.match(/^##\s+(.*)/))) { fermer(); out.push('<h2>' + enLigne(m[1]) + '</h2>'); }
      else if ((m = t.match(/^[-•]\s+(.*)/))) { if (liste !== 'ul') { fermer(); out.push('<ul>'); liste = 'ul'; } out.push('<li>' + enLigne(m[1]) + '</li>'); }
      else if ((m = t.match(/^\d+[.)]\s+(.*)/))) { if (liste !== 'ol') { fermer(); out.push('<ol>'); liste = 'ol'; } out.push('<li>' + enLigne(m[1]) + '</li>'); }
      else if ((m = t.match(/^>\s*(.*)/))) { fermer(); out.push('<div class="enc">' + enLigne(m[1]) + '</div>'); }
      else { fermer(); out.push('<p>' + enLigne(t) + '</p>'); }
    });
    fermer(); return out.join('\n');
  }
  window.SM_mettreEnForme = mettreEnForme;

  // ---------- application ----------
  function appliquer(C, articles){
    C = C || {};
    // tarifs : tous les modules partagent le même objet window.TARIFS
    if (C.tarifs && window.TARIFS) {
      for (var k in C.tarifs) if (typeof C.tarifs[k] === 'number' && C.tarifs[k] >= 0) window.TARIFS[k] = C.tarifs[k];
      document.querySelectorAll('[data-prix]').forEach(function(el){
        var n = window.TARIFS[el.dataset.prix]; if (typeof n !== 'number') return;
        if (el.tagName === 'OPTION') { el.textContent = (el.dataset.avant || '') + euro(n); return; }
        var last = null; el.childNodes.forEach(function(c){ if (c.nodeType === 3 && c.nodeValue.trim()) last = c; });
        if (last && el.children.length) last.nodeValue = euro(n); else el.textContent = euro(n);
      });
      // totaux des exemples (page Tarifs) : somme de plusieurs prix
      document.querySelectorAll('[data-somme]').forEach(function(el){
        var t = el.dataset.somme.split(',').reduce(function(s, k){ return s + (window.TARIFS[k.trim()] || 0); }, 0);
        el.textContent = euro(t);
      });
      document.dispatchEvent(new CustomEvent('sm-tarifs'));
    }
    // textes simples
    document.querySelectorAll('[data-cms]').forEach(function(el){
      var v = lire(el.dataset.cms, C);
      if (typeof v === 'string' && v.trim()) el.textContent = v;
      else if (v === '' && /\.badge$/.test(el.dataset.cms)) el.hidden = true;
    });
    // listes (prestations des formules)
    document.querySelectorAll('[data-cms-list]').forEach(function(ul){
      var v = lire(ul.dataset.cmsList, C);
      if (!Array.isArray(v) || !v.length) return;
      ul.innerHTML = v.filter(Boolean).map(function(t, i){ return '<li style="--i:' + i + '">' + esc(t) + '</li>'; }).join('');
    });
    // questions fréquentes
    var faq = document.querySelector('[data-cms-faq]');
    if (faq && Array.isArray(C.faq) && C.faq.length) {
      faq.innerHTML = C.faq.filter(function(x){ return x && x.q; }).map(function(x){ return '<details><summary>' + esc(x.q) + '</summary><p>' + esc(x.r) + '</p></details>'; }).join('');
    }
    if (articles) appliquerArticles(articles);
  }

  function carte(a){
    return '<a class="jc glass" href="/article?a=' + encodeURIComponent(a.slug) + '"><div class="jc-img" style="--a:#2F5BFF;--b:#0B1030"><span aria-hidden="true">✎</span></div>' +
      '<div class="jc-b"><span class="jc-m"><b>' + esc(a.cat || 'Conseils') + '</b>' + (a.date ? ' · ' + esc(dateFr(a.date)) : '') + '</span><h2 class="h3">' + esc(a.titre) + '</h2><p>' + esc(a.resume || '') + '</p></div></a>';
  }
  function dateFr(d){ var p = String(d).slice(0, 10).split('-'); if (p.length !== 3) return d; var M = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']; return (+p[2]) + ' ' + M[+p[1] - 1] + ' ' + p[0]; }

  function appliquerArticles(A){
    var parSlug = {}; A.forEach(function(a){ if (a && a.slug) parSlug[a.slug] = a; });
    // article écrit dans la page : remplacé s'il a été modifié dans l'admin
    var zone = document.querySelector('[data-cms-article]');
    if (zone) {
      var a = parSlug[zone.dataset.cmsArticle];
      if (a && a.contenu && a.publie !== false) {
        zone.innerHTML = mettreEnForme(a.contenu);
        var h = document.querySelector('.ja h1'); if (h && a.titre) { h.textContent = a.titre; document.title = a.titre + ' | Studio Mel'; }
      }
    }
    // liste du Journal : articles masqués retirés, nouveaux articles ajoutés
    var liste = document.querySelector('[data-cms-journal]');
    if (liste) {
      liste.querySelectorAll('a.jc[data-slug]').forEach(function(c){ var a = parSlug[c.dataset.slug]; if (a && a.publie === false) c.remove(); });
      var deja = {}; liste.querySelectorAll('a.jc[data-slug]').forEach(function(c){ deja[c.dataset.slug] = 1; });
      var nouveaux = A.filter(function(a){ return a.publie !== false && !deja[a.slug] && !a.statique; })
        .sort(function(x, y){ return String(y.date).localeCompare(String(x.date)); });
      liste.querySelectorAll('.jc.cms-new').forEach(function(c){ c.remove(); });
      liste.insertAdjacentHTML('afterbegin', nouveaux.map(function(a){ return carte(a).replace('class="jc glass"', 'class="jc glass cms-new"'); }).join(''));
    }
    // page d'un article créé dans l'admin
    var page = document.getElementById('cms-article');
    if (page) {
      var slug = new URLSearchParams(location.search).get('a'), a2 = parSlug[slug];
      if (a2 && a2.publie !== false) {
        document.getElementById('cms-titre').textContent = a2.titre;
        document.getElementById('cms-meta').innerHTML = '<b>' + esc(a2.cat || 'Conseils') + '</b>' + (a2.date ? ' · ' + esc(dateFr(a2.date)) : '') + (a2.lecture ? ' · ' + (+a2.lecture) + ' min de lecture' : '') + ' · par Melvyn';
        document.getElementById('cms-crumb').textContent = a2.cat || 'Article';
        page.innerHTML = mettreEnForme(a2.contenu);
        document.title = a2.titre + ' | Studio Mel';
        var md = document.querySelector('meta[name=description]'); if (md && a2.resume) md.setAttribute('content', a2.resume);
      } else if (articlesCharges) {
        document.getElementById('cms-titre').textContent = 'Article introuvable';
        page.innerHTML = '<p>Cet article n’existe pas ou n’est plus publié. <a href="/journal">Voir tous les conseils</a></p>';
      }
    }
  }

  // ---------- chargement (avec cache de session pour éviter les clignotements) ----------
  var articlesCharges = false;
  var cache = null;
  try { cache = JSON.parse(sessionStorage.getItem(CACHE) || 'null'); } catch (e) {}
  if (cache) { articlesCharges = true; appliquer(cache.c, cache.a); }
  if (cache && Date.now() - cache.t < DUREE) return;

  var opts = window.AbortSignal && AbortSignal.timeout ? { signal: AbortSignal.timeout(8000) } : {};
  var pContenu = fetch(BASE + 'site/contenu?key=' + CLE, opts).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){ return j && j.fields ? champs(j.fields) : {}; }).catch(function(){ return null; });
  var pArticles = fetch(BASE + 'articles?pageSize=100&key=' + CLE, opts).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){ return j && j.documents ? j.documents.map(function(d){ return champs(d.fields || {}); }) : []; }).catch(function(){ return null; });
  Promise.all([pContenu, pArticles]).then(function(res){
    var C = res[0], A = res[1];
    if (C === null && A === null) { if (document.getElementById('cms-article') && !cache) { articlesCharges = true; appliquerArticles([]); } return; }
    articlesCharges = true;
    appliquer(C || {}, A || []);
    try { sessionStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), c: C || {}, a: A || [] })); } catch (e) {}
  });
})();
