# Studio Mel · site V2

Site statique hébergé sur GitHub Pages (studiomel.eu).

## Mettre la V2 en ligne
1. Sur GitHub, crée d’abord une branche de sauvegarde de la V1 (bouton « main » → taper `v1-sauvegarde` → Create branch).
2. Dans la branche `main`, **supprime l’ancien fichier `Robots.txt`** (avec un R majuscule) et l’ancien `index.html`.
3. Envoie tout le contenu de ce dossier (Add file → Upload files), en gardant les dossiers. `admin.html` et `admin/` sont inchangés.
4. Attends 1 à 2 minutes, puis vérifie studiomel.eu en navigation privée.

## À faire de ton côté
- Restreindre la clé PageSpeed (voir le commentaire dans `assets/js/config.js`).
- Ajouter ta photo : `img/melvyn.jpg` (page À propos) et la capture de l’ancien site Dupuis : `img/avant-dupuis.jpg` (le comparateur avant/après apparaît alors tout seul).
- Activer l’audit avec IA : `_cloudflare/audit-ia/LISEZMOI.md`.
- Dans Google Search Console : soumettre `https://studiomel.eu/sitemap.xml`.
- À l’immatriculation : compléter SIRET et adresse dans `_build/build.py` (page mentions légales).

## Modifier le contenu
Les pages sont générées par `_build/build.py` (réalisations, formules, FAQ, articles…).
Après une modification : `python3 _build/build.py` depuis ce dossier.
Les tarifs du simulateur et de l’assistant sont dans `assets/js/config.js`.
L’espace admin reste à l’adresse studiomel.eu/admin.html (le lien 🔑 a été retiré du pied de page).
