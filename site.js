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
  var teintes = document.querySelectorAll('[data-ta]');
  if (teintes.length) {
    var amb = document.createElement('div'); amb.className = 'ambiance'; amb.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(amb, document.body.firstChild); document.body.classList.add('amb');
    var teinter = function(el){ amb.style.setProperty('--ta', el.dataset.ta); amb.style.setProperty('--tb', el.dataset.tb || el.dataset.ta); };
    teinter(teintes[0]);
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
