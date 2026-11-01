/* =========================================================
   Studio Mel · réglages du site (une seule source)
   ========================================================= */

// Tarifs de lancement, en euros : utilisés par les formules, le simulateur, les outils et l'assistant.
window.TARIFS = { refonte: 500, creation: 750, premium: 1200, boutique: 1900, lotProduits: 80, promo: 100, google: 80, domaine: 15, maint: 40, maintBoutique: 70, heure: 30, page: 60, galerie: 60, blog: 150, resa: 150 };

// Clé Google PageSpeed (test de vitesse). Elle est visible par tous : dans Google Cloud,
// restreins-la aux sites « studiomel.eu/* » et à l'API PageSpeed Insights uniquement.
window.PSI_KEY = "AIzaSyCbNqPkGkpV2_8onmO3sI4pZhJM-LnfZ-Y";

// Relais Cloudflare existant pour l'« Audit SEO express » (l'outil reste caché si l'adresse est vide).
window.AUDIT_API = 'https://broken-glitter-dd04.melvynclouzet.workers.dev';

// Nouveau relais Cloudflare pour l'audit automatique avec IA (voir _cloudflare/audit-ia/LISEZMOI.md).
// Tant que l'adresse est vide, l'onglet « Audit automatique » reste caché et rien ne casse.
window.AUDIT_IA_API = '';

// Numéro pour le bouton « Appeler » sur téléphone.
window.TEL_STUDIO = '0604159858';
