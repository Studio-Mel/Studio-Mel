# -*- coding: utf-8 -*-
"""
Studio Mel · générateur des pages du site (V2)

Toutes les pages partagent le même en-tête et le même pied de page : on les écrit ici
une seule fois, puis ce script produit les fichiers .html statiques.
GitHub Pages ignore ce dossier (_build), il ne sert qu'à régénérer le site.

Usage : python3 _build/build.py   (depuis la racine du site)
"""
import json, os, html

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://studiomel.eu"
DATE = "2026-11-01"
TEL, TEL_INTL, MAIL = "06 04 15 98 58", "+33604159858", "studio-mel@outlook.fr"
V = "2"  # version des fichiers CSS/JS (à augmenter pour forcer le rechargement)

def esc(s): return html.escape(s, quote=True)

ARW = '<svg class="arw" viewBox="0 0 12 10" fill="none" aria-hidden="true"><path d="M0.8 5h10M7.1 1.4 10.9 5l-3.8 3.6" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"/></svg>'
MARK = '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2F5BFF"/><path d="M17 45V21.5L32 36l15-14.5V38" fill="none" stroke="#fff" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47" cy="46" r="3.6" fill="#B4C6FF"/></svg>'

NAV = [("/", "Accueil"), ("/realisations/", "Réalisations"), ("/a-propos/", "À propos")]

ORG = {
  "@context": "https://schema.org", "@type": "ProfessionalService", "@id": SITE + "/#studio",
  "name": "Studio Mel", "url": SITE + "/", "logo": SITE + "/assets/img/logo-mark.svg", "image": SITE + "/og-image.jpg",
  "email": MAIL, "telephone": TEL_INTL, "founder": {"@type": "Person", "name": "Melvyn Clouzet"},
  "description": "Création, refonte et suivi de sites internet pour les artisans et petites entreprises de la région lyonnaise.",
  "priceRange": "500 € - 1 900 €",
  "knowsAbout": ["Création de site internet", "Création de site web pour artisans", "Refonte de site internet", "Création de boutique en ligne", "Référencement local", "Maintenance de site internet"],
  "areaServed": [{"@type": "City", "name": n} for n in ["Tarare", "L’Arbresle", "Sain-Bel", "Lyon"]] + [{"@type": "AdministrativeArea", "name": "Rhône"}],
  "makesOffer": [
    {"@type": "Offer", "name": "Refonte de site internet", "price": "500", "priceCurrency": "EUR"},
    {"@type": "Offer", "name": "Création de site vitrine", "price": "750", "priceCurrency": "EUR"},
    {"@type": "Offer", "name": "Site Premium vitrine", "price": "1200", "priceCurrency": "EUR"},
    {"@type": "Offer", "name": "Boutique en ligne", "priceSpecification": {"@type": "PriceSpecification", "minPrice": "1900", "priceCurrency": "EUR"}},
    {"@type": "Offer", "name": "Maintenance de site", "priceSpecification": {"@type": "UnitPriceSpecification", "price": "40", "priceCurrency": "EUR", "unitText": "MONTH"}},
    {"@type": "Offer", "name": "Fiche Google Business", "price": "80", "priceCurrency": "EUR"}
  ]
}

def ld(obj): return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + '</script>'

def crumbs_ld(items):
    return ld({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (u, n) in enumerate(items)]})

def head(title, desc, path, extra="", og_type="website", preload_display=True):
    url = SITE + path
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Studio Mel">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{SITE}/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Studio Mel, création de sites internet pour artisans et petites entreprises">
<meta name="twitter:card" content="summary_large_image">
<!-- Google Search Console : colle ici la balise de validation que Google te donne -->
<link rel="preload" href="/assets/fonts/bricolage-grotesque.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/plus-jakarta-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/components.css?v={V}">
<link rel="stylesheet" href="/assets/css/site.css?v={V}">
<script>document.documentElement.classList.add('js')</script>
{extra}</head>
"""

def header(active):
    links = "".join(f'<li><a href="{u}"{" aria-current=\"page\"" if u == active else ""}>{n}</a></li>' for u, n in NAV)
    mlinks = "".join(f'<li><a href="{u}"{" aria-current=\"page\"" if u == active else ""}>{n}</a></li>' for u, n in NAV + [("/contact/", "Contact")])
    return f"""<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="nav">
  <div class="wrap nav-in">
    <a class="brand" href="/" aria-label="Studio Mel, accueil">{MARK}<span>Studio <em>Mel</em></span></a>
    <ul class="nav-links">{links}</ul>
    <a class="btn btn-sm btn-primary nav-cta" href="/contact/">Parlons de votre projet</a>
    <button class="burger" id="burger" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu"><span></span></button>
  </div>
</header>
<nav class="menu" id="menu" aria-label="Menu">
  <ul>{mlinks}</ul>
  <a class="btn btn-lg btn-primary" href="/contact/">Parlons de votre projet {ARW}</a>
</nav>
<main id="contenu">
"""

def footer(scripts="", assistant=True):
    asst = """
<button class="as-fab" id="as-fab" aria-expanded="false" aria-controls="as-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg><span>Une question ?</span></button>
<div class="as-box" id="as-box" role="dialog" aria-label="Assistant Studio Mel" hidden>
  <div class="as-h"><div class="as-av" aria-hidden="true">M</div><div><b>Assistant Studio Mel</b><small>Réponses tirées du site · pas d’IA</small></div><button class="as-x" id="as-x" aria-label="Fermer l’assistant">×</button></div>
  <div class="as-log" id="as-log" aria-live="polite"></div>
  <div class="as-ch" id="as-ch"></div>
</div>""" if assistant else ""
    return f"""</main>
<footer class="foot">
  <div class="wrap">
    <div class="foot-grid">
      <div class="foot-about">
        <a class="brand" href="/" aria-label="Studio Mel, accueil">{MARK}<span>Studio <em>Mel</em></span></a>
        <p>Je crée et je fais évoluer les sites internet des artisans, indépendants et petites entreprises, autour de Tarare, L’Arbresle, Sain-Bel et Lyon.</p>
      </div>
      <div>
        <h2>Contact</h2>
        <ul>
          <li><a href="tel:{TEL_INTL}">{TEL}</a></li>
          <li><a href="mailto:{MAIL}">{MAIL}</a></li>
          <li><a href="/contact/#rdv">Réserver un appel</a></li>
          <li>Région lyonnaise (Rhône)</li>
        </ul>
      </div>
      <div>
        <h2>Le site</h2>
        <ul>
          <li><a href="/realisations/">Réalisations</a></li>
          <li><a href="/#formules">Formules et tarifs</a></li>
          <li><a href="/#accompagnement">Accompagnement</a></li>
          <li><a href="/a-propos/">À propos</a></li>
          <li><a href="/outils/">Audit et outils gratuits</a></li>
          <li><a href="/journal/">Le Journal</a></li>
        </ul>
      </div>
      <div>
        <h2>Informations</h2>
        <ul>
          <li><a href="/mentions-legales/">Mentions légales</a></li>
          <li><a href="/confidentialite/">Confidentialité et cookies</a></li>
          <li><a href="/contact/#faq">Questions fréquentes</a></li>
        </ul>
      </div>
    </div>
    <div class="foot-legal">
      <span>© <span data-year>2026</span> Studio Mel · Melvyn Clouzet · Activité en cours d’immatriculation</span>
      <span>Aucun cookie, aucun traceur</span>
    </div>
  </div>
</footer>
<div class="fab" id="fab" hidden><a id="fab-tel" href="tel:{TEL_INTL}"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>Appeler</a></div>{asst}
<script src="/assets/js/config.js?v={V}" defer></script>
<script src="/assets/js/site.js?v={V}" defer></script>
{scripts}{'<script src="/assets/js/assistant.js?v=' + V + '" defer></script>' if assistant else ''}
</body>
</html>
"""

def page_head_block(h1, lede, crumbs):
    c = "".join(f'<li><a href="{u}">{n}</a></li>' for u, n in crumbs[:-1]) + f'<li aria-current="page">{crumbs[-1][1]}</li>'
    return f"""<section class="page-head"><div class="wrap">
  <ol class="crumbs" aria-label="Fil d’Ariane">{c}</ol>
  <h1 data-reveal>{h1}</h1>
  <p class="lede" data-reveal style="--d:1">{lede}</p>
