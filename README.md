# ARISE : système de progression personnel

Application web (PWA) de suivi nutrition, musculation, cardio et composition corporelle, habillée comme une « fenêtre de statut » de chasseur : chaque habitude rapporte de l'XP, fait monter des statistiques et un rang (E → S).

Tout fonctionne **sans compte et hors ligne** : les données vivent dans le navigateur (IndexedDB). La synchronisation cloud (Supabase) et l'IA (Claude) sont optionnelles.

## Fonctionnalités

| Module | Contenu |
| --- | --- |
| **Dashboard** | **Donjon de l'objectif** (barre de progression avec boss de palier), anneau calories + macros, quêtes du jour, score quotidien, séance prévue, tendance de poids, conseil du jour, série (streak) |
| **Nutrition** | Journal par repas, base de ~200 aliments FR + Open Food Facts, **Nutrition Score contextuel** (selon ton objectif, pas « bon/mauvais »), favoris/récents, repas enregistrés, **scan code-barres**, **photo de repas → estimation IA (Gemini ou Claude) modifiable, avec mémoire** (produits réutilisés sans doublon, plats enregistrés dans « Repas »), copie du repas de la veille |
| **Recettes** | **36 recettes faciles avec photo** : macros par portion calculées, portions ajustables, ingrédients (rayon, format, **prix indicatifs discount / supermarché**, **prix réels relevés en magasin via Open Prices**, ton propre prix), ustensiles, étapes avec minuteurs et températures, astuces, conservation, **liste de courses** copiable, ajout au journal en un tap |
| **Workout** | Séances **entièrement personnalisables** (nom, icône, couleur, exercices, nombre de séries), splits prêts à l'emploi (Push/Pull 4 j, Upper/Lower, PPL…), planning de la semaine, bibliothèque de ~70 exercices **modifiables** (nom, icône, muscles, équipement, **instructions « comment le faire » et conseils**, notes) + exercices perso, **23 silhouettes de mouvements** (squat, couché, tractions…) suggérées d'après le nom, **mode focus** (perf précédente, minuteur de repos, effets de progression et de record), ajout/retrait d'exercices en cours de séance (avec option « aussi dans le programme » et mise à jour du programme en fin de séance), suppression d'une série (bouton « − Série » ou glisser vers la gauche, avec annulation), **correction des séances passées** (poids, reps, séries, exercices, nom, date, heure, durée, RPE), **ajout des séances oubliées** depuis l'historique (préremplies avec la perf précédant ce jour, rappel des séances prévues non notées), historique complet par mois, e1RM, **sons « Système » (Hunter)** synthétisés (lancement « Arise », série, exercice terminé, record, fin de repos, séance terminée), **musique d'entraînement** (voir plus bas) |
| **Progress** | Poids + moyenne 7 jours, tendance, **maintenance adaptative**, projection de sèche, composition corporelle, mensurations, **photos avant/après** : comparateur (curseur ou côte à côte) où l'on choisit et inverse AVANT / APRÈS, **galerie avant/après** des comparaisons gardées, **galerie triée par date** (récentes ou anciennes d'abord, filtre par pose, sélection de 2 photos à comparer), date de prise de vue lue dans la photo (EXIF) et place AVANT/APRÈS choisie dès l'import, correction de la date et de la pose |
| **Système** | Statut (niveau, rang, stats STR/END/ACT/DISC/REC/NUT, succès), calendrier heatmap de discipline avec **mémoire des cycles** (frise et statistiques de chaque sèche / prise de masse / maintien : poids, rythme, calories, séances, records, adhérence, mensurations), analytics (corrélations), rapport hebdo (+ analyse IA), **coach ARISE AI**, Knowledge (21 fiches avec sources scientifiques) |
| **Cycles** | **Changer de cycle** (sèche → prise de masse → maintien → recomposition) depuis Progress, Calendrier ou Réglages : le cycle en cours est clôturé, l'objectif, le poids visé, le rythme et les calories suivent, le donjon de l'objectif repart du poids actuel. Les jours d'un cycle terminé restent jugés avec son objectif (l'XP passée ne change pas). Ajout de cycles passés, modification, suppression |
| **Réglages** | Profil, objectifs (auto ou manuels), quêtes, préférences (sons et style de sons avec écoute, vibrations, **animations activables/désactivables**, effets), clé IA, compte/sync, export JSON/CSV, import, suppression |

