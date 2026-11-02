/* =========================================================
   Studio Mel · réalisations
   Le contenu des projets est écrit en HTML dans la page (bon pour Google).
   Ce script ajoute : les aperçus vivants, la maquette en grand (ordinateur / téléphone),
   les filtres et le comparateur avant / après.
   Pour ajouter un projet : voir _build/build.py, tableau REALISATIONS.
   ========================================================= */
(function(){
  var calm = window.SM_CALM;
  function tpl(k){ var t = document.getElementById('tpl-' + k); return t ? t.content.cloneNode(true) : document.createTextNode(''); }

  // ---------- aperçus vivants ----------
  document.querySelectorAll('.shot.live:not(.web)').forEach(function(s){ s.querySelector('.ds-scaler').appendChild(tpl(s.dataset.demo)); });
  function fit(){
    document.querySelectorAll('.shot.live').forEach(function(s){
      var vp = s.querySelector('.vp'), sc = s.querySelector('.ds-scaler'), w = vp.clientWidth;
      if (!w) return;
      var k = w / 1200; sc.style.setProperty('--s', k);
      if (s.classList.contains('web')) { sc.style.height = (vp.clientHeight / k) + 'px'; sc.style.setProperty('--h', 0); return; }
      sc.style.setProperty('--h', Math.max(0, sc.scrollHeight - vp.clientHeight / k));
    });
  }
  window.SM_fit = fit;
  addEventListener('resize', fit);
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  addEventListener('load', fit);

  // ---------- maquette en grand ----------
  var dm = document.getElementById('dm');
  if (dm) {
    var view = dm.querySelector('.dm-view'), frameEl = dm.querySelector('.dm-frame'), opener = null;
    function setW(m){
      frameEl.classList.toggle('mob', m === 'mob');
      dm.querySelectorAll('.dm-sw button').forEach(function(b){ var on = b.dataset.w === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    }
    function openDemo(b){
      opener = b.querySelector('.shot-btn') || b; view.innerHTML = '';
      if (b.dataset.site) { var f = document.createElement('iframe'); f.src = b.dataset.site; f.title = 'Site ' + b.dataset.nom; f.className = 'dm-web'; view.appendChild(f); }
      else view.appendChild(tpl(b.dataset.demo));
      view.scrollTop = 0;
      document.getElementById('dm-title').textContent = b.dataset.nom || '';
      document.getElementById('dm-url').textContent = b.dataset.adresse || '';
      setW('pc'); dm.hidden = false; dm.classList.remove('open'); void dm.offsetWidth; dm.classList.add('open');
      document.documentElement.style.overflow = 'hidden';
      dm.querySelector('.dm-x').focus();
    }
    function closeDemo(){
      if (dm.hidden) return;
      dm.hidden = true; view.innerHTML = ''; document.documentElement.style.overflow = '';
      if (opener) opener.focus({ preventScroll: true });
    }
    document.querySelectorAll('[data-demo],[data-site]').forEach(function(b){ if (b.closest('.dm')) return; b.addEventListener('click', function(){ openDemo(b); }); });
    dm.querySelector('.dm-x').addEventListener('click', closeDemo);
    dm.addEventListener('click', function(e){ if (e.target === dm) closeDemo(); });
    dm.querySelectorAll('.dm-sw button').forEach(function(b){ b.addEventListener('click', function(){ setW(b.dataset.w); }); });
    document.addEventListener('keydown', function(e){
      if (dm.hidden) return;
      if (e.key === 'Escape') closeDemo();
      // garde le focus dans la fenêtre
      if (e.key === 'Tab') {
        var f = dm.querySelectorAll('button:not([hidden]), [tabindex="0"], iframe'); if (!f.length) return;
        var a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
  }

  // ---------- filtres (page Réalisations) ----------
  var rf = document.getElementById('rf');
  if (rf) {
    rf.hidden = false;
    rf.addEventListener('click', function(e){
      var b = e.target.closest('[data-f]'); if (!b) return; var k = b.dataset.f;
      rf.querySelectorAll('[data-f]').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('#cases .case').forEach(function(c){
        var t = c.dataset.cats.split(' '), ok = k === 'tous' || t.indexOf(k) >= 0 || (k === 'concept' && (t.indexOf('concept') >= 0 || t.indexOf('proposition') >= 0));
        c.classList.toggle('hid', !ok); c.classList.remove('flt'); if (ok && !calm) { void c.offsetWidth; c.classList.add('flt'); }
      });
      requestAnimationFrame(fit);
    });
  }

  // ---------- avant / après (s'affiche seulement si la capture avant-dupuis.jpg existe) ----------
  var ba = document.getElementById('ba');
  if (ba) {
    var baWrap = document.getElementById('ba-wrap'), baImg = document.getElementById('ba-img');
    ba.querySelector('.ds-scaler').appendChild(tpl('dupuis'));
    function fitBA(){ var w = ba.clientWidth; if (w) ba.querySelector('.ds-scaler').style.setProperty('--s', w / 1200); }
    function showBA(){ baWrap.hidden = false; fitBA(); }
    if (baImg.complete && baImg.naturalWidth) showBA(); else baImg.addEventListener('load', showBA);
    addEventListener('resize', fitBA);
    ba.querySelector('input').addEventListener('input', function(e){ ba.style.setProperty('--p', e.target.value + '%'); });
  }
})();
