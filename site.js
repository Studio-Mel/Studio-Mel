/* =========================================================
   Studio Mel · script commun à toutes les pages
   Navigation, apparitions au défilement, bouton d'appel,
   validation des formulaires, passage d'infos vers le formulaire de contact.
   ========================================================= */
(function(){
  var root = document.documentElement;
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.SM_CALM = calm;

  // ---------- navigation ----------
  var nav = document.querySelector('.nav'), burger = document.getElementById('burger'), menu = document.getElementById('menu');
  function setMenu(open){
    if (!menu) return;
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  if (burger) {
    burger.addEventListener('click', function(e){ e.stopPropagation(); setMenu(!menu.classList.contains('open')); });
    document.addEventListener('click', function(e){ if (menu.classList.contains('open') && !menu.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });
    menu.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });
    addEventListener('resize', function(){ if (innerWidth > 900) setMenu(false); });
  }
  var tick = false;
  function onScroll(){ tick = false; if (nav) nav.classList.toggle('scrolled', scrollY > 24); }
  addEventListener('scroll', function(){ if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------- préparation des animations (avant l'observateur) ----------
  // 1. titres découpés en mots qui montent un par un
  if (!calm) document.querySelectorAll('.page-head h1, .sec-head h2, .final h2, .cta-band h2, .h-sec, .ba-title, .audit-box h2, .ja h1').forEach(function(h){
    if (h.children.length || h.classList.contains('split')) return;
    var mots = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = mots.map(function(m, i){ return '<span class="w" aria-hidden="true"><span style="--wi:' + i + '">' + m + '</span></span>'; }).join(' ');
    h.classList.add('split');
    if (!h.hasAttribute('data-reveal')) h.setAttribute('data-reveal', '');
  });
  // 2. listes qui apparaissent élément par élément
  document.querySelectorAll('.svc, .values, .faq, .chips, .contacts, .jr-list, .foot-grid, .track ol, .price-notes, .tools, .crumbs, .rf, .cta-row, .final-alt, .q-grid').forEach(function(list){
    Array.prototype.forEach.call(list.children, function(el, i){
      if (el.hasAttribute('data-reveal') && el.parentNode !== list) return;
      el.setAttribute('data-reveal', el.getAttribute('data-reveal') || '');
      el.style.setProperty('--d', Math.min(i, 8));
    });
  });
  // 3. aperçus des fiches projet : même dévoilement que sur l'accueil
  document.querySelectorAll('.case-v > .shot, .pcard-v > .shot').forEach(function(s){ s.setAttribute('data-reveal', 'clip'); });

  // ---------- apparitions au défilement ----------
  // [data-reveal] reçoit .in quand il entre à l'écran ; --d règle un léger décalage.
  var els = document.querySelectorAll('[data-reveal]');
  function montrer(el){ el.classList.add('in'); el.dispatchEvent(new CustomEvent('revealed')); }
  if (calm) {
    els.forEach(function(el){ el.classList.add('in'); });
  } else {
    // Tout élément qui atteint 88 % de la hauteur de l'écran (ou qu'on a déjà dépassé,
    // après un saut d'ancre ou un défilement rapide) apparaît. Rien ne peut rester caché.
    var attente = Array.prototype.slice.call(els), sTick = false;
    function balayer(){
      sTick = false;
      var lim = innerHeight * .88;
      attente = attente.filter(function(el){
        var r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return true;
        if (r.top < lim) { montrer(el); return false; }
        return true;
      });
      if (!attente.length) { removeEventListener('scroll', demande); removeEventListener('resize', demande); }
    }
    function demande(){ if (!sTick) { sTick = true; requestAnimationFrame(balayer); } }
    addEventListener('scroll', demande, { passive: true });
    addEventListener('resize', demande);
    document.addEventListener('toggle', demande, true);
    document.addEventListener('click', function(){ setTimeout(demande, 50); });
    requestAnimationFrame(balayer);
    addEventListener('load', demande);
  }

  // ---------- accompagnement : la ligne avance avec le défilement ----------
  document.querySelectorAll('.track').forEach(function(track){
  if (track.querySelector('.track-line i')) {
    var line = track.querySelector('.track-line i'), steps = track.querySelectorAll('li'), vert = false, raf = 0, actif = false;
    function maj(){
      raf = 0;
      var r = track.getBoundingClientRect(), vh = innerHeight;
      vert = innerWidth <= 900;
      // progression de 0 (bas de l'écran) à 1 (le bloc a atteint le premier tiers)
      var p = calm ? 1 : Math.max(0, Math.min(1, (vh * .92 - r.top) / (r.height + vh * .45)));
      line.style.setProperty('--p', p.toFixed(3));
      var n = steps.length;
      steps.forEach(function(li, i){ li.classList.toggle('on', p >= (i + .35) / (n + .4)); });
    }
    function demander(){ if (!raf) raf = requestAnimationFrame(maj); }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function(e){
        actif = e[0].isIntersecting;
        if (actif) { addEventListener('scroll', demander, { passive: true }); demander(); }
        else removeEventListener('scroll', demander);
      }).observe(track);
    } else { line.style.setProperty('--p', 1); steps.forEach(function(li){ li.classList.add('on'); }); }
    addEventListener('resize', demander);
  }
  });


  // ---------- ambiance colorée : la couleur du fond suit la section à l'écran ----------
  // pages sans teintes prévues : on les répartit automatiquement, mêmes couleurs que l'accueil
  if (!document.querySelector('[data-ta]')) {
    var PAL = [['rgba(47,91,255,.55)','rgba(124,92,255,.28)'],['rgba(20,170,200,.45)','rgba(47,91,255,.26)'],['rgba(124,92,255,.55)','rgba(214,92,255,.24)'],['rgba(28,160,140,.42)','rgba(47,91,255,.28)']];
    var zones = [].concat([].slice.call(document.querySelectorAll('.page-head')), [].slice.call(document.querySelectorAll('.page-body > .wrap > *, .ja > *')));
    zones.forEach(function(z, i){ var c = PAL[i % PAL.length]; z.setAttribute('data-ta', c[0]); z.setAttribute('data-tb', c[1]); });
  }
  var teintes = document.querySelectorAll('[data-ta]');
  if (teintes.length) {
    var amb = document.createElement('div'); amb.className = 'ambiance'; amb.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(amb, document.body.firstChild); document.body.classList.add('amb');
    var teinter = function(el){ amb.style.setProperty('--ta', el.dataset.ta); amb.style.setProperty('--tb', el.dataset.tb || el.dataset.ta); };
    teinter(teintes[0]);
    // lumières qui flottent dans l'écran : suivent la souris, puis repartent se balader seules
    var orbes = [0, 1].map(function(i){ var o = document.createElement('i'); o.className = 'amb-orbe o' + i; amb.appendChild(o); return o; });
    if (!calm) {
      var sourisOk = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
      var mx = .5, my = .5, vu = -1e9, pos = [{ x: .3, y: .3 }, { x: .7, y: .7 }], tAmb = 0, actifAmb = true;
      if (sourisOk) addEventListener('pointermove', function(e){ if (e.pointerType !== 'mouse') return; mx = e.clientX / innerWidth; my = e.clientY / innerHeight; vu = performance.now(); }, { passive: true });
      document.addEventListener('visibilitychange', function(){ actifAmb = !document.hidden; if (actifAmb) requestAnimationFrame(bouger); });
      function balade(t, k){
        // trajectoire douce et jamais répétée exactement (somme de sinus)
        return { x: .5 + .34 * Math.sin(t * .00011 + k * 2.1) + .12 * Math.sin(t * .00029 + k * 4.3),
                 y: .5 + .30 * Math.cos(t * .00009 + k * 1.7) + .14 * Math.sin(t * .00023 + k * 3.1) };
      }
      function bouger(t){
        if (!actifAmb) return;
        var dt = Math.min(64, t - (tAmb || t)); tAmb = t;
        var suit = sourisOk && (t - vu < 3500);
        orbes.forEach(function(o, i){
          var c = balade(t, i);
          if (suit) c = i === 0 ? { x: mx, y: my } : { x: 1 - mx * .6 - .2, y: 1 - my * .6 - .2 };
          var k = 1 - Math.exp(-dt / (suit ? 520 : 1400));
          pos[i].x += (c.x - pos[i].x) * k; pos[i].y += (c.y - pos[i].y) * k;
          o.style.transform = 'translate3d(' + (pos[i].x * innerWidth).toFixed(1) + 'px,' + (pos[i].y * innerHeight).toFixed(1) + 'px,0) translate(-50%,-50%)';
        });
        requestAnimationFrame(bouger);
      }
      requestAnimationFrame(bouger);
    }
    if ('IntersectionObserver' in window) {
      var tio = new IntersectionObserver(function(en){ en.forEach(function(e){ if (e.isIntersecting) teinter(e.target); }); }, { rootMargin: '-45% 0px -45% 0px' });
      teintes.forEach(function(el){ tio.observe(el); });
    }
  }

  // ---------- chiffres clés qui comptent (À propos) ----------
  document.querySelectorAll('[data-compte]').forEach(function(el){
    var cible = +el.dataset.compte, suite = el.textContent.replace(/^\d+/, '');
    if (calm || !cible || !('IntersectionObserver' in window)) return;
    el.textContent = '0' + suite;
    var o = new IntersectionObserver(function(en){
      if (!en[0].isIntersecting) return; o.disconnect();
      var t0 = performance.now(), dur = 1400;
      (function pas(t){ var q = Math.min(1, (t - t0) / dur), v = Math.round(cible * (1 - Math.pow(1 - q, 3))); el.textContent = v + suite; if (q < 1) requestAnimationFrame(pas); })(t0);
    }, { threshold: .6 });
    o.observe(el);
  });

  // ---------- barre de progression de lecture ----------
  var bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  function progression(){
    var max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
  }
  addEventListener('scroll', function(){ requestAnimationFrame(progression); }, { passive: true });
  addEventListener('resize', progression); progression();

  // ---------- effets à la souris (ordinateur uniquement) ----------
  var souris = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (souris && !calm) {
    // inclinaison légère des aperçus et des cartes
    document.querySelectorAll('.story-visual, .case-v > .shot, .pcard, .jc, .fcard, .tool, .sk').forEach(function(el){
      el.classList.add('tilt');
      el.addEventListener('pointermove', function(e){
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        var f = el.classList.contains('fcard') || el.classList.contains('tool') ? 3 : 5;
        el.style.setProperty('--rx', (-y * f).toFixed(2) + 'deg'); el.style.setProperty('--ry', (x * f).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100 + 50).toFixed(1) + '%'); el.style.setProperty('--my', (y * 100 + 50).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function(){ el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
    // boutons principaux « aimantés »
    document.querySelectorAll('.btn-lg.btn-primary, .nav-cta').forEach(function(b){
      b.classList.add('magnet');
      b.addEventListener('pointermove', function(e){
        var r = b.getBoundingClientRect();
        b.style.setProperty('--tx', ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px');
        b.style.setProperty('--ty', ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function(){ b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
    });
  }

  // ---------- chiffres qui défilent jusqu'au prix ----------
  if (!calm && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function(en){
      en.forEach(function(e){
        if (!e.isIntersecting) return; cio.unobserve(e.target);
        var el = e.target, node = Array.prototype.find.call(el.childNodes, function(n){ return n.nodeType === 3 && /\d/.test(n.nodeValue); });
        if (!node) return;
        var txt = node.nodeValue, cible = parseInt(txt.replace(/\D/g, ''), 10), t0 = performance.now(), dur = 1100;
        if (!cible) return;
        (function pas(t){
          var k = Math.min(1, (t - t0) / dur), v = Math.round(cible * (1 - Math.pow(1 - k, 3)));
          node.nodeValue = txt.replace(/\d[\d\s\u202f\u00a0]*(?=\s*€)/, v.toLocaleString('fr-FR') + ' ');
          if (k < 1) requestAnimationFrame(pas); else node.nodeValue = txt;
        })(t0);
      });
    }, { threshold: .6 });
    document.querySelectorAll('.fcard-price, .svc strong').forEach(function(el){ cio.observe(el); });
  }

  // ---------- bouton « Appeler » sur téléphone ----------
  (function(){
    var t = String(window.TEL_STUDIO || '').replace(/\D/g, ''), fab = document.getElementById('fab');
    if (!fab || t.length < 10) return;
    document.getElementById('fab-tel').href = 'tel:+33' + t.replace(/^0/, '');
    fab.hidden = false; document.body.classList.add('has-fab');
  })();

  // ---------- année du pied de page ----------
  document.querySelectorAll('[data-year]').forEach(function(el){ el.textContent = new Date().getFullYear(); });

  // ---------- validation des formulaires ----------
  window.valider = function(f){
    var ok = true, premier = null;
    f.querySelectorAll('input[required], textarea[required]').forEach(function(el){
      var v = el.value.trim(), msg = '';
      if (!v) msg = 'Ce champ est obligatoire.';
      else if (el.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v)) msg = 'Cette adresse e-mail ne semble pas valide.';
      else if (el.type === 'tel' && v.replace(/\D/g, '').length < 10) msg = 'Indiquez un numéro à 10 chiffres.';
      else if (el.type === 'url' && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}/i.test(v)) msg = 'Indiquez l’adresse de votre site, par exemple www.monsite.fr';
      var box = el.closest('.fld'), err = box && box.querySelector('.err');
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg;
      else if (msg && !premier) { var st = f.querySelector('[role=status]'); if (st) { st.className = 'statut ko'; st.textContent = (el.getAttribute('aria-label') || el.placeholder || 'Champ') + ' : ' + msg.charAt(0).toLowerCase() + msg.slice(1); } }
      if (msg) { ok = false; if (!premier) premier = el; }
    });
    if (premier) premier.focus();
    return ok;
  };
  document.addEventListener('input', function(e){
    var el = e.target;
    if (el.getAttribute && el.getAttribute('aria-invalid') === 'true') {
      el.setAttribute('aria-invalid', 'false');
      var box = el.closest('.fld'), err = box && box.querySelector('.err'); if (err) err.textContent = '';
    }
  });

  // ---------- envoyer des infos vers le formulaire de contact ----------
  // Le visiteur relit toujours le message avant de l'envoyer lui-même.
  // (stockage de session : effacé à la fermeture de l'onglet, rien n'est envoyé à un tiers)
  window.versContact = function(texte, formule, detail){
    try { sessionStorage.setItem('sm-contact', JSON.stringify({ texte: texte || '', formule: formule || '', detail: detail || null })); } catch (e) {}
    var q = formule ? '?formule=' + encodeURIComponent(formule) : '';
    location.href = '/contact' + q + '#formulaire';
  };
})();

/* v2.14 · transitions entre pages, curseur, galerie plein écran, envoi réussi */
(function(){
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  // ---------- transitions : fondu entre les pages, rideau vers l'admin ----------
  if (root.classList.contains('fondu-in')) setTimeout(function(){ root.classList.remove('fondu-in'); }, 700);
  addEventListener('pageshow', function(e){ if (e.persisted) root.classList.remove('rideau-in', 'fondu-out', 'fondu-in'); });
  if (!calm) document.addEventListener('click', function(e){
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
    if (a.target && a.target !== '_self' || a.hasAttribute('download') || a.dataset.noRideau !== undefined) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || /^(mailto|tel):/.test(a.getAttribute('href'))) return;
    if (/\.(pdf|zip|jpg|png|webp)$/i.test(u.pathname)) return;
    var admin = /\/admin/.test(u.pathname);
    if (u.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '') && u.search === location.search) return; // simple ancre sur la même page
    e.preventDefault();
    // cadenas / espace admin : le rideau bleu ; partout ailleurs : un fondu doux
    try { sessionStorage.setItem(admin ? 'sm-rideau' : 'sm-fondu', '1'); } catch (x) {}
    root.classList.add(admin ? 'rideau-in' : 'fondu-out');
    setTimeout(function(){ location.href = u.href; }, admin ? 430 : 200);
  });

  // ---------- curseur personnalisé (ordinateur) ----------
  var fin = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fin && !calm) {
    var cur = document.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true');
    cur.innerHTML = '<i class="cur-c"></i>';
    document.body.appendChild(cur);
    var VOIR = '.pcard, .case-v .shot, .pj-shot, [data-galerie] img, .mt-ex-v, .jc, .story-visual, .pj-next';
    var LIEN = 'a, button, summary, label, select, [role="tab"], input[type="range"], .tool';
    var TEXTE = 'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable]';
    addEventListener('pointermove', function(e){
      if (e.pointerType !== 'mouse') return;
      // le rond et le point sont un seul élément : aucun retard
      cur.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
      root.classList.add('cur-on');
      var t = e.target, v = t.closest && t.closest(VOIR), l = t.closest && t.closest(LIEN), tx = t.closest && t.closest(TEXTE);
      root.classList.toggle('cur-voir', !!v && !tx);
      root.classList.toggle('cur-lien', !v && !!l && !tx);
      root.classList.toggle('cur-texte', !!tx);
    }, { passive: true });
    document.addEventListener('pointerleave', function(){ root.classList.add('cur-out'); });
    document.addEventListener('pointerenter', function(){ root.classList.remove('cur-out'); });
    addEventListener('pointerdown', function(){ root.classList.add('cur-clic'); });
    addEventListener('pointerup', function(){ root.classList.remove('cur-clic'); });
  }

  // ---------- galerie plein écran ----------
  var lb, lbImg, lbCap, lbN, liste = [], idx = 0, ouvreur = null;
  function construire(){
    lb = document.createElement('div'); lb.className = 'lb'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image en grand');
    lb.innerHTML = '<button class="lb-x" type="button" aria-label="Fermer">×</button><button class="lb-p" type="button" aria-label="Image précédente">‹</button>' +
      '<figure><img alt=""><figcaption></figcaption></figure><button class="lb-s" type="button" aria-label="Image suivante">›</button><span class="lb-n" aria-live="polite"></span>';
    document.body.appendChild(lb);
    lbImg = lb.querySelector('img'); lbCap = lb.querySelector('figcaption'); lbN = lb.querySelector('.lb-n');
    lb.querySelector('.lb-x').addEventListener('click', fermer);
    lb.querySelector('.lb-p').addEventListener('click', function(){ montrer(idx - 1); });
    lb.querySelector('.lb-s').addEventListener('click', function(){ montrer(idx + 1); });
    lb.addEventListener('click', function(e){ if (e.target === lb || e.target.tagName === 'FIGURE') fermer(); });
    var sx = 0;
    lb.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function(e){ var d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) montrer(idx + (d < 0 ? 1 : -1)); });
    document.addEventListener('keydown', function(e){
      if (lb.hidden) return;
      if (e.key === 'Escape') fermer(); else if (e.key === 'ArrowRight') montrer(idx + 1); else if (e.key === 'ArrowLeft') montrer(idx - 1);
    });
  }
  function montrer(i){
    idx = (i + liste.length) % liste.length;
    var im = liste[idx], fig = im.closest('figure'), cap = fig && fig.querySelector('figcaption');
    lb.classList.remove('vu'); void lb.offsetWidth;
    lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt || '';
    lbCap.textContent = cap ? cap.textContent : (im.alt || '');
    lbN.textContent = (idx + 1) + ' / ' + liste.length;
    lb.classList.toggle('seule', liste.length < 2);
    lb.classList.add('vu');
  }
  function fermer(){ lb.hidden = true; document.body.classList.remove('lb-ouvert'); if (ouvreur) ouvreur.focus({ preventScroll: true }); }
  document.addEventListener('click', function(e){
    var im = e.target.closest && (e.target.closest('[data-galerie] img') || (e.target.closest('[data-galerie] .zoom') && e.target.closest('[data-galerie] .zoom').querySelector('img')));
    if (!im) return;
    e.preventDefault();
    if (!lb) construire();
    liste = [].slice.call(im.closest('[data-galerie]').querySelectorAll('img'));
    ouvreur = e.target.closest('button') || im;
    lb.hidden = false; document.body.classList.add('lb-ouvert');
    montrer(liste.indexOf(im));
    lb.querySelector('.lb-x').focus({ preventScroll: true });
  });

  // ---------- envoi réussi : petite explosion de confettis bleus ----------
  if (!calm && 'MutationObserver' in window) {
    new MutationObserver(function(m){
      m.forEach(function(r){
        var el = r.target;
        if (!el.classList || !el.classList.contains('statut') || !el.classList.contains('ok') || el.dataset.fete) return;
        el.dataset.fete = '1'; setTimeout(function(){ delete el.dataset.fete; }, 4000);
        var b = el.getBoundingClientRect(), box = document.createElement('div'); box.className = 'fete'; box.setAttribute('aria-hidden', 'true');
        box.style.left = (b.left + 24) + 'px'; box.style.top = (b.top + b.height / 2) + 'px';
        for (var i = 0; i < 26; i++) {
          var p = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 50 + Math.random() * 110;
          p.style.setProperty('--x', (Math.cos(a) * d).toFixed(0) + 'px'); p.style.setProperty('--y', (Math.sin(a) * d - 40).toFixed(0) + 'px');
          p.style.setProperty('--r', (Math.random() * 540 - 270).toFixed(0) + 'deg');
          p.style.background = ['#2F5BFF', '#B4C6FF', '#7C5CFF', '#3DD68C', '#ffffff'][i % 5];
          p.style.animationDelay = (Math.random() * .12).toFixed(2) + 's';
          box.appendChild(p);
        }
        document.body.appendChild(box); setTimeout(function(){ box.remove(); }, 1600);
      });
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }
})();

/* v2.20 · barre de navigation de l'accueil : boutons vers les 4 parties, pastille animée, défilement doux */
(function(){
  var bar = document.querySelector('.sn'); if (!bar) return;
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement, rail = bar.querySelector('.sn-in'), pill = bar.querySelector('.sn-pill');
  var liens = [].slice.call(bar.querySelectorAll('[data-sn]'));
  var secs = liens.map(function(a){ return document.getElementById(a.dataset.sn); });
  var actif = null, verrou = null, anim = null;
  function navH(){ var n = document.querySelector('.nav'); return n ? n.getBoundingClientRect().height : 72; }
  function decal(){ return navH() + bar.getBoundingClientRect().height + 8; }

  // la pastille bleue glisse sous le bouton de la partie affichée
  function poser(id){
    if (id === actif) return; actif = id;
    var a = liens.filter(function(l){ return l.dataset.sn === id; })[0];
    liens.forEach(function(l){ l.classList.toggle('on', l === a); if (l === a) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
    if (!a) { pill.style.opacity = '0'; return; }
    pill.style.opacity = '1';
    pill.style.width = a.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
    // sur téléphone, on garde le bouton actif visible dans la rangée
    if (rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: a.offsetLeft - (rail.clientWidth - a.offsetWidth) / 2, behavior: calm ? 'auto' : 'smooth' });
  }
  function reperer(){
    bar.classList.toggle('colle', bar.getBoundingClientRect().top <= navH() + 1);
    if (verrou) return;
    var ligne = decal() + innerHeight * .25, id = null;
    secs.forEach(function(s){ if (s && s.getBoundingClientRect().top <= ligne) id = s.id; });
    var fin = document.querySelector('.final');
    if (id && fin && fin.getBoundingClientRect().top < innerHeight * .5) id = 'accompagnement';
    poser(id);
  }
  var t = false;
  addEventListener('scroll', function(){ if (!t) { t = true; requestAnimationFrame(function(){ t = false; reperer(); }); } }, { passive: true });
  addEventListener('resize', function(){ var a = actif; actif = null; poser(a); reperer(); });

  // défilement doux et accéléré/ralenti vers la partie choisie, dans les deux sens
  function arreter(){ if (anim) { cancelAnimationFrame(anim); anim = null; verrou = null; root.style.scrollBehavior = ''; } }
  ['wheel', 'touchstart', 'keydown'].forEach(function(ev){ addEventListener(ev, arreter, { passive: true }); });
  liens.forEach(function(a){
    a.addEventListener('click', function(e){
      var cible = document.getElementById(a.dataset.sn); if (!cible) return;
      e.preventDefault(); arreter();
      var y0 = scrollY, y1 = Math.max(0, cible.getBoundingClientRect().top + scrollY - decal() + 1), dist = y1 - y0;
      verrou = a.dataset.sn; poser(verrou);
      if (calm || Math.abs(dist) < 4) { scrollTo(0, y1); fin(); return; }
      var duree = Math.min(1300, Math.max(550, Math.abs(dist) * .4)), t0 = performance.now();
      root.style.scrollBehavior = 'auto';
      function pas(t){
        var q = Math.min(1, (t - t0) / duree), e2 = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
        scrollTo(0, y0 + dist * e2);
        if (q < 1) anim = requestAnimationFrame(pas); else fin();
      }
      anim = requestAnimationFrame(pas);
      function fin(){
        anim = null; root.style.scrollBehavior = '';
        setTimeout(function(){ verrou = null; reperer(); }, 60);
        cible.setAttribute('tabindex', '-1'); cible.focus({ preventScroll: true });
        cible.classList.remove('sn-arrive'); void cible.offsetWidth; cible.classList.add('sn-arrive');
      }
    });
  });
  reperer();
})();

/* v2.21 · menus déroulants (ordinateur) : survol, clic sur « Services », clavier */
(function(){
  var dds = [].slice.call(document.querySelectorAll('.nav-links .dd')); if (!dds.length) return;
  function fermer(sauf){ dds.forEach(function(d){ if (d !== sauf) { d.classList.remove('open'); var b = d.querySelector('button.nl'); if (b) b.setAttribute('aria-expanded', 'false'); } }); }
  dds.forEach(function(d){
    var b = d.querySelector('button.nl');
    if (b) b.addEventListener('click', function(e){ e.stopPropagation(); var o = !d.classList.contains('open'); fermer(d); d.classList.toggle('open', o); b.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    d.addEventListener('mouseleave', function(){ d.classList.remove('open'); if (b) b.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('click', function(e){ if (!e.target.closest('.nav-links .dd')) fermer(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { var o = document.querySelector('.nav-links .dd.open, .nav-links .dd:focus-within'); fermer(); if (o) { o.querySelector('.nl').focus(); if (document.activeElement && o.contains(document.activeElement)) document.activeElement.blur(); } } });
})();