</div></section>
"""

def write(path, content):
    full = os.path.join(ROOT, path.lstrip("/"))
    if path.endswith("/"): full = os.path.join(full, "index.html")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(content)

# ============================================================
# RÉALISATIONS : pour ajouter un projet, copie un bloc.
# statut : 'livre' (en ligne), 'encours', 'proposition' ou 'concept'
# apercu : demo (maquette intégrée, voir _build/maquettes.html) ou site (adresse en ligne)
# ============================================================
REALISATIONS = [
  dict(id="anyae", site="https://studio-mel.github.io/Anyae/", adresse="studio-mel.github.io/Anyae", statut="encours", cats=["boutique", "commerce"], une=True,
       nom="ANYAE", metier="Bougies personnalisées et bijoux artisanaux", secteur="Créatrice artisanale · boutique en ligne",
       entreprise="Une créatrice qui fabrique à la main des bougies personnalisées et des bijoux, et qui voulait une vraie boutique à son image.",
       besoin="Vendre ses créations en ligne avec un site haut de gamme, à la hauteur du soin apporté à chaque pièce.",
       solution="Une boutique sur mesure qui présente bougies et bijoux comme en magasin, et se commande simplement depuis un téléphone.",
       objectifs=["Créer un univers de marque élégant", "Présenter les bougies et les bijoux comme en boutique", "Permettre de commander en ligne simplement"],
       solutions=["Boutique pensée d’abord pour le téléphone", "Catalogue avec fiches produits soignées", "Mise en avant de la personnalisation", "Espace de gestion pour la créatrice"],
       url="https://studio-mel.github.io/Anyae/"),
  dict(id="fabien-dupuis", demo="dupuis", adresse="sasfabiendupuis.fr", statut="proposition", cats=["vitrine", "artisan"], une=True,
       nom="Fabien Dupuis", metier="Plâtrier peintre à Villechenève", secteur="Artisan du bâtiment · refonte de site",
       entreprise="Une entreprise de plâtrerie et peinture qui coordonne tous les corps de métier, pour les particuliers comme pour les professionnels.",
       besoin="Un site existant peu moderne et mal organisé, qui ne mettait pas en valeur le savoir-faire de l’équipe.",
       solution="Une refonte qui met les chantiers et l’équipe au premier plan, avec la demande de devis toujours à portée de main.",
       objectifs=["Présenter clairement les services", "Montrer l’équipe et les chantiers", "Rendre la demande de devis évidente"],
       solutions=["Photo de chantier et téléphone visibles dès l’accueil", "Chiffres clés et certification RGE en avant", "Galerie de chantiers récents", "Étapes d’un chantier expliquées simplement"], url=""),
  dict(id="dorne-jardins", demo="jardin", adresse="dornejardins.fr", statut="concept", cats=["vitrine", "artisan"], une=True,
       nom="Dorne Jardins", metier="Paysagiste à Sain-Bel", secteur="Paysagiste · maquette de site vitrine",
       entreprise="Un paysagiste des Monts du Lyonnais : création, entretien, taille et élagage.",
       besoin="", solution="Une maquette de site vitrine pour montrer les jardins réalisés et recevoir des demandes de devis.",
       objectifs=["Montrer les jardins réalisés", "Recevoir des demandes de devis"],
       solutions=["Présentation claire des services", "Galerie de réalisations", "Demande de devis sur chaque page"], url=""),
  dict(id="maison-ombelle", demo="resto", adresse="concept · restaurant", statut="concept", cats=["vitrine", "restauration"],
       nom="Maison Ombelle", metier="Concept fictif · restaurant", secteur="Concept fictif · restaurant",
       entreprise="Un bistrot imaginaire, pour montrer ce que pourrait être le site d’un restaurant.", besoin="", solution="",
       objectifs=["Donner envie dès la première image", "Remplir les tables en semaine", "Mettre la carte à jour facilement"],
       solutions=["Ambiance sombre et chaleureuse", "Bouton de réservation toujours visible", "Carte et formules en un coup d’œil"], url=""),
  dict(id="studio-lignes", demo="coiffure", adresse="concept · salon de coiffure", statut="concept", cats=["vitrine", "beaute"],
       nom="Studio Lignes", metier="Concept fictif · salon de coiffure", secteur="Concept fictif · salon de coiffure",
       entreprise="Un salon imaginaire, pour montrer un site de coiffure moderne avec prise de rendez-vous.", besoin="", solution="",
       objectifs=["Afficher un style affirmé", "Faire réserver en ligne, même le soir", "Présenter les prestations clairement"],
       solutions=["Design minimaliste noir et rose poudré", "Rendez-vous en ligne en deux clics", "Prestations détaillées par catégorie"], url=""),
  dict(id="fournil-des-coteaux", demo="fournil", adresse="concept · boulangerie", statut="concept", cats=["vitrine", "commerce"],
       nom="Le Fournil des Coteaux", metier="Concept fictif · boulangerie", secteur="Concept fictif · boulangerie",
       entreprise="Une boulangerie imaginaire, pour montrer un site de commerce de proximité.", besoin="", solution="",
       objectifs=["Mettre en valeur le fait maison", "Prendre les commandes la veille", "Afficher les horaires partout"],
       solutions=["Identité chaleureuse et typographie affirmée", "Commande en ligne avec heure de retrait", "Horaires et produits du jour en avant"], url=""),
]
STATUTS = {"livre": ("Site livré", "real"), "encours": ("Boutique en ligne · en création", "cours"), "proposition": ("Proposition de refonte", "prop"), "concept": ("Concept", "concept")}
TEMPLATES = open(os.path.join(ROOT, "_build", "maquettes.html"), encoding="utf-8").read()

def apercu(r, lazy=True):
    data = f'data-nom="{esc(r["nom"])}" data-adresse="{esc(r["adresse"])}"'
    chrome = f'<div class="chrome" aria-hidden="true"><i></i><i></i><i></i><span>{esc(r["adresse"])}</span></div>'
    if r.get("site"):
        return (f'<button class="shot live web" data-site="{r["site"]}" {data} aria-label="Ouvrir l’aperçu du site {esc(r["nom"])}">{chrome}'
                f'<div class="vp"><div class="ds-scaler web-sc"><iframe src="{r["site"]}" title="Aperçu du site {esc(r["nom"])}" loading="lazy" tabindex="-1" scrolling="no"></iframe></div></div></button>')
    return (f'<button class="shot live" data-demo="{r["demo"]}" {data} aria-label="Ouvrir la maquette {esc(r["nom"])} en grand">{chrome}'
            f'<div class="vp"><div class="ds-scaler"></div></div></button>')

def tag(r):
    t = STATUTS[r["statut"]]; return f'<span class="tag {t[1]}">{t[0]}</span>'

def lis(a): return "".join(f"<li>{esc(x)}</li>" for x in a)

def story(r, i):
    besoin = (f'<div class="story-block"><h4>Le besoin</h4><p>{esc(r["besoin"])}</p></div>' if r["besoin"]
              else f'<div class="story-block"><h4>Les objectifs</h4><p>{esc(", ".join(r["objectifs"]))}.</p></div>')
    titre_sol = "Ce que j’ai mis en place" if r["statut"] == "livre" else "Ce que je mets en place" if r["statut"] == "encours" else "Ce que je propose"
    act = f'<a class="btn btn-sm btn-ghost" href="/realisations/#{r["id"]}">Voir le projet en détail</a>'
    if r["url"]: act = f'<a class="btn btn-sm btn-primary" href="{r["url"]}" target="_blank" rel="noopener">Voir la boutique</a>' + act
    return f"""<article class="story">
  <div class="story-visual" data-reveal>{apercu(r)}</div>
  <div class="story-txt" data-reveal>
    {tag(r)}
    <h3>{esc(r["nom"])}</h3>
    <p class="story-sector">{esc(r["secteur"])}</p>
    {besoin}
    <div class="story-block"><h4>{titre_sol}</h4><p>{esc(r["solution"])}</p></div>
    <div class="story-block"><h4>Fonctionnalités</h4><ul class="chips">{lis(r["solutions"])}</ul></div>
    <div class="story-act">{act}</div>
  </div>
