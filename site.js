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

  // ---------- apparitions au défilement ----------
  // [data-reveal] reçoit .in quand il entre à l'écran ; --d règle un léger décalage.
  var els = document.querySelectorAll('[data-reveal]');
  if (calm || !('IntersectionObserver' in window)) {
    els.forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        en.target.dispatchEvent(new CustomEvent('revealed'));
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .12 });
    els.forEach(function(el){ io.observe(el); });
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
