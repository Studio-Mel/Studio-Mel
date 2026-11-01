/* =========================================================
   Studio Mel · relais Cloudflare « Audit automatique avec IA »
   GET ?url=https://site-a-analyser.fr
   1. Google PageSpeed (version téléphone) : vitesse, SEO, accessibilité, bonnes pratiques
   2. Lecture de la page d'accueil : titre, description, H1, images sans texte alternatif…
   3. Workers AI rédige un résumé en français simple (repli automatique si l'IA ne répond pas)
   Résultat mis en cache 6 h par adresse, pour économiser les quotas gratuits.
   ========================================================= */

const ORIGINES = ['https://studiomel.eu', 'https://www.studiomel.eu', 'https://studio-mel.github.io', 'http://localhost:8000'];
const MODELE = '@cf/meta/llama-3.1-8b-instruct';

export default {
  async fetch(req, env, ctx) {
    const origine = req.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGINES.includes(origine) ? origine : ORIGINES[0],
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Vary': 'Origin'
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', ...extra } });
    if (req.method !== 'GET') return json({ erreur: 'Méthode non autorisée.' }, 405);

    const cible = verifierUrl(new URL(req.url).searchParams.get('url'));
    if (!cible) return json({ erreur: 'Adresse invalide. Indiquez par exemple www.monsite.fr' }, 400);

    // cache : une même adresse n'est analysée qu'une fois toutes les 6 heures
    const cache = caches.default, cle = new Request('https://cache.studiomel/audit-ia?u=' + encodeURIComponent(cible));
    const enCache = await cache.match(cle);
    if (enCache) { const r = new Response(enCache.body, enCache); Object.entries(cors).forEach(([k, v]) => r.headers.set(k, v)); return r; }

    const [psi, page] = await Promise.all([pagespeed(cible, env), lirePage(cible)]);
    if (!psi && !page) return json({ erreur: 'Impossible de charger ce site. Vérifiez l’adresse, ou il bloque peut-être les robots.' }, 502);

    const controles = [...(page ? page.controles : []), ...(psi ? psi.controles : [])];
    const scores = psi ? psi.scores : {};
    let synthese = null, ia = false;
    if (env.AI) {
      try { synthese = await resumerIA(env, cible, scores, controles); ia = !!synthese; } catch (e) { synthese = null; }
    }
    if (!synthese) synthese = resumeSimple(scores, controles);

    const resultat = { url: page ? page.urlFinale : cible, date: new Date().toISOString(), scores, controles, synthese, ia };
    const rep = json(resultat, 200, { 'Cache-Control': 'public, max-age=21600' });
    ctx.waitUntil(cache.put(cle, rep.clone()));
    return rep;
  }
};

// ---------- sécurité : pas d'adresses internes ----------
function verifierUrl(v) {
  if (!v) return null;
  v = v.trim(); if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  let u; try { u = new URL(v); } catch (e) { return null; }
  const h = u.hostname.toLowerCase();
  if (!/^https?:$/.test(u.protocol) || !h.includes('.') || /^(localhost|.*\.local|.*\.internal|.*\.lan)$/.test(h) || /^[\d.]+$/.test(h) || h.includes(':')) return null;
  u.hash = ''; return u.href;
}

// ---------- 1. Google PageSpeed ----------
async function pagespeed(url, env) {
  const api = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=' + encodeURIComponent(url) + '&strategy=mobile&locale=fr' +
    ['performance', 'seo', 'accessibility', 'best-practices'].map(c => '&category=' + c).join('') + (env.PSI_KEY ? '&key=' + env.PSI_KEY : '');
  try {
    const r = await fetch(api, { signal: AbortSignal.timeout(55000) });
    if (!r.ok) return null;
    const j = await r.json(), C = j.lighthouseResult.categories, A = j.lighthouseResult.audits;
    const sc = k => C[k] && C[k].score != null ? Math.round(C[k].score * 100) : null;
    const scores = { performance: sc('performance'), seo: sc('seo'), accessibilite: sc('accessibility'), bonnesPratiques: sc('best-practices') };
    const controles = [];
    const lcp = A['largest-contentful-paint'];
    if (lcp && lcp.displayValue) controles.push({ titre: 'Temps d’affichage du contenu principal : ' + lcp.displayValue, etat: lcp.score >= .9 ? 'ok' : lcp.score >= .5 ? 'warn' : 'ko', detail: 'Mesuré sur un téléphone simulé. Au-delà de 2,5 s, des visiteurs partent.' });
    Object.values(A).filter(a => a.details && a.details.type === 'opportunity' && a.score != null && a.score < .9 && (a.details.overallSavingsMs || 0) > 300)
      .sort((a, b) => b.details.overallSavingsMs - a.details.overallSavingsMs).slice(0, 3)
      .forEach(a => controles.push({ titre: a.title, etat: a.score < .5 ? 'ko' : 'warn', detail: 'Gain possible : environ ' + (Math.round(a.details.overallSavingsMs / 100) / 10).toLocaleString('fr-FR') + ' s' }));
    return { scores, controles };
  } catch (e) { return null; }
}