</article>"""

def case(r):
    titre_sol = "Ce que j’ai mis en place" if r["statut"] == "livre" else "Ce que je mets en place" if r["statut"] == "encours" else "Ce que je propose"
    lien = f'<a class="btn btn-sm btn-primary" href="{r["url"]}" target="_blank" rel="noopener">{"Voir le site en ligne" if r["statut"] == "livre" else "Voir la boutique"}</a>' if r["url"] else ""
    return f"""<article class="case glass" id="{r["id"]}" data-cats="{" ".join(r["cats"])} {r["statut"]}" data-reveal>
  {apercu(r)}
  <div class="case-txt">{tag(r)}<h2 class="h3">{esc(r["nom"])}</h2><p class="case-m">{esc(r["metier"])}</p>
    <p>{esc(r["entreprise"])}</p>
    {f'<h3 class="h4">Le besoin</h3><p>{esc(r["besoin"])}</p>' if r["besoin"] else ''}
    <h3 class="h4">Les objectifs</h3><ul>{lis(r["objectifs"])}</ul>
    <h3 class="h4">{titre_sol}</h3><ul>{lis(r["solutions"])}</ul>
    {lien}
  </div>
</article>"""

MODALE = """<div class="dm" id="dm" hidden role="dialog" aria-modal="true" aria-labelledby="dm-title">
  <div class="dm-top"><strong id="dm-title"></strong>
    <div class="dm-sw" role="group" aria-label="Affichage"><button class="on" data-w="pc" aria-pressed="true">Ordinateur</button><button data-w="mob" aria-pressed="false">Téléphone</button></div>
    <button class="dm-x" aria-label="Fermer l’aperçu">×</button></div>
  <div class="dm-frame"><div class="chrome" aria-hidden="true"><i></i><i></i><i></i><span id="dm-url"></span></div><div class="dm-view" tabindex="0"></div></div>
</div>
"""

def templates_for(ids):
    out = []
    for k in ids:
        a = TEMPLATES.index(f'<template id="tpl-{k}">'); b = TEMPLATES.index("</template>", a) + len("</template>")
        out.append(TEMPLATES[a:b])
    return "\n".join(out)

# ============================================================
# ACCUEIL
# ============================================================
def formule_card(i, nom, badge, pour, prix, items, btn, formule, extra_top="", extra_bottom="", panes=None):
    if panes:
        body_list = panes
    else:
        body_list = f"<ul>{lis(items)}</ul>"
    return f"""<article class="fcard" data-reveal style="--d:{i}">
  <button class="fcard-head" type="button" aria-expanded="false" aria-controls="fc-{i}">
    <span class="fcard-name">{nom}{f'<span class="fcard-badge">{badge}</span>' if badge else ''}</span>
    <span class="fcard-for">{pour}</span>
    <span class="fcard-price">{prix}</span>
    <span class="fcard-hint">Voir le détail</span>
  </button>
  <div class="fcard-body" id="fc-{i}"><div><div class="fcard-inner">
    {extra_top}{body_list}{extra_bottom}
    <a class="btn btn-lg btn-primary" href="/contact/?formule={formule.replace(' ', '%20')}#formulaire">{btn}</a>
  </div></div></div>
</article>"""

SIM = open(os.path.join(ROOT, "_build", "simulateur.html"), encoding="utf-8").read()

def build_home():
    une = [r for r in REALISATIONS if r.get("une")]
    stories = "\n".join(story(r, i) for i, r in enumerate(une))
    premium_panes = (
        '<div data-pane="vitrine"><ul>' + lis(["Jusqu’à 8 pages", "Tout ce qu’inclut la Création", "Animations sur mesure : 3D, transitions, défilement", "Un outil interactif : simulateur, carte, avant/après", "3 tours de retouches"]) + '</ul></div>'
        '<div data-pane="boutique" hidden><ul>' + lis(["Jusqu’à 20 produits mis en ligne", "Panier et paiement sécurisé : carte, Apple Pay, Google Pay", "Options produit : taille, couleur, personnalisation", "E-mail de confirmation à chaque commande", "Pages CGV, livraison et retours, rédigées à partir de vos informations", "Le design et les animations du Premium", "3 tours de retouches et prise en main expliquée"]) + '</ul>'
        '<p class="fcard-note">Pas d’abonnement à une plateforme : l’argent des ventes arrive directement sur votre compte.</p></div>')
    cards = "\n".join([
      formule_card(0, "Refonte", "", "Vous avez déjà un site, mais il ne vous ressemble plus.", "500 €",
        ["Jusqu’à 5 pages", "Nouveau design personnalisé, à partir de votre site actuel", "Adapté au mobile et à la tablette", "Formulaire de contact", "Référencement de base", "Mise en ligne et hébergement configurés", "2 tours de retouches"],
        "Choisir la refonte", "Refonte de site"),
      formule_card(1, "Création", "Le plus demandé", "Vous partez de zéro et voulez un site à votre image.", "750 €",
        ["Jusqu’à 5 pages, créées de zéro", "Design personnalisé à votre image", "Adapté au mobile et à la tablette", "Formulaire de contact", "Référencement de base", "Mise en ligne, domaine et hébergement configurés", "2 tours de retouches"],
        "Choisir la création", "Création de site vitrine"),
      formule_card(2, "Premium", "", "Vous voulez marquer les esprits, ou vendre en ligne.", "1 200 €", [],
        "Choisir le Premium vitrine", "Site Premium",
        extra_top='<div class="pm-sw" id="pm-sw" role="group" aria-label="Version du Premium"><button type="button" data-pm="vitrine" aria-pressed="true">Site vitrine</button><button type="button" data-pm="boutique" aria-pressed="false">Boutique en ligne</button></div>',
        panes=premium_panes),
    ])
    redirect = """<script>
/* anciennes adresses de la V1 (#formules, #contact…) : on redirige vers les nouvelles pages */
(function(){var h=location.hash.slice(1),q=location.search,M={contact:'/contact/',realisations:'/realisations/',apropos:'/a-propos/',journal:'/journal/',outils:'/outils/',lab:'/',methode:'/',faq:'/contact/#faq',mentions:'/mentions-legales/'};
if(/[?&]atelier=/.test(q)){location.replace('/outils/'+q+'#atelier');return;}
if(M[h]&&M[h]!=='/'){location.replace(M[h]);}else if(h==='lab'||h==='methode'){history.replaceState(null,'','/');}})();
</script>
"""
    body = f"""
<section class="hero" aria-labelledby="titre">
  <canvas id="globe" aria-hidden="true"></canvas>
  <div class="hero-in">
    <svg class="hero-mark" viewBox="0 0 64 64" role="img" aria-label="Studio Mel"><rect width="64" height="64" rx="16" fill="#2F5BFF"/><path class="m-stroke" pathLength="100" d="M17 45V21.5L32 36l15-14.5V38" fill="none" stroke="#fff" stroke-width="5.6" stroke-linecap="round" stroke-linejoin="round"/><circle class="m-dot" cx="47" cy="46" r="3.6" fill="#B4C6FF"/></svg>
    <h1 id="titre"><span class="l">Un site à la hauteur</span> <span class="l">de votre savoir-faire.</span></h1>
    <p class="sub">Création et suivi de sites internet pour artisans, près de Lyon.</p>
    <a class="btn btn-lg btn-primary" href="/contact/">Parlons de votre projet {ARW}</a>
    <p class="hero-note">Devis gratuit, réponse sous 48 h · <a href="/outils/">Faire auditer mon site</a></p>
  </div>
</section>

