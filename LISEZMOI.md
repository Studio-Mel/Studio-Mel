# Relais « Audit automatique avec IA »

Ce petit programme tourne chez Cloudflare (offre gratuite). Il analyse un site, puis l’IA de Cloudflare (Workers AI) résume le résultat en français simple. Ton site l’appelle depuis la page /outils/.

Il ne remplace pas ton relais actuel (`broken-glitter-dd04…`), qui continue de faire tourner l’« Audit SEO express ».

## Mise en place depuis le tableau de bord (sans ligne de commande)

1. Sur dash.cloudflare.com : **Workers et Pages** → **Créer** → **Créer un Worker**. Nomme-le `studiomel-audit-ia`, puis **Déployer**.
2. **Modifier le code** : efface tout, colle le contenu de `worker.js`, puis **Déployer**.
3. Onglet **Paramètres** → **Liaisons** → **Ajouter** → **Workers AI**. Nom de la variable : `AI` (en majuscules).
4. (Conseillé) **Paramètres** → **Variables et secrets** → ajoute un **secret** `PSI_KEY` : une clé Google PageSpeed créée pour ce relais, restreinte à l’API PageSpeed Insights (sans restriction de site, puisque l’appel part de Cloudflare). Sans clé, ça marche aussi, avec un quota plus faible.
5. Copie l’adresse du Worker (du type `https://studiomel-audit-ia.melvynclouzet.workers.dev`).
6. Dans `assets/js/config.js` du site, colle-la : `window.AUDIT_IA_API = 'https://…';` puis publie sur GitHub.

L’onglet « Audit automatique » apparaît alors en premier sur /outils/. Tant que l’adresse est vide, il reste caché et rien ne casse.

## Test

Ouvre dans ton navigateur : `https://ton-worker.workers.dev/?url=www.studiomel.eu`
Tu dois voir un texte JSON avec `scores`, `controles` et `synthese`.

## Coûts et limites

- Workers gratuit : 100 000 requêtes par jour.
- Workers AI gratuit : 10 000 « neurones » par jour. Chaque résumé en consomme peu, et les résultats sont gardés 6 h en cache.
- Si le quota IA est épuisé, le relais renvoie quand même l’analyse avec un résumé automatique, sans IA.
- Le résumé est indiqué comme écrit par une IA sur la page.
