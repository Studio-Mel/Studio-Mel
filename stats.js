/* Studio Mel · mesure d'audience maison, anonyme et sans cookie.
   Une ligne par page vue dans Firestore (collection « visites ») : la page, le jour, la provenance
   et le type d'appareil. Aucune adresse IP, aucun identifiant, rien qui permette de reconnaître quelqu'un. */
(function(){
  try {
    if (!/(^|\.)studiomel\.eu$/.test(location.hostname)) return;            // uniquement le vrai site
    if (localStorage.getItem('sm-moi')) return;                                // tes propres visites
    if (navigator.webdriver || /bot|crawl|spider|slurp|lighthouse|headless|preview/i.test(navigator.userAgent)) return;
    var p = function(n){ return (n < 10 ? '0' : '') + n; }, d = new Date();
    var page = (location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/').slice(0, 120);
    var ref = 'direct', r = document.referrer;
    if (r) { try { var h = new URL(r).hostname.replace(/^www\./, ''); ref = h === location.hostname.replace(/^www\./, '') ? 'interne' : h; } catch (e) {} }
    var w = Math.min(screen.width || innerWidth, innerWidth), app = w < 700 ? 'mobile' : w < 1100 ? 'tablette' : 'ordi';
    var sess = !sessionStorage.getItem('sm-s'); sessionStorage.setItem('sm-s', '1');
    var corps = JSON.stringify({ fields: {
      page: { stringValue: page }, ref: { stringValue: ref.slice(0, 100) }, app: { stringValue: app },
      jour: { stringValue: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) }, sess: { booleanValue: sess } } });
    var envoyer = function(){
      fetch('https://firestore.googleapis.com/v1/projects/studio-mel-2f2cc/databases/(default)/documents/visites?key=AIzaSyA42dvTyNYoQCliUXqF3ie_5SxWI95xxoY',
        { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: corps }).catch(function(){});
    };
    // envoyé une fois la page affichée, pour ne jamais la ralentir
    if ('requestIdleCallback' in window) requestIdleCallback(envoyer, { timeout: 4000 }); else setTimeout(envoyer, 1500);
  } catch (e) {}
})();