<section class="sec" id="realisations" aria-labelledby="t-real">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="t-real" data-reveal>Des projets où vous allez vous reconnaître</h2>
      <p class="lede" data-reveal style="--d:1">Un artisan du bâtiment, un paysagiste, une créatrice : pour chacun, je pars de son métier et de ses clients. Chaque projet indique honnêtement s’il est en ligne, en cours ou proposé.</p>
    </div>
    <div class="stories">
{stories}
    </div>
    <div class="more-link" data-reveal>
      <p>Restaurant, salon, boulangerie : d’autres maquettes vous attendent.</p>
      <a class="btn btn-sm btn-ghost" href="/realisations/">Toutes les réalisations {ARW}</a>
    </div>
  </div>
</section>

<section class="sec" id="formules" aria-labelledby="t-form">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="t-form" data-reveal>Des formules claires, des prix annoncés</h2>
      <p class="lede" data-reveal style="--d:1">Chaque formule comprend le design, la version mobile, le référencement de base et la mise en ligne. Touchez une formule pour voir ce qu’elle contient.</p>
    </div>
    <div class="formules" id="formules-grid" data-sel="1">
{cards}
    </div>
    <p class="price-notes"><span><b>Tarifs de lancement</b> réservés à mes premiers clients</span><span>Paiement en 2 ou 3 fois, sans frais</span><span>TVA non applicable, art. 293 B du CGI</span></p>
    <details class="sim-wrap" data-reveal>
      <summary><span>Estimer le prix avec vos options<small>Pages en plus, réservation, boutique, maintenance… le total se met à jour.</small></span></summary>
      {SIM}
    </details>
  </div>
</section>

<section class="sec" id="accompagnement" aria-labelledby="t-acc">
  <div class="wrap">
    <div class="sec-head">
      <h2 id="t-acc" data-reveal>Après la mise en ligne, je reste là</h2>
      <p class="lede" data-reveal style="--d:1">Un site vit : vos horaires changent, vos chantiers se multiplient, vos clients cherchent autrement. La mise en ligne n’est qu’une étape.</p>
    </div>
    <div class="track" id="track" data-reveal="fade">
      <div class="track-line" aria-hidden="true"><i></i></div>
      <ol>
        <li><b>On fait connaissance</b><span>On se voit ou on s’appelle, gratuitement.</span></li>
        <li><b>La maquette</b><span>Vous validez l’accueil avant tout le reste.</span></li>
        <li class="key"><b>Mise en ligne</b><span>Le site et le domaine sont à votre nom.</span></li>
        <li><b>Suivi</b><span>Le site reste à jour, sécurisé, en ligne.</span></li>
        <li><b>Évolutions</b><span>Il grandit avec votre activité.</span></li>
      </ol>
      <span class="track-after" aria-hidden="true">et la suite…</span>
    </div>
    <ul class="svc">
      <li data-reveal><h3>Maintenance</h3><p>Je surveille le site, je le garde sécurisé et à jour. Sans engagement au-delà de 6 mois.</p><strong>40 € / mois<small>70 € / mois pour une boutique</small></strong></li>
      <li data-reveal><h3>Mises à jour</h3><p>Horaires, photos, prix, textes : vous m’envoyez, je change. Jusqu’à 1 h par mois avec la maintenance (2 h pour une boutique).</p><strong>Inclus<small>sinon 30 € de l’heure</small></strong></li>
      <li data-reveal><h3>Référencement</h3><p>Chaque site est préparé pour Google : titres, descriptions, ville et métier bien indiqués. Pour apparaître sur Google Maps, je crée ou j’optimise votre fiche.</p><strong>80 €<small>fiche Google, une fois</small></strong></li>
      <li data-reveal><h3>Évolutions</h3><p>Une page en plus, un blog que vous alimentez, la réservation en ligne, un outil sur mesure : le site s’adapte à votre activité.</p><strong>dès 60 €<small>outil sur mesure sur devis</small></strong></li>
      <li data-reveal><h3>Conseils</h3><p>Un doute, une idée, un site qui ne rapporte rien ? On en parle 15 minutes, ou je regarde votre site actuel avec un <a href="/outils/">audit gratuit</a>.</p><strong>Gratuit<small>sans engagement</small></strong></li>
    </ul>
  </div>
</section>

<section class="final" aria-labelledby="t-fin">
  <div class="wrap" data-reveal>
    <h2 id="t-fin">Et si on donnait vie à votre projet ?</h2>
    <p>Devis gratuit et sans engagement, réponse sous 48 h.</p>
    <a class="btn btn-lg btn-primary" id="final-btn" href="/contact/">Parlons de votre projet {ARW}</a>
    <div class="final-alt"><a href="tel:{TEL_INTL}">{TEL}</a><a href="mailto:{MAIL}">{MAIL}</a><a href="/contact/#rdv">Réserver un appel de 15 min</a></div>
  </div>
</section>
{MODALE}{templates_for(["dupuis", "jardin"])}
"""
    website = {"@context": "https://schema.org", "@type": "WebSite", "name": "Studio Mel", "url": SITE + "/", "inLanguage": "fr-FR", "publisher": {"@id": SITE + "/#studio"}}
    out = head("Création de site internet pour artisans à Tarare, L’Arbresle et Lyon | Studio Mel",
               "Création, refonte et suivi de sites internet pour artisans et petites entreprises autour de Tarare, L’Arbresle, Sain-Bel et Lyon. Site vitrine dès 750 €, refonte dès 500 €. Devis gratuit sous 48 h.",
               "/", redirect + ld(ORG) + "\n" + ld(website) + "\n")
    out += header("/") + body + footer(
        f'<script src="/assets/js/realisations.js?v={V}" defer></script>\n<script src="/assets/js/home.js?v={V}" defer></script>\n<script src="/assets/js/globe.js?v={V}" defer></script>\n')
    write("/index.html", out)

# ============================================================
# PAGES INTÉRIEURES
# ============================================================
def cta_band(t="Un projet en tête ?", p="Devis gratuit et sans engagement, réponse sous 48 h."):
    return f'<div class="cta-band" data-reveal><div><h2>{t}</h2><p>{p}</p></div><a class="btn btn-lg btn-primary" href="/contact/">Parlons de votre projet {ARW}</a></div>'

def build_realisations():
    F = [("tous", "Tous"), ("vitrine", "Sites vitrines"), ("boutique", "Boutiques en ligne"), ("artisan", "Artisans"), ("commerce", "Commerces"), ("restauration", "Restauration"), ("beaute", "Beauté"), ("concept", "Concepts et propositions")]
    def n(k): return len(REALISATIONS) if k == "tous" else len([r for r in REALISATIONS if (k == "concept" and r["statut"] in ("concept", "proposition")) or k in r["cats"] or r["statut"] == k])
    rf = "".join(f'<button type="button" data-f="{k}" aria-pressed="{"true" if i == 0 else "false"}">{t}<span>{n(k)}</span></button>' for i, (k, t) in enumerate(F) if n(k))
    cases = "\n".join(case(r) for r in REALISATIONS)
    body = page_head_block("Réalisations", "Des sites conçus pour des artisans et commerçants de la région. Chaque fiche dit clairement s’il s’agit d’un site livré, d’un projet en cours, d’une proposition ou d’un concept. Touchez un aperçu pour le parcourir en version ordinateur ou téléphone.", [("/", "Accueil"), ("/realisations/", "Réalisations")])
    body += f"""<div class="page-body"><div class="wrap">
  <div>
    <div class="rf" id="rf" role="group" aria-label="Filtrer les réalisations" hidden>{rf}</div>
    <div class="cases" id="cases">
{cases}
    </div>
  </div>
  <div class="ba-wrap" id="ba-wrap" hidden>
    <h2 class="ba-title">Avant, après : le site de Fabien Dupuis</h2>
    <div class="ba" id="ba" style="--p:50%">
      <div class="ba-after"><div class="ds-scaler"></div></div>
      <div class="ba-before"><img loading="lazy" decoding="async" src="/img/avant-dupuis.jpg" alt="Ancien site de Fabien Dupuis" id="ba-img" onerror="this.remove()"></div>
      <span class="ba-lbl l">Avant</span><span class="ba-lbl r">Après</span>
      <div class="ba-line" aria-hidden="true"><i></i></div>
      <input type="range" min="0" max="100" value="50" aria-label="Comparer l’ancien et le nouveau site">
    </div>
  </div>
  {cta_band("Votre projet pourrait être le prochain", "Dites-moi ce que vous faites, je vous montre ce que votre site pourrait être.")}