// ---------- 2. lecture de la page d'accueil ----------
async function lirePage(url) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StudioMelAudit/1.0; +https://studiomel.eu)' } });
    if (!r.ok || !(r.headers.get('content-type') || '').includes('html')) return null;
    let h = await r.text(); h = h.slice(0, 1500000);
    const un = (re) => { const m = h.match(re); return m ? m[1].replace(/\s+/g, ' ').trim() : ''; };
    const nb = (re) => (h.match(re) || []).length;
    const titre = un(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const desc = un(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) || un(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const h1 = nb(/<h1[\s>]/gi), imgs = h.match(/<img\b[^>]*>/gi) || [], sansAlt = imgs.filter(i => !/\balt\s*=/i.test(i)).length;
    const c = [];
    const add = (titre, etat, detail) => c.push({ titre, etat, detail });
    add(r.url.startsWith('https://') ? 'Le site est sécurisé (HTTPS)' : 'Le site n’est pas sécurisé (pas de HTTPS)', r.url.startsWith('https://') ? 'ok' : 'ko', r.url.startsWith('https://') ? '' : 'Les navigateurs affichent « Non sécurisé », ce qui inquiète les visiteurs.');
    if (!titre) add('Pas de titre de page', 'ko', 'C’est le texte bleu affiché par Google : il doit dire votre métier et votre ville.');
    else add('Titre de page : « ' + titre.slice(0, 70) + (titre.length > 70 ? '…' : '') + ' »', titre.length < 20 || titre.length > 65 ? 'warn' : 'ok', titre.length < 20 ? 'Un peu court : ajoutez votre métier et votre ville.' : titre.length > 65 ? 'Un peu long : Google risque de le couper.' : '');
    if (!desc) add('Pas de description pour Google', 'warn', 'Sans elle, Google choisit lui-même un extrait de la page.');
    else add('Description pour Google présente', desc.length < 70 || desc.length > 170 ? 'warn' : 'ok', desc.length < 70 ? 'Elle pourrait être plus complète.' : desc.length > 170 ? 'Elle sera coupée dans les résultats.' : '');
    add(h1 === 1 ? 'Un titre principal (H1) bien défini' : h1 === 0 ? 'Pas de titre principal (H1)' : h1 + ' titres principaux (H1)', h1 === 1 ? 'ok' : 'warn', h1 === 1 ? '' : 'Google comprend mieux une page qui a un seul titre principal.');
    add(/<meta[^>]+name=["']viewport["']/i.test(h) ? 'Prévu pour les téléphones' : 'Pas prévu pour les téléphones', /<meta[^>]+name=["']viewport["']/i.test(h) ? 'ok' : 'ko', '');
    if (imgs.length) add(sansAlt ? sansAlt + ' image(s) sur ' + imgs.length + ' sans description' : 'Toutes les images ont une description', sansAlt ? 'warn' : 'ok', sansAlt ? 'Le texte alternatif aide Google et les personnes malvoyantes.' : '');
    add(/property=["']og:image["']/i.test(h) ? 'Aperçu prévu pour les réseaux sociaux' : 'Pas d’aperçu pour les réseaux sociaux', /property=["']og:image["']/i.test(h) ? 'ok' : 'warn', /property=["']og:image["']/i.test(h) ? '' : 'Un lien partagé sur Facebook ou WhatsApp s’affichera sans image.');
    add(/href=["']tel:/i.test(h) ? 'Numéro de téléphone cliquable' : 'Pas de numéro cliquable', /href=["']tel:/i.test(h) ? 'ok' : 'warn', /href=["']tel:/i.test(h) ? '' : 'Sur téléphone, vos clients doivent pouvoir vous appeler en un geste.');
    if (/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(h)) add('La page demande à Google de ne pas l’afficher', 'ko', 'Balise « noindex » : le site ne peut pas apparaître dans les recherches.');
    return { urlFinale: r.url, controles: c };
  } catch (e) { return null; }
}

// ---------- 3. résumé par l'IA ----------
async function resumerIA(env, url, scores, controles) {
  const donnees = JSON.stringify({ site: url, scores, controles: controles.map(c => ({ c: c.titre, etat: c.etat })) });
  const r = await env.AI.run(MODELE, {
    max_tokens: 450, temperature: 0.3,
    messages: [
      { role: 'system', content: 'Tu es un conseiller web qui s’adresse à un artisan ou un petit commerçant français qui n’y connaît rien en informatique. Tu réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : {"resume":"2 à 3 phrases simples sur l’état du site","priorites":["action 1","action 2","action 3"]}. Pas de jargon, pas de chiffres inventés : appuie-toi uniquement sur les données fournies. Vouvoie le lecteur.' },
      { role: 'user', content: 'Données de l’analyse : ' + donnees }
    ]
  });
  const txt = (r && (r.response || r.result || '')).toString();
  const m = txt.match(/\{[\s\S]*\}/); if (!m) return null;
  const o = JSON.parse(m[0]);
  if (typeof o.resume !== 'string' || !Array.isArray(o.priorites)) return null;
  return { resume: o.resume.slice(0, 600), priorites: o.priorites.filter(p => typeof p === 'string').slice(0, 3).map(p => p.slice(0, 200)) };
}

// repli sans IA : un résumé construit à partir des mesures
function resumeSimple(scores, controles) {
  const ko = controles.filter(c => c.etat === 'ko'), warn = controles.filter(c => c.etat === 'warn');
  const p = scores.performance;
  const resume = (p == null ? 'La vitesse n’a pas pu être mesurée. ' : p >= 90 ? 'Votre site est rapide sur téléphone. ' : p >= 50 ? 'Votre site est un peu lent sur téléphone. ' : 'Votre site est lent sur téléphone, ce qui fait partir des visiteurs. ') +
    (ko.length ? ko.length + ' problème(s) important(s) ont été trouvés.' : warn.length ? 'Pas de problème grave, mais quelques points peuvent être améliorés.' : 'Les bases sont en place.');
  return { resume, priorites: [...ko, ...warn].slice(0, 3).map(c => c.titre) };
}
