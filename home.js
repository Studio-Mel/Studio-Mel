/* =========================================================
   Studio Mel · accueil
   Séquence d'ouverture, cartes de formules, simulateur, ligne d'accompagnement
   ========================================================= */
(function(){
  var calm = window.SM_CALM;
  var root = document.documentElement;

  // ---------- séquence d'ouverture ----------
  // On attend les polices (au plus 900 ms) pour que le titre n'apparaisse pas deux fois.
  (function(){
    var done = false;
    function go(){ if (done) return; done = true; root.classList.add('ready'); }
    setTimeout(go, 900);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
  })();

  // ---------- accueil : le texte s'efface en douceur quand on descend ----------
  var heroIn = document.querySelector('.hero-in'), globe = document.getElementById('globe');
  if (heroIn && !calm) {
    var hTick = false;
    function heroScroll(){
      hTick = false;
      var y = scrollY, vh = innerHeight; if (y > vh * 1.1) return;
      var k = Math.min(1, y / (vh * .75));
      heroIn.style.transform = 'translateY(' + (y * .28).toFixed(1) + 'px)';
      heroIn.style.opacity = (1 - k * .9).toFixed(3);
      if (globe) globe.style.transform = 'translateY(' + (y * .12).toFixed(1) + 'px) scale(' + (1 + k * .06).toFixed(3) + ')';
    }
    addEventListener('scroll', function(){ if (!hTick) { hTick = true; requestAnimationFrame(heroScroll); } }, { passive: true });
  }

  // ---------- indicateur « Découvrir » : disparaît dès qu'on commence à descendre ----------
  (function(){
    var hint = document.querySelector('.scroll-hint'); if (!hint) return;
    function maj(){ root.classList.toggle('a-defile', scrollY > 40); }
    addEventListener('scroll', maj, { passive: true }); maj();
  })();

  // ---------- formules : une carte sélectionnée à la fois ----------
  var grid = document.getElementById('formules-grid');
  if (grid) {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.fcard'));
    cards.forEach(function(c){ c.querySelectorAll('li').forEach(function(li, i){ li.style.setProperty('--i', i); }); });
    function select(i, focus){
      cards.forEach(function(c, k){
        var on = k === i, head = c.querySelector('.fcard-head'), body = c.querySelector('.fcard-body');
        c.classList.toggle('sel', on);
        head.setAttribute('aria-expanded', on ? 'true' : 'false');
        body.setAttribute('aria-hidden', on ? 'false' : 'true');
        body.querySelectorAll('a,button').forEach(function(x){ x.tabIndex = on ? 0 : -1; });
      });
      grid.setAttribute('data-sel', i);
      if (focus) { var b = cards[i].querySelector('.fcard-body .btn'); if (b) setTimeout(function(){ b.focus({ preventScroll: true }); }, 400); }
    }
    cards.forEach(function(c, i){
      c.querySelector('.fcard-head').addEventListener('click', function(){
        select(i);
        if (innerWidth <= 900 && !calm) setTimeout(function(){ c.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 350);
      });
    });
    var d0 = grid.getAttribute('data-sel'); select(d0 === null ? 1 : +d0);

    // Premium : version site vitrine ou boutique en ligne
    var pm = document.getElementById('pm-sw');
    if (pm) {
      var T = window.TARIFS, card = pm.closest('.fcard');
      var fmtE = function(n){ return Math.round(n).toLocaleString('fr-FR') + ' €'; };
      var DATA = {
        vitrine: { cle: 'premium', pre: '', nom: 'Site Premium', btn: 'Choisir le Premium vitrine' },
        boutique: { cle: 'boutique', pre: 'dès', nom: 'Boutique en ligne', btn: 'Choisir la boutique' }
      };
      pm.addEventListener('click', function(e){
        var b = e.target.closest('[data-pm]'); if (!b) return; var k = b.dataset.pm, d = DATA[k];
        pm.querySelectorAll('[data-pm]').forEach(function(x){ x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        card.querySelectorAll('[data-pane]').forEach(function(p){ p.hidden = p.dataset.pane !== k; });
        var pe = card.querySelector('.fcard-price'); pe.dataset.prix = d.cle; pe.innerHTML = (d.pre ? '<small>' + d.pre + '</small>' : '') + fmtE(T[d.cle]);
        var a = card.querySelector('.fcard-inner > .btn'); a.textContent = d.btn; a.href = '/contact?formule=' + encodeURIComponent(d.nom) + '#formulaire';
        card.querySelectorAll('[data-pane]:not([hidden]) li').forEach(function(li, i){ li.style.setProperty('--i', i); });
      });
    }
  }

  // ---------- accompagnement : la ligne avance avec le défilement ----------
  var track = document.getElementById('track');
  if (track) {
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

  // ---------- contact final : le bouton s'illumine une fois ----------
  var fin = document.getElementById('final-btn');
  if (fin && !calm) fin.closest('[data-reveal]').addEventListener('revealed', function(){ fin.classList.add('glow'); });

  // ---------- simulateur de prix ----------
  if (document.getElementById('sim')) {
  var sim = document.getElementById('sim'), shown = 750, tw = null;
  function eur(n){ return Math.round(n).toLocaleString('fr-FR'); }
  function tween(to){
    var el = document.getElementById('sim-total'), from = shown, t0 = performance.now();
    cancelAnimationFrame(tw); shown = to;
    if (calm) { el.textContent = eur(to); return; }
    (function step(now){ var k = Math.min((now - t0) / 450, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = eur(from + (to - from) * e); if (k < 1) tw = requestAnimationFrame(step); })(t0);
  }
  var NOMS = { refonte: 'Refonte de site', creation: 'Création de site vitrine', premium: 'Site Premium', boutique: 'Boutique en ligne' };
  var T = window.TARIFS, nbProd = 20, nbPages = 0;
  sim.querySelectorAll('[data-np]').forEach(function(b){ b.addEventListener('click', function(){ nbProd = Math.max(20, Math.min(200, nbProd + 20 * +b.dataset.np)); document.getElementById('sim-np').textContent = nbProd; simCalc(); }); });
  sim.querySelectorAll('[data-pp]').forEach(function(b){ b.addEventListener('click', function(){ nbPages = Math.max(0, Math.min(15, nbPages + +b.dataset.pp)); document.getElementById('sim-pp').textContent = nbPages; simCalc(); }); });
  var coche = function(n){ var el = sim.querySelector('[name=' + n + ']'); return el && el.checked && !el.disabled; };
  function simCalc(){
    var type = sim.querySelector('[name=sim-type]:checked').value, bq = type === 'boutique';
    var base = T[type];
    sim.querySelector('.sim-bq').hidden = !bq;
    sim.querySelector('[name=sim-gal]').closest('.opt').hidden = bq;
    var lots = bq ? (nbProd - 20) / 20 : 0, promo = bq && coche('sim-promo');
    var pm = bq ? T.maintBoutique : T.maint;
    document.getElementById('sim-maint-t').textContent = bq ? 'Boutique suivie, 2 h de modifs par mois, ' + pm + ' €/mois' : 'Site suivi et 1 h de modifs par mois, ' + pm + ' €/mois';
    var g = coche('sim-google'), dom = coche('sim-dom'), maint = coche('sim-maint');
    var gal = !bq && coche('sim-gal'), blog = coche('sim-blog'), resa = coche('sim-resa'), espace = coche('sim-espace'), mesure = coche('sim-mesure');
    var three = sim.querySelector('[name=sim-pay]:checked').value === '3';
    // prestations chiffrées (les éléments « sur devis » ne sont pas comptés)
    var P = [[bq ? 'Boutique en ligne · Premium Boutique (jusqu’à 20 produits)' : NOMS[type], 1, base]];
    if (lots) P.push(['Produits supplémentaires (lot de 20)', lots, T.lotProduits]);
    if (promo) P.push(['Codes promo et livraison offerte', 1, T.promo]);
    if (nbPages) P.push(['Page supplémentaire', nbPages, T.page]);
    if (gal) P.push(['Galerie photo', 1, T.galerie]);
    if (blog) P.push(['Blog ou actualités, modifiable par vous', 1, T.blog]);
    if (resa) P.push(['Réservation en ligne', 1, T.resa]);
    if (g) P.push(['Fiche Google Business', 1, T.google]);
    var sd = []; if (espace) sd.push('espace client'); if (mesure) sd.push('fonctionnalité sur mesure');
    // le site se paie en 2 ou 3 fois ; le domaine (1re année) et le 1er mois de maintenance à la mise en ligne
    var site = P.reduce(function(s, l){ return s + l[1] * l[2]; }, 0), enLigne = (dom ? T.domaine : 0) + (maint ? pm : 0), total = site + enLigne;
    var parts = three ? [['Au démarrage', .3], ['À la validation de la maquette', .4], ['À la mise en ligne', .3]] : [['Au démarrage', .5], ['À la mise en ligne', .5]];
    var extra = [dom ? 'domaine' : '', maint ? '1er mois de maintenance' : ''].filter(Boolean).join(' et ');
    document.getElementById('sim-recap').innerHTML = P.map(function(l){ return '<li><span>' + l[0] + (l[1] > 1 ? ' × ' + l[1] : '') + '</span><b>' + eur(l[1] * l[2]) + ' €</b></li>'; }).join('') +
      sd.map(function(x){ return '<li><span>' + x.charAt(0).toUpperCase() + x.slice(1) + '</span><b>sur devis</b></li>'; }).join('') +
      '<li><span>Formulaire de contact, version mobile, référencement de base</span><b>inclus</b></li>';
    document.getElementById('sim-sd').textContent = sd.length ? '+ ' + sd.join(' et ') + ' : chiffré sur devis' : '';
    document.getElementById('sim-steps').innerHTML = parts.map(function(p, i){
      var last = i === parts.length - 1, m = site * p[1] + (last ? enLigne : 0);
      return '<li><span>' + p[0] + (last && extra ? '<small>dont ' + extra + '</small>' : '') + '</span><b>' + eur(m) + ' €</b></li>';
    }).join('');
    var rec = [];
    if (maint) rec.push(pm + ' € par mois (6 mois minimum)');
    if (dom) rec.push('environ ' + T.domaine + ' € par an pour le domaine');
    document.getElementById('sim-rec').textContent = (rec.length ? 'Ensuite : ' + rec.join(' et ') + '.' : 'Rien à payer ensuite.') + (bq ? ' Sur chaque vente, seuls les frais du service de paiement s’appliquent (environ 1,5 % + 0,25 € par carte européenne).' : '');
    tween(total);
    var lignes = P.map(function(l){ return { des: l[0], qte: l[1], pu: l[2] }; });
    sd.forEach(function(x){ lignes.push({ des: x.charAt(0).toUpperCase() + x.slice(1) + ' (sur devis)', qte: 1, pu: 0 }); });
    if (dom) lignes.push({ des: 'Nom de domaine (1re année)', qte: 1, pu: T.domaine });
    if (maint) lignes.push({ des: 'Maintenance' + (bq ? ' boutique' : '') + ', 1er mois (' + pm + ' €/mois, 6 mois minimum)', qte: 1, pu: pm });
    var opts = [];
    if (lots) opts.push(nbProd + ' produits'); if (promo) opts.push('codes promo'); if (nbPages) opts.push(nbPages + ' page(s) en plus');
    if (gal) opts.push('galerie'); if (blog) opts.push('blog'); if (resa) opts.push('réservation'); sd.forEach(function(x){ opts.push(x + ' (sur devis)'); });
    if (g) opts.push('fiche Google'); if (dom) opts.push('nom de domaine'); if (maint) opts.push('maintenance');
    return { type: type, total: total, three: three, opts: opts, sd: sd, lignes: lignes };
  }
  sim.addEventListener('change', simCalc); simCalc();
  document.addEventListener('sm-tarifs', simCalc);
  document.getElementById('sim-go').addEventListener('click', function(){
    var r = simCalc();
    // le détail part avec la demande : mail et admin affichent les mêmes lignes et le même total
    var detail = { formule: NOMS[r.type], lignes: r.lignes, total: r.total, opts: r.opts };
    var texte = 'Estimation du simulateur : ' + eur(r.total) + ' €' + (r.sd.length ? ' + ' + r.sd.join(' et ') + ' sur devis' : '') + ', paiement en ' + (r.three ? '3' : '2') + ' fois' + (r.opts.length ? ', avec ' + r.opts.join(', ') : '') + '.';
    window.versContact(texte, NOMS[r.type], detail);
  });
  }
})();