</div></div>
{MODALE}{templates_for(["dupuis", "jardin", "resto", "coiffure", "fournil"])}
"""
    items = {"@context": "https://schema.org", "@type": "ItemList", "name": "Réalisations Studio Mel", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": r["nom"] + " · " + r["metier"], "url": SITE + "/realisations/#" + r["id"]} for i, r in enumerate(REALISATIONS)]}
    out = head("Réalisations : sites internet d’artisans et de commerçants | Studio Mel",
               "Sites vitrines, refontes et boutique en ligne pour des artisans et commerçants de la région lyonnaise : le besoin, la solution et les fonctionnalités de chaque projet.",
               "/realisations/", crumbs_ld([("/", "Accueil"), ("/realisations/", "Réalisations")]) + "\n" + ld(items) + "\n")
    out += header("/realisations/") + body + footer(f'<script src="/assets/js/realisations.js?v={V}" defer></script>\n')
    write("/realisations/", out)

def build_apropos():
    body = page_head_block("Un seul interlocuteur, du premier appel au suivi", "Je m’appelle Melvyn, et je crée des sites pour les entreprises d’ici.", [("/", "Accueil"), ("/a-propos/", "À propos")])
    body += f"""<div class="page-body"><div class="wrap">
  <div class="about" data-reveal>
    <!-- Photo : dépose un fichier melvyn.jpg dans le dossier img, elle s’affichera ici toute seule. -->
    <div class="avatar"><img loading="lazy" decoding="async" src="/img/melvyn.jpg" alt="Melvyn Clouzet" onerror="this.remove()"><span aria-hidden="true">MC</span></div>
    <div>
      <p>Je m’appelle <strong>Melvyn Clouzet</strong>. Je suis en BTS Comptabilité et Gestion en alternance, et je crée des sites internet pour les artisans et petites entreprises autour de Tarare, L’Arbresle, Sain-Bel et Lyon.</p>
      <p>Ma formation me donne un vrai sens de la rigueur, des budgets et des devis clairs. Côté web, je vous livre un site moderne et simple à comprendre, sans jargon technique.</p>
      <p>Ce qui me motive : aider les petites entreprises d’ici à être trouvées facilement, et à donner envie dès la première visite. Puis rester là ensuite, pour que le site suive votre activité.</p>
    </div>
  </div>
  <ul class="values">
    <li data-reveal><h3>Proximité</h3><p>Je suis du coin. On peut se voir, s’appeler, et vous avez toujours le même interlocuteur.</p></li>
    <li data-reveal style="--d:1"><h3>Écoute</h3><p>Je pars de votre métier et de vos clients, pas d’un modèle tout fait.</p></li>
    <li data-reveal style="--d:2"><h3>Transparence</h3><p>Des prix affichés, un devis détaillé, et un site qui vous appartient.</p></li>
    <li data-reveal style="--d:3"><h3>Simplicité</h3><p>Je m’occupe du technique et je vous explique chaque étape avec des mots simples.</p></li>
  </ul>
  <!-- Avis clients : uniquement de vrais avis, avec l’accord écrit du client. Ajoute ici un bloc <figure class="avi glass">… quand tu en as. -->
  {cta_band("On fait connaissance ?", "Un appel de 15 minutes suffit pour voir si on est faits pour travailler ensemble.")}
