# ARISE — Architecture

> Application personnelle de transformation physique : nutrition + entraînement + corps + récupération, avec une couche de progression RPG inspirée de l'esthétique « hunter system ».

## 1. Choix structurants

| Décision | Choix | Pourquoi |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict | Stack demandée, routes API pour l'IA et les proxys. |
| Données | **Local-first** : IndexedDB via Dexie | Zéro configuration, instantané, fonctionne **hors-ligne à la salle**, données privées sur l'appareil. |
| Cloud | Supabase **optionnel** (Auth + Postgres + Storage + RLS) | Activé seulement si les variables d'env sont présentes → synchro multi-appareils (téléphone ↔ PC). |
| UI | Tailwind CSS v4 + composants maison | Contrôle total du thème, pas de dépendance UI lourde. |
| Animations | Motion (`motion/react`, ex-Framer Motion) | Transitions, compteurs, overlays Level Up. `MotionConfig reducedMotion="user"`. |
| Graphiques | Recharts 3 | Léger, composable, responsive. |
| Validation | Zod 4 | Formulaires, import JSON, réponses IA. |
| IA | Claude API (vision + texte) via routes serveur | Clé jamais exposée au client, code d'accès + rate limit. |
| Codes-barres | `BarcodeDetector` natif → fallback ZXing (lazy) + Open Food Facts | Marche sur Android et iPhone. |
| PWA | `manifest.ts` + service worker maison | Installable, shell hors-ligne. |
| Tests | Vitest (logique métier) + Playwright (captures responsive) | Les calculs critiques sont testés. |

### Écart volontaire par rapport au prompt initial

* **Pas d'authentification obligatoire** : l'app s'ouvre directement (usage perso). L'auth Supabase (e-mail/mot de passe, magic link, Google) sert uniquement à activer la synchro cloud.
* **XP, niveaux, records et scores sont *dérivés* des données** (jamais stockés en double). Corriger une saisie corrige automatiquement l'XP. Aucune incohérence possible.
* **Pas / eau / sommeil / énergie** sont regroupés dans un seul `daily_log` par jour (au lieu de 4 tables) : une ligne = une journée, saisie plus rapide.
* **Maintenance adaptative** (façon MacroFactor) : la dépense réelle est ré-estimée à partir des calories saisies et de la tendance du poids, bien plus fiable que les formules.

## 2. Arborescence

```
src/
  app/
    layout.tsx               racine : polices, metadata, viewport, providers
    manifest.ts              manifest PWA
    onboarding/              premier lancement (6 écrans)
    (app)/                   pages avec shell (sidebar desktop / bottom nav mobile)
      page.tsx               HOME (dashboard)
      nutrition/             journal, ajout, scan photo, code-barres, bibliothèque
      workout/               planning, routines, historique, exercices
      progress/              poids, mesures, composition, projection, photos
      calendar/ analytics/ knowledge/ coach/ report/ status/ settings/ more/
    (focus)/session/         MODE FOCUS séance (aucune navigation)
    api/
      ai/meal/               photo → aliments + portions (Claude vision)
      ai/coach/              ARISE AI (streaming)
      ai/report/             analyse hebdo IA
      food/search/           proxy Open Food Facts (recherche)
      food/barcode/[code]/   proxy Open Food Facts (produit)
  components/
    ui/        primitives (Card, Button, Ring, ProgressBar, Sheet, Tabs, Field…)
    layout/    AppShell, Sidebar, BottomNav, TopBar, QuickAdd, Background
    game/      overlays Level Up / Quest Complete / PR, SystemToast, XP bar, radar
    icons/     MuscleIcon (silhouette anatomique), EquipmentIcon, logo
    charts/    graphiques Recharts thémés
    <feature>/ composants par domaine (dashboard, nutrition, workout, progress…)
  lib/
    db/        Dexie (schéma, versions), repositories (écritures), hooks (lectures live)
    domain/    logique pure testée : énergie, macros, score nutritionnel, score du jour,
               XP/niveaux/quêtes, tendance, projection, 1RM/PR, rapport, conseils, corrélations
    data/      aliments, exercices, routines, articles Knowledge (sources réelles)
    ai/        prompts, schémas, garde d'accès
    sync/      moteur de synchro Supabase (push/pull, tombstones)
    utils/     dates, formatage, ids
supabase/migrations/0001_init.sql   schéma Postgres + index + RLS + bucket photos
```