## Musique d'entraînement (Solo Leveling)

Bouton ♪ (barre du haut, barre latérale, écran de séance) : lecteur avec lecture/pause, précédent/suivant, aléatoire, répétition, position, volume, et un menu **Openings / Endings / OST / Sons / Mes pistes**. Le catalogue liste les titres officiels de l'anime (LEveL, ReawakeR, request, UN-APEX, OST des saisons 1 et 2 de Hiroyuki Sawano).

- **Les musiques sont protégées par le droit d'auteur : ARISE ne les fournit pas.** Chaque titre du catalogue est un emplacement où importer **ton propre fichier** (acheté ou à toi), ou un lien vers Spotify, YouTube Music, Apple Music et Deezer. Tu peux aussi importer n'importe quel fichier audio ou ajouter un lien direct vers un fichier.
- Les fichiers restent **sur l'appareil** (IndexedDB) : ni synchronisés, ni exportés.
- La musique **continue écran verrouillé** (élément audio HTML + Media Session : titre et commandes sur l'écran de verrouillage) tant que tu ne la mets pas en pause, et pendant la navigation dans l'app. Elle baisse un instant pendant les sons du Système (fin de repos, record…).
- Sur iPhone, le volume se règle avec les boutons du téléphone (Safari ignore le volume défini par une page).

## Pas réels (Apple Santé)

Une application web ne peut pas lire le podomètre du téléphone en arrière-plan (Apple Santé et Health Connect sont réservés aux apps natives). ARISE propose donc :

- **iPhone** : un Raccourci « ARISE pas » (Rechercher des échantillons de santé → Nombre de pas aujourd'hui → Somme → Copier) puis, dans ARISE, **Pas → « Coller depuis Santé »**. Le guide pas à pas est dans l'app.
- **Lien** : ouvrir `/?pas=8432` (option `&date=2026-09-29`) pré-remplit la saisie, pratique avec une automatisation.
- **Saisie manuelle** partout ailleurs.

## Démarrage rapide

Prérequis : Node.js 20.9+ (22 recommandé).

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 → l'onboarding propose soit de créer ton profil, soit **« Explorer avec des données de démo »** (45 jours générés).

### Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Tests unitaires (Vitest : calculs énergie, tendance, XP, records, score nutrition, Open Food Facts) |
| `npm run e2e` | Parcours de bout en bout (Playwright) contre un serveur déjà lancé : `BASE=http://localhost:3000 npm run e2e` |

## Configuration (variables d'environnement)

Copie `.env.example` en `.env.local` et remplis ce dont tu as besoin. **Aucune variable n'est obligatoire.**

| Variable | Effet |
| --- | --- |
| `GEMINI_API_KEY` | Clé **Google Gemini** (offre gratuite, créée sur [AI Studio](https://aistudio.google.com/apikey)). Utilisée en priorité pour l'estimation des repas en photo, et pour le coach/rapport s'il n'y a pas de clé Claude. Sans variable serveur, chaque utilisateur peut coller sa clé dans Réglages → IA (stockée seulement dans son navigateur). |
| `ARISE_GEMINI_MODELS` | Modèles Gemini essayés dans l'ordre (défaut : `gemini-3.5-flash,gemini-3.5-flash-lite,gemini-2.5-flash-lite`) : quand le quota gratuit du premier est épuisé, le suivant prend le relais. |
| `ANTHROPIC_API_KEY` | Active Claude côté serveur (coach, rapport hebdo, photo si choisi). Même principe de clé personnelle possible dans Réglages → IA. |
| `ARISE_AI_PROVIDER` | `auto` (défaut : Gemini pour les photos, Claude pour le coach s'il est configuré), `gemini` ou `claude`. |
| `ARISE_ACCESS_CODE` | Recommandé si l'app est publique avec une clé serveur : les routes IA exigent ce code (à saisir dans Réglages → IA). |
| `ARISE_AI_MODEL` | Modèle Claude utilisé (défaut : `claude-opus-5-5`). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Active le compte et la synchronisation multi-appareils. |

> **Quota gratuit Gemini** : Google limite le nombre de requêtes par jour et par projet (remise à zéro à minuit, heure du Pacifique) ; les chiffres exacts de ton projet sont sur [aistudio.google.com/rate-limit](https://aistudio.google.com/rate-limit). En offre gratuite, Google peut utiliser les contenus envoyés pour améliorer ses produits.
>
> Côté Claude, ARISE utilise le repli côté serveur de l'API (`fallbacks: "default"`) : si le modèle principal refuse une requête, l'API peut la relancer automatiquement sur un modèle de secours. Les estimations restent indicatives et toujours modifiables avant validation.

## Synchronisation cloud (optionnel)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans *SQL Editor*, exécute `supabase/migrations/0001_init.sql` (tables, RLS « chaque utilisateur ne voit que ses lignes », bucket privé `progress-photos`), puis `0002_cycles_comparisons.sql` (cycles et galerie avant/après ; sans elle, ces deux tables restent simplement locales).
3. *Authentication → Providers* : e-mail activé par défaut ; ajoute Google si tu veux. Dans *URL Configuration*, ajoute l'URL de ton site (ex. `https://arise.vercel.app`) aux redirections autorisées.
4. Renseigne `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`, redéploie : Réglages → Compte propose connexion Google, e-mail + mot de passe ou lien magique.

La sync est incrémentale et bidirectionnelle (dernier modifié gagne), les données locales restent la source de vérité hors ligne.

## Déploiement (Vercel)

1. Pousse le dépôt sur GitHub puis *Add New → Project* sur [vercel.com](https://vercel.com).
2. Ajoute les variables d'environnement voulues (voir ci-dessus).
3. Déploie. Les routes IA déclarent une durée max de 60 s (120 s pour le coach) : vérifie que ton offre Vercel l'autorise.

## Installer sur téléphone (PWA)

- **iPhone (Safari)** : Partager → *Sur l'écran d'accueil*.
- **Android (Chrome)** : menu ⋮ → *Installer l'application*.

L'app s'ouvre alors en plein écran, fonctionne hors ligne (les pages déjà visitées sont mises en cache) et peut envoyer une notification de fin de repos.

## Architecture

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : choix techniques, modèle de données, logique métier (calculs, XP, quêtes), navigation.

Stack : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Motion · Recharts · Dexie (IndexedDB) · Zod · Claude API (`@anthropic-ai/sdk`) · Supabase · ZXing (code-barres).

## Données & sources

- Recettes : photos sous licence Creative Commons (Flickr / Wikimedia Commons via Openverse), auteur et licence affichés sur chaque fiche. Prix indicatifs = estimations 2026 à comparer, pas des tarifs officiels ; les prix « relevés en magasin » viennent d'[Open Prices](https://prices.openfoodfacts.org) (Open Food Facts, licence ODbL), médiane par enseigne sur 6 mois en France.

- Valeurs nutritionnelles de référence : tables CIQUAL (ANSES) et USDA ; produits du commerce : [Open Food Facts](https://world.openfoodfacts.org) (licence ODbL).
- Les fiches Knowledge citent leurs sources (auteurs, année, revue, type d'étude) avec un lien de recherche PubMed.
- ARISE ne fournit pas d'avis médical. Univers visuel original inspiré de l'esthétique « hunter system », sans affiliation.