</div></div>
"""
    person = {"@context": "https://schema.org", "@type": "Person", "name": "Melvyn Clouzet", "jobTitle": "Créateur de sites internet", "worksFor": {"@id": SITE + "/#studio"}, "url": SITE + "/a-propos/"}
    out = head("À propos de Studio Mel : Melvyn Clouzet, création de sites près de Lyon",
               "Studio Mel, c’est Melvyn Clouzet : un interlocuteur unique pour créer et faire évoluer le site des artisans et petites entreprises de Tarare, L’Arbresle, Sain-Bel et Lyon.",
               "/a-propos/", crumbs_ld([("/", "Accueil"), ("/a-propos/", "À propos")]) + "\n" + ld(person) + "\n")
    out += header("/a-propos/") + body + footer()
    write("/a-propos/", out)

FAQ = [
  ("Combien de temps pour créer mon site ?", "Entre 1 et 3 semaines pour un site vitrine, une fois que j’ai vos textes et vos photos. Comptez 3 à 5 semaines pour une boutique en ligne."),
  ("Je n’y connais rien, c’est un problème ?", "Pas du tout, je m’occupe de tout et je vous explique simplement chaque étape."),
  ("Comment se passe un projet ?", "On fait connaissance, je vous envoie un devis clair avec un prix fixe, puis je vous montre la page d’accueil pour valider l’ambiance. Je construis le reste, vous avez deux tours de retouches (trois en Premium), et le site part en ligne à votre nom."),
  ("Qu’est-ce que le référencement de base ?", "Tout ce qui aide Google à comprendre votre site : un titre et une description pour chaque page, votre ville et votre métier bien indiqués, un aperçu propre quand on partage votre lien. C’est inclus dans toutes les formules. Pour apparaître sur Google Maps, il y a l’option Fiche Google à 80 €."),
  ("Combien coûte le nom de domaine ?", "Environ 15 € par an. Il est acheté à votre nom : l’adresse vous appartient. Je m’occupe de l’acheter et de le renouveler, et je vous le refacture."),
  ("Et l’hébergement, je dois le payer ?", "Non. Votre site est hébergé gratuitement sur un compte à votre nom. Pas d’abonnement obligatoire : seul le nom de domaine se paie chaque année. Pour une boutique, l’hébergement reste gratuit dans la plupart des cas ; si votre volume de commandes demande un petit service payant, c’est indiqué dans le devis avant de commencer."),
  ("Y a-t-il des frais sur les ventes d’une boutique ?", "Je ne prends aucune commission. Le paiement passe par Stripe, sur un compte à votre nom : l’argent arrive directement chez vous, et Stripe prélève ses propres frais, environ 1,5 % + 0,25 € par paiement avec une carte européenne."),
  ("La maintenance est-elle obligatoire ?", "Non. Sans maintenance, votre site reste en ligne et les modifications sont facturées 30 € de l’heure. Avec la maintenance à 40 € par mois, je surveille le site et je fais jusqu’à 1 h de changements par mois. Pour une boutique : 70 € par mois avec 2 h de changements, l’ajout de produits et le suivi technique des commandes. Elle s’engage sur 6 mois minimum."),
  ("Comment se passe le paiement ?", "En 2 fois : 50 % au démarrage, 50 % à la mise en ligne. Ou en 3 fois : 30 % au démarrage, 40 % à la validation de la maquette, 30 % à la mise en ligne. Sans frais."),
  ("Et si j’ai besoin de plus de pages ?", "La Refonte et la Création vont jusqu’à 5 pages, le Premium jusqu’à 8. Chaque page en plus coûte 60 €. Une boutique comprend jusqu’à 20 produits, puis 80 € par lot de 20."),
  ("Pourquoi parler de tarifs de lancement ?", "Studio Mel est une activité qui démarre. Mes premiers clients profitent de prix plus bas en échange de leur confiance. Ces tarifs augmenteront après mes premiers projets : le prix indiqué sur votre devis signé, lui, ne change pas."),
  ("Y a-t-il des frais cachés ?", "Non. Vous payez la formule, les options que vous choisissez et le nom de domaine, rien d’autre. Pour une boutique, seuls les frais du service de paiement s’ajoutent sur chaque vente. TVA non applicable."),
  ("Le site m’appartient-il ?", "Oui. Le site, son hébergement et le nom de domaine sont à votre nom."),
]

def build_contact():
    faq = "\n".join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in FAQ)
    opts = [("Création de site vitrine", "Création · 750 €"), ("Refonte de site", "Refonte · 500 €"), ("Site Premium", "Premium vitrine · 1 200 €"), ("Boutique en ligne", "Boutique en ligne · dès 1 900 €"), ("Fiche Google Business", "Fiche Google · 80 €"), ("Maintenance", "Maintenance d’un site existant"), ("Autre demande", "Autre demande, je ne sais pas encore")]
    options = "".join(f'<option value="{v}">{t}</option>' for v, t in opts)
    body = page_head_block("Parlons de votre projet", "Je vous réponds sous 48 h avec un devis gratuit et sans engagement. Écrivez-moi, appelez-moi ou réservez un appel.", [("/", "Accueil"), ("/contact/", "Contact")])
    body += f"""<div class="page-body"><div class="wrap">
  <div class="contact-grid" id="formulaire">
    <div class="contact-info" data-reveal>
      <p>Dites-m’en un peu sur votre activité et ce que vous attendez de votre site. Pas besoin d’avoir tout prévu : on affine ensemble.</p>
      <ul class="contacts">
        <li><span>Téléphone</span><a href="tel:{TEL_INTL}">{TEL}</a></li>
        <li><span>E-mail</span><a href="mailto:{MAIL}">{MAIL}</a></li>
        <li><span>Rendez-vous</span><a href="#rdv">Réserver un appel de 15 minutes</a></li>
        <li><span>Zone</span>Tarare, L’Arbresle, Sain-Bel, Lyon et alentours</li>
      </ul>
    </div>
    <form id="devis-form" class="form glass" novalidate data-reveal style="--d:1">
      <div class="fld"><label for="d-nom">Votre nom</label><input id="d-nom" name="nom" required maxlength="80" autocomplete="name"><small class="err" aria-live="polite"></small></div>
      <div class="fld"><label for="d-ent">Votre entreprise</label><input id="d-ent" name="entreprise" required maxlength="100" autocomplete="organization"><small class="err" aria-live="polite"></small></div>
      <div class="fld"><label for="d-mail">Votre e-mail</label><input id="d-mail" name="email" type="email" required maxlength="120" autocomplete="email" inputmode="email"><small class="err" aria-live="polite"></small></div>
      <div class="fld"><label for="d-form">Ce qui vous intéresse</label><select id="d-form" name="formule" required>{options}</select></div>
      <div class="fld"><label for="d-msg">Votre projet <em>(facultatif)</em></label><textarea id="d-msg" name="message" maxlength="2000" placeholder="Votre métier, votre site actuel s’il existe, ce que vous attendez… Pour une boutique : ce que vous vendez et combien de produits."></textarea></div>
      <button type="submit" class="btn btn-lg btn-primary">Envoyer ma demande {ARW}</button>
      <p id="devis-statut" class="statut" role="status"></p>
      <p class="rgpd">Vos informations servent uniquement à vous répondre. <a class="inline-link" href="/confidentialite/">En savoir plus</a></p>
    </form>
  </div>
  <div class="rdv glass" id="rdv" data-reveal>
    <div class="rdv-head"><h2 class="h-sec" style="margin:0 0 8px">Réserver un appel</h2><p>Choisissez un créneau de 15 minutes. Je vous confirme le rendez-vous par e-mail.</p></div>
    <form id="rdv-form">
      <div class="rdv-step"><span class="rdv-lbl" id="l-jour">Jour</span><div class="days" id="rdv-days" role="radiogroup" aria-labelledby="l-jour"></div></div>
      <div class="rdv-step"><span class="rdv-lbl" id="l-heure">Heure</span><div class="slots" id="rdv-slots" role="radiogroup" aria-labelledby="l-heure"></div></div>
      <div class="rdv-step"><span class="rdv-lbl">Comment</span>
        <fieldset class="seg" aria-label="Type de rendez-vous">
          <label><input type="radio" name="mode" value="Téléphone" checked><span>Téléphone</span></label>
          <label><input type="radio" name="mode" value="Visio"><span>Visio</span></label>
          <label><input type="radio" name="mode" value="Sur place"><span>Sur place</span></label>
        </fieldset>
      </div>
      <div class="rdv-fields">
        <input name="nom" maxlength="80" placeholder="Votre nom" required autocomplete="name" aria-label="Votre nom">
        <input name="entreprise" placeholder="Votre entreprise" required autocomplete="organization" aria-label="Votre entreprise">
        <input name="tel" type="tel" placeholder="Votre téléphone" required autocomplete="tel" aria-label="Votre téléphone">
        <input name="email" type="email" placeholder="Votre e-mail" required autocomplete="email" aria-label="Votre e-mail">
      </div>
      <div class="rdv-foot"><p class="rdv-sum" id="rdv-sum">Choisissez un jour et une heure.</p><button type="submit" class="btn btn-lg btn-primary" id="rdv-btn" disabled>Réserver ce créneau</button></div>
      <p id="rdv-statut" role="status"></p>
    </form>
  </div>
  <section id="faq" aria-labelledby="t-faq">
    <h2 class="h-sec" id="t-faq" data-reveal>Questions fréquentes</h2>
    <div class="faq">{faq}</div>
  </section>
</div></div>
"""
    faqld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]}
    out = head("Contact et devis gratuit pour votre site internet | Studio Mel",
               "Demandez un devis gratuit pour la création ou la refonte de votre site internet, ou réservez un appel de 15 minutes. Réponse sous 48 h. Tarifs, délais et questions fréquentes.",
               "/contact/", crumbs_ld([("/", "Accueil"), ("/contact/", "Contact")]) + "\n" + ld(faqld) + "\n")
    out += header("/contact/") + body + footer(f'<script type="module" src="/assets/js/contact.js?v={V}"></script>\n')
    write("/contact/", out)

def build_outils():
    tools = open(os.path.join(ROOT, "_build", "outils.html"), encoding="utf-8").read()
    body = page_head_block("Audit et outils gratuits", "Votre site est-il rapide, bien vu par Google, agréable sur téléphone ? Testez-le en une minute, ou demandez-moi un vrai regard. Gratuit, sans inscription.", [("/", "Accueil"), ("/outils/", "Audit et outils")])
    body += f"""<div class="page-body"><div class="wrap">
  <div>
{tools}
  </div>
  <div class="audit-box glass" id="audit" data-reveal>
    <div>
      <h2>Un audit fait par moi, pas par un robot</h2>
      <p>Donnez-moi l’adresse de votre site : je le regarde sur ordinateur et sur téléphone, et je vous envoie ce qui freine vos clients, avec des mots simples. Gratuit, réponse sous 48 h.</p>
    </div>
    <form id="audit-form">
      <input name="site" type="url" inputmode="url" maxlength="200" placeholder="Adresse de votre site (https://…)" required aria-label="Adresse de votre site">
      <input name="entreprise" maxlength="100" placeholder="Votre entreprise" required autocomplete="organization" aria-label="Votre entreprise">
      <input name="email" type="email" placeholder="Votre e-mail" required autocomplete="email" aria-label="Votre e-mail">
      <button type="submit" class="btn btn-lg btn-primary">Recevoir mon audit gratuit</button>
      <p id="audit-statut" class="statut" role="status"></p>
    </form>
  </div>