## 3. Navigation

* **Mobile** : barre du bas — Home · Nutrition · **(+)** · Workout · Progress. Le bouton central ouvre l'ajout rapide (repas, poids, séance, pas, eau, sommeil, photo). « Plus » (Calendrier, Analytics, Coach, Knowledge, Statut, Rapport, Réglages) est dans la barre du haut.
* **Desktop (≥ 1024 px)** : sidebar verticale — Dashboard, Nutrition, Workout, Progress, Calendar, Analytics, Coach IA, Knowledge, Statut, Réglages.
* **Mode focus** (`/session`) : aucune navigation, uniquement exercice / précédent / séries / timer / suivant.

## 4. Modèle de données (IndexedDB ⇄ Postgres)

Toutes les lignes : `id` (UUID), `createdAt`, `updatedAt`. Les jours sont des clés `YYYY-MM-DD` (date locale).

| Table | Contenu |
|---|---|
| `profile` | identité, objectif, cibles (kcal, macros, eau, pas, sommeil), planning hebdo, préférences |
| `foods` | aliments perso + produits Open Food Facts mis en cache (valeurs /100 g) |
| `favorites` | aliments favoris |
| `foodEntries` | journal : jour, repas, aliment, grammes, macros figées au moment de la saisie, source |
| `meals` | repas enregistrés (liste d'ingrédients) |
| `recipes` | recettes (ingrédients, portions) |
| `customExercises` | exercices perso (la bibliothèque de base est statique) |
| `routines` | modèles de séance (Push, Pull…) : exercices, séries/reps cibles, repos |
| `sessions` | séances : routine, début/fin, statut (`active`/`done`), liste ordonnée d'exercices |
| `sets` | séries : séance, exercice, charge, reps, RPE, échauffement, validée |
| `cardio` | cardio : type, durée, distance, vitesse, inclinaison, FC, kcal |
| `bodyMetrics` | 1 ligne/jour : poids, % MG, masse musculaire, eau, viscérale, tours (taille, poitrine, bras, cuisses, hanches, cou) |
| `photos` | photos de progression (Blob local), pose, poids/taille/MG associés |
| `dailyLogs` | 1 ligne/jour : pas, eau, sommeil, qualité, énergie, calories actives, note |
| `reports` | rapports hebdo générés (règles + IA optionnelle) |
| `coachMessages` | historique ARISE AI |
| `kv` | état UI persistant (dernier niveau vu, synchro…) |
| `tombstones` | suppressions à propager au cloud |

Valeurs **dérivées** (non stockées) : XP, niveau, rang, stats RPG, quêtes, score du jour, streaks, records personnels, 1RM estimé, tendance du poids, maintenance adaptative, projection.

## 5. Logique métier (`lib/domain`)

* **Énergie** : Mifflin-St Jeor (ou Katch-McArdle si % MG connu) × facteur d'activité → maintenance. Cible selon objectif : sèche ≈ −0,6 % du poids/semaine (déficit plafonné), prise de masse +250 kcal, recompo −10 %, maintien.
* **Macros** : protéines 1,8–2,2 g/kg selon objectif, lipides ~27 % (≥ 0,6 g/kg), glucides = reste, fibres 14 g/1000 kcal.
* **Nutrition Score (0–100)** : densité protéique, densité calorique, fibres, sucres, AGS, sel, niveau de transformation (NOVA), pondéré selon l'objectif. Libellés non culpabilisants : Excellent / Très bon / Correct / À doser / Plaisir occasionnel.
* **Score du jour** : calories 25 %, protéines 20 %, entraînement 20 %, pas 15 %, sommeil 10 %, hydratation 10 %. ≥ 70 = jour validé (streak).
* **XP** : quêtes (pas 80, protéines 80, calories 80, eau 50, séance prévue 120, sommeil 60) + bonus « toutes les quêtes » 200 + séance terminée 100 + PR 40 (max 3/jour) + cardio 60 + pesée 20 + paliers de streak + boss de palier 150 (boss final 300). Niveau L→L+1 : `300 + 100·L` XP. Rangs E→S.
* **Donjon de l'objectif** (`domain/bosses.ts`) : l'écart départ → objectif est découpé en 3 à 6 paliers « ronds » (0,5 / 1 / 2 / 2,5 / 5 kg…), chacun gardé par un boss. Un boss tombe le premier jour où la **moyenne 7 jours** franchit son palier (une pesée chanceuse ne suffit pas, une mauvaise ne l'annule pas).
* **Progression par série** : chaque série validée est comparée à la même série de la séance précédente (plus de charge, ou plus de reps à charge égale) → badge « ▲ +2,5 kg », effet et notification ; les records absolus déclenchent l'écran RECORD.
* **Stats RPG** : STR (séances, PR), END (cardio), ACT (pas), DISC (quêtes complètes, pesées, streak), REC (sommeil, eau), NUT (calories, protéines).
* **Tendance** : moyenne mobile 7 j + régression linéaire → kg/semaine.
* **Maintenance adaptative** : `apport moyen − Δtendance × 7700 / jours` sur 14–28 jours.
* **Projection** : rythme observé (sinon théorique) → date estimée, recalculée à chaque pesée, toujours présentée comme une estimation.
* **Force** : 1RM Epley, PR charge / reps / volume / 1RM.

## 6. États

Chaque vue gère : **chargement** (skeletons), **vide** (message + action principale), **erreur** (message + réessayer), **hors-ligne** (bannière, l'app locale continue de fonctionner).

## 7. Sécurité & confidentialité

* Données locales par défaut ; export JSON complet, import, suppression photos / historique / tout.
* Routes IA : clé côté serveur uniquement, code d'accès optionnel (`ARISE_ACCESS_CODE`), limitation de débit par IP, validation Zod des entrées et sorties.
* Supabase : RLS `user_id = auth.uid()` sur toutes les tables, bucket photos privé par dossier utilisateur.

## Ajouts : recettes, prix, IA multi-moteur

* **Recettes** (`data/recipes.ts`, `data/shop.ts`, `domain/recipes.ts`) : chaque ingrédient pointe vers un article du catalogue de courses (rayon, format, prix indicatif discount/supermarché) lui-même relié à la base nutritionnelle → macros, coût par portion et liste de courses sont **calculés**, jamais saisis. Les prix personnels de l'utilisateur (kv `shop:prices`) remplacent les prix indicatifs.
* **Prix réels** : `/api/prices?category=…` interroge Open Prices (France, 6 mois), agrège par enseigne (médiane, nb de relevés), cache 12 h.
* **IA** : `lib/ai/server.ts#pickEngine` choisit Claude ou Gemini selon les clés disponibles et la préférence ; `lib/ai/gemini.ts` appelle l'API REST (`generateContent` avec `responseJsonSchema`, `streamGenerateContent` en SSE pour le coach) et bascule de modèle sur quota (429) ou surcharge (503).
* **Mémoire des estimations** : la liste des produits (`foods` source `custom`/`ai`) et des repas enregistrés est envoyée avec la photo ; l'IA renvoie `known_id` / `known_meal_id`. Les nouveaux produits sont mémorisés (source `ai`, dédoublonnés par nom normalisé), les plats composés deviennent des « Repas ».
* **Exercices en double** : un même exercice peut apparaître plusieurs fois dans une séance ; les séries portent un `slot` (occurrence) et chaque bloc compare avec la même occurrence de la séance précédente.