</div></div>
"""
    out = head("Audit de site internet gratuit et outils pour artisans | Studio Mel",
               "Testez gratuitement la vitesse et le référencement de votre site, faites le diagnostic de votre présence en ligne, ou demandez un audit gratuit fait à la main. Résultat immédiat ou sous 48 h.",
               "/outils/", crumbs_ld([("/", "Accueil"), ("/outils/", "Audit et outils gratuits")]) + "\n")
    out += header("") + body + footer(f'<script src="/assets/js/outils.js?v={V}" defer></script>\n<script type="module" src="/assets/js/audit-form.js?v={V}"></script>\n')
    write("/outils/", out)

# ---------------- JOURNAL ----------------
ARTICLES = [
  dict(slug="prix-site-artisan", titre="Combien coûte un site internet pour un artisan ?", cat="Création de site", date="2026-10-31", lecture=5, a="#2F5BFF", b="#0B1030", ic="€",
       resume="Ce que vous payez vraiment, ce qui doit être inclus, et les frais cachés à éviter avant de signer.",
       desc="Prix d’un site internet pour artisan : ce qui fait varier le tarif, ce qui doit être inclus, les frais annuels et les pièges à éviter avant de signer.",
       cta=("Estimer le prix de mon site", "/#formules"),
       html="""<p>C’est la première question que me posent les artisans, et c’est normal : les prix vont de « gratuit » à plusieurs milliers d’euros. Voici comment s’y retrouver.</p>
<h2>Ce qui fait varier le prix</h2><p>Trois choses comptent vraiment : <strong>le nombre de pages</strong>, <strong>le travail sur mesure</strong> (design, textes, photos) et <strong>les fonctionnalités</strong> en plus, comme la réservation ou la vente en ligne. Un site de 5 pages bien fait suffit à la grande majorité des artisans : accueil, services, réalisations, à propos, contact.</p>
<h2>Les prix chez Studio Mel</h2><ul><li>Refonte d’un site existant : 500 €</li><li>Création d’un site vitrine : 750 €</li><li>Site Premium, jusqu’à 8 pages avec animations : 1 200 €</li><li>Boutique en ligne : à partir de 1 900 €</li></ul>
<p>Ce sont mes tarifs de lancement. Ils comprennent la version mobile, le référencement de base, le formulaire de contact et la mise en ligne.</p>
<h2>Les frais qui reviennent chaque année</h2><p>Un site a très peu de frais fixes s’il est bien construit :</p><ul><li><strong>Le nom de domaine</strong> (votre adresse en .fr) : environ 15 € par an.</li><li><strong>L’hébergement</strong> : il peut être gratuit pour un site vitrine.</li><li><strong>La maintenance</strong> : facultative. Chez moi, 40 € par mois avec une heure de modifications incluse.</li></ul>
<div class="enc"><strong>Le piège à éviter :</strong> les offres « site gratuit » avec un abonnement mensuel. Au bout de deux ou trois ans, vous avez souvent payé plus cher qu’un site acheté, et le site ne vous appartient pas : si vous arrêtez l’abonnement, il disparaît.</div>
<h2>Les 3 questions à poser avant de signer</h2><ol><li>Le nom de domaine sera-t-il à mon nom ?</li><li>Que se passe-t-il si j’arrête de payer la maintenance ?</li><li>Combien de modifications sont comprises avant la mise en ligne ?</li></ol>
<p>Si les réponses sont floues, méfiez-vous. Chez Studio Mel, le domaine et l’hébergement sont à votre nom, et le devis précise tout avant de commencer.</p>"""),
  dict(slug="fiche-google", titre="Fiche Google : la première chose à faire pour être trouvé près de chez vous", cat="Référencement local", date="2026-10-31", lecture=4, a="#3DD68C", b="#0B2A1C", ic="G",
       resume="Gratuite et rapide à créer, la fiche Google vous fait apparaître sur Maps quand on cherche votre métier dans votre ville.",
       desc="Comment créer et optimiser sa fiche Google (Google Business Profile) pour apparaître sur Google Maps quand on cherche votre métier près de chez vous.",
       cta=("Tester ma présence en ligne", "/outils/#diagnostic"),
       html="""<p>Quand quelqu’un tape « plombier Tarare » ou « boulangerie près de moi », Google affiche d’abord une carte avec quelques entreprises. Pour y apparaître, il faut une <strong>fiche d’établissement Google</strong> (Google Business Profile).</p>
<h2>Pourquoi c’est prioritaire</h2><p>La fiche est <strong>gratuite</strong>, elle s’affiche sur Google Maps et dans les recherches, et elle permet à vos clients de vous appeler ou de trouver votre adresse en un geste. Pour un artisan ou un commerce de proximité, c’est souvent la première porte d’entrée, avant même le site internet.</p>
<h2>Les étapes pour la créer</h2><ol><li>Rendez-vous sur le site Google Business Profile avec un compte Google.</li><li>Indiquez le nom de votre entreprise et choisissez la <strong>catégorie principale</strong> la plus précise possible.</li><li>Ajoutez votre adresse, ou votre zone d’intervention si vous vous déplacez chez vos clients.</li><li>Validez votre fiche : Google vous propose une méthode de vérification (vidéo, téléphone, courrier…).</li><li>Complétez tout : horaires, téléphone, site internet, description et photos.</li></ol>
<h2>Ce qui fait la différence ensuite</h2><ul><li><strong>Des photos réelles</strong> de vos réalisations, de votre local ou de votre équipe.</li><li><strong>Des horaires à jour</strong>, y compris pendant les congés.</li><li><strong>Des avis clients</strong> : demandez-les simplement après un chantier réussi, et répondez à chacun, même aux négatifs.</li><li><strong>Un lien vers votre site</strong>, pour que les clients découvrent votre travail en détail.</li></ul>
<div class="enc"><strong>Bon à savoir :</strong> une fiche et un site se renforcent l’un l’autre. La fiche vous rend visible, le site convainc. Les deux ensemble, c’est l’idéal.</div>
<p>Pas le temps de vous en occuper ? Je peux créer et optimiser votre fiche pour 80 €, une seule fois.</p>"""),
]
MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
def date_fr(d): y, m, j = d.split("-"); return f"{int(j)} {MOIS[int(m) - 1]} {y}"

def carte(a):
    return (f'<a class="jc glass" href="/journal/{a["slug"]}/" data-reveal><div class="jc-img" style="--a:{a["a"]};--b:{a["b"]}"><span aria-hidden="true">{a["ic"]}</span></div>'
            f'<div class="jc-b"><span class="jc-m"><b>{a["cat"]}</b> · {date_fr(a["date"])} · {a["lecture"]} min</span><h2 class="h3">{esc(a["titre"])}</h2><p>{esc(a["resume"])}</p></div></a>')

def build_journal():
    body = page_head_block("Le Journal", "Des conseils concrets pour les artisans et les petites entreprises qui veulent être trouvés en ligne. Sans jargon.", [("/", "Accueil"), ("/journal/", "Le Journal")])
    body += f'<div class="page-body"><div class="wrap"><div class="jr-list">{"".join(carte(a) for a in ARTICLES)}</div>{cta_band()}</div></div>\n'
    out = head("Le Journal : conseils pour être trouvé en ligne | Studio Mel", "Conseils simples pour les artisans et petites entreprises : prix d’un site internet, fiche Google, référencement local.", "/journal/", crumbs_ld([("/", "Accueil"), ("/journal/", "Le Journal")]) + "\n")
    out += header("") + body + footer()
    write("/journal/", out)
    for a in ARTICLES:
        autres = [x for x in ARTICLES if x is not a]
        body = f"""<section class="page-head"><div class="wrap"><article class="ja">
  <ol class="crumbs" aria-label="Fil d’Ariane"><li><a href="/">Accueil</a></li><li><a href="/journal/">Le Journal</a></li><li aria-current="page">{esc(a["cat"])}</li></ol>
  <p class="ja-meta"><b>{a["cat"]}</b> · <time datetime="{a["date"]}">{date_fr(a["date"])}</time> · {a["lecture"]} min de lecture · par Melvyn</p>
  <h1>{esc(a["titre"])}</h1>
  <div class="ja-img" style="--a:{a["a"]};--b:{a["b"]}"><span aria-hidden="true">{a["ic"]}</span></div>
  <div class="ja-c">{a["html"]}</div>
  <div class="cta-row"><a class="btn btn-lg btn-primary" href="{a["cta"][1]}">{a["cta"][0]}</a><a class="btn btn-lg btn-ghost" href="/contact/">Me poser une question</a></div>
  {f'<div class="ja-sim"><h2>À lire aussi</h2><div class="jr-list">{"".join(carte(x) for x in autres)}</div></div>' if autres else ''}
</article></div></section>
"""
        art = {"@context": "https://schema.org", "@type": "Article", "headline": a["titre"], "description": a["desc"], "datePublished": a["date"], "dateModified": a["date"], "inLanguage": "fr-FR",
               "author": {"@type": "Person", "name": "Melvyn Clouzet", "url": SITE + "/a-propos/"}, "publisher": {"@id": SITE + "/#studio"}, "image": SITE + "/og-image.jpg", "mainEntityOfPage": SITE + f"/journal/{a['slug']}/"}
        out = head(a["titre"] + " | Studio Mel", a["desc"], f"/journal/{a['slug']}/", crumbs_ld([("/", "Accueil"), ("/journal/", "Le Journal"), (f"/journal/{a['slug']}/", a["titre"])]) + "\n" + ld(art) + "\n", og_type="article")
        out += header("") + body + footer()
        write(f"/journal/{a['slug']}/", out)

# ---------------- PAGES LÉGALES ----------------
def build_legal():
    body = page_head_block("Mentions légales", "Qui édite ce site et où il est hébergé.", [("/", "Accueil"), ("/mentions-legales/", "Mentions légales")])
    body += f"""<div class="page-body"><div class="wrap"><div class="legal">
  <h2>Éditeur du site</h2>
  <p>Le site Studio Mel est édité par Melvyn Clouzet, directeur de la publication.<br>E-mail : <a href="mailto:{MAIL}">{MAIL}</a><br>Téléphone : <a href="tel:{TEL_INTL}">{TEL}</a></p>
  <p class="todo">Studio Mel est une activité en cours de création. Le numéro SIRET et l’adresse de l’entreprise seront publiés ici dès son immatriculation.</p>
  <!-- À COMPLÉTER À L’IMMATRICULATION :
       « Melvyn Clouzet, entrepreneur individuel (micro-entreprise), Studio Mel. SIRET : … Adresse : …
         TVA non applicable, art. 293 B du CGI. »
       Si vous vendez aussi aux particuliers, ajouter :
       « Médiation de la consommation : en cas de litige, vous pouvez recourir gratuitement au médiateur [nom], [site]. » -->
  <h2>Hébergement</h2>
  <p>GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
  <h2>Propriété</h2>
  <p>Les textes, le logo et le design de ce site appartiennent à Studio Mel. Les maquettes présentées dans les réalisations restent la propriété des entreprises concernées.</p>
  <h2>Données personnelles et cookies</h2>
  <p>Tout est expliqué sur la page <a href="/confidentialite/">Confidentialité et cookies</a>.</p>
</div></div></div>
"""
    out = head("Mentions légales | Studio Mel", "Mentions légales du site Studio Mel : éditeur, hébergement et propriété intellectuelle.", "/mentions-legales/", crumbs_ld([("/", "Accueil"), ("/mentions-legales/", "Mentions légales")]) + "\n")
    out += header("") + body + footer(assistant=False)
    write("/mentions-legales/", out)

    body = page_head_block("Confidentialité et cookies", "Ce que deviennent vos informations, en clair.", [("/", "Accueil"), ("/confidentialite/", "Confidentialité et cookies")])
    body += f"""<div class="page-body"><div class="wrap"><div class="legal">
  <h2>Quelles données ?</h2>
  <p>Celles que vous saisissez dans les formulaires : nom, entreprise, e-mail, téléphone, adresse de votre site, créneau choisi et message.</p>
  <h2>Pourquoi ?</h2>
  <p>Uniquement pour répondre à votre demande (devis, audit, rendez-vous) et, si nous travaillons ensemble, pour assurer le suivi de votre projet. Elles ne sont ni vendues, ni louées, ni utilisées pour de la publicité.</p>
  <h2>Où vont-elles ?</h2>
  <p>Elles sont enregistrées dans une base de données Google Firebase située en Europe, et transmises par e-mail grâce au service EmailJS. Seul Melvyn Clouzet y a accès.</p>
  <h2>Combien de temps ?</h2>
  <p>Une demande restée sans suite est supprimée au plus tard 3 ans après notre dernier échange. Pour les clients, les données sont gardées le temps de la relation, et les factures 10 ans comme l’exige la loi.</p>
  <h2>Vos droits</h2>
  <p>Vous pouvez demander à consulter, corriger, supprimer ou récupérer vos données, ou vous opposer à leur utilisation, en écrivant à <a href="mailto:{MAIL}">{MAIL}</a>. Réponse sous un mois. Vous pouvez aussi adresser une réclamation à la CNIL (cnil.fr).</p>
  <h2>Cookies et traceurs</h2>
  <p>Ce site n’utilise <strong>aucun cookie</strong>, aucun outil de mesure d’audience et aucun traceur publicitaire. C’est pourquoi aucun bandeau ne vous demande votre accord.</p>
  <p>Quand vous passez d’une page à l’autre avec une demande en cours (formule choisie, estimation du simulateur, résultat d’un outil), elle est gardée dans la mémoire de votre navigateur le temps de la session, puis effacée. Elle n’est envoyée à personne tant que vous ne cliquez pas sur « Envoyer ».</p>
  <h2>Services utilisés</h2>
  <ul>
    <li>Les polices et les animations sont hébergées sur ce site.</li>
    <li>Les formulaires chargent Firebase (Google) et EmailJS (via jsDelivr) au moment où vous commencez à les remplir.</li>
    <li>Le test de vitesse interroge Google PageSpeed Insights, et les audits automatiques passent par un relais Cloudflare. Seule l’adresse du site à tester leur est transmise.</li>
    <li>L’outil « L’Atelier » charge les polices de l’aperçu depuis Google Fonts, uniquement quand vous les choisissez.</li>
  </ul>
  <p>Comme pour toute page web, ces services reçoivent votre adresse IP lorsqu’ils sont appelés.</p>
</div></div></div>
"""
    out = head("Confidentialité et cookies | Studio Mel", "Données personnelles et cookies sur le site Studio Mel : quelles données, pourquoi, combien de temps, vos droits. Aucun cookie ni traceur.", "/confidentialite/", crumbs_ld([("/", "Accueil"), ("/confidentialite/", "Confidentialité et cookies")]) + "\n")
    out += header("") + body + footer(assistant=False)
    write("/confidentialite/", out)

def build_404():
    body = f"""<section class="page-head" style="min-height:70vh"><div class="wrap">
  <h1>Cette page n’existe pas, ou plus.</h1>
  <p class="lede">Le site a fait peau neuve : l’adresse a peut-être changé.</p>
  <div class="cta-row"><a class="btn btn-lg btn-primary" href="/">Revenir à l’accueil</a><a class="btn btn-lg btn-ghost" href="/realisations/">Voir les réalisations</a><a class="btn btn-lg btn-ghost" href="/contact/">Me contacter</a></div>
</div></section>
"""
    out = head("Page introuvable | Studio Mel", "Cette page n’existe pas ou a changé d’adresse.", "/404.html").replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex">')
    out += header("") + body + footer()
    write("/404.html", out)

def build_seo_files():
    urls = [("/", "1.0"), ("/realisations/", "0.9"), ("/contact/", "0.8"), ("/a-propos/", "0.7"), ("/outils/", "0.7"), ("/journal/", "0.6")] + [(f"/journal/{a['slug']}/", "0.6") for a in ARTICLES] + [("/mentions-legales/", "0.2"), ("/confidentialite/", "0.2")]
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "".join(f"  <url><loc>{SITE}{u}</loc><lastmod>{DATE}</lastmod><priority>{p}</priority></url>\n" for u, p in urls) + "</urlset>\n"
    write("/sitemap.xml", xml)
    write("/robots.txt", f"User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /admin/\n\nSitemap: {SITE}/sitemap.xml\n")

if __name__ == "__main__":
    build_home(); build_realisations(); build_apropos(); build_contact(); build_outils(); build_journal(); build_legal(); build_404(); build_seo_files()
    print("Pages générées.")
