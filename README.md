# ARISE — système de progression personnel

Application web (PWA) de suivi nutrition, musculation, cardio et composition corporelle, habillée comme une « fenêtre de statut » de chasseur : chaque habitude rapporte de l'XP, fait monter des statistiques et un rang (E → S).

Tout fonctionne **sans compte et hors ligne** : les données vivent dans le navigateur (IndexedDB). La synchronisation cloud (Supabase) et l'IA (Claude) sont optionnelles.

## Fonctionnalités

| Module | Contenu |
| --- | --- |
| **Dashboard** | **Donjon de l'objectif** (barre de progression avec boss de palier), anneau calories + macros, quêtes du jour, score quotidien, séance prévue, tendance de poids, conseil du jour, série (streak) |
| **Nutrition** | Journal par repas, base de ~180 aliments FR + Open Food Facts, **Nutrition Score contextuel** (selon ton objectif, pas « bon/mauvais »), favoris/récents, repas enregistrés, recettes, **scan code-barres**, **photo de repas → estimation IA modifiable**, copie du repas de la veille |
| **Workout** | Séances **entièrement personnalisables** (nom, icône, couleur, exercices, nombre de séries), splits prêts à l'emploi (Push/Pull 4 j, Upper/Lower, PPL…), planning de la semaine, bibliothèque de ~70 exercices **modifiables** (nom, icône, muscles, équipement, notes) + exercices perso, **mode focus** (perf précédente, minuteur de repos, effets de progression et de record), historique, e1RM |
| **Progress** | Poids + moyenne 7 jours, tendance, **maintenance adaptative**, projection de sèche, composition corporelle, mensurations, **photos avant/après** (curseur de comparaison) |
| **Système** | Statut (niveau, rang, stats STR/END/ACT/DISC/REC/NUT, succès), calendrier heatmap de discipline, analytics (corrélations), rapport hebdo (+ analyse IA), **coach ARISE AI**, Knowledge (21 fiches avec sources scientifiques) |
| **Réglages** | Profil, objectifs (auto ou manuels), quêtes, préférences (sons, vibrations, effets), clé IA, compte/sync, export JSON/CSV, import, suppression |

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
| `ANTHROPIC_API_KEY` | Active l'IA côté serveur (photo de repas, coach, rapport hebdo). Sans elle, chaque utilisateur peut saisir sa propre clé dans Réglages → IA (stockée seulement dans son navigateur). |
| `ARISE_ACCESS_CODE` | Recommandé si l'app est publique avec une clé serveur : les routes IA exigent ce code (à saisir dans Réglages → IA). |
| `ARISE_AI_MODEL` | Modèle Claude utilisé (défaut : `claude-opus-5-5`). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Active le compte et la synchronisation multi-appareils. |

> L'IA utilise le repli côté serveur de l'API Claude (`fallbacks: "default"`) : si le modèle principal refuse une requête, l'API peut la relancer automatiquement sur un modèle de secours. Les estimations restent indicatives et toujours modifiables avant validation.

## Synchronisation cloud (optionnel)

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans *SQL Editor*, exécute `supabase/migrations/0001_init.sql` (tables, RLS « chaque utilisateur ne voit que ses lignes », bucket privé `progress-photos`).
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

- Valeurs nutritionnelles de référence : tables CIQUAL (ANSES) et USDA ; produits du commerce : [Open Food Facts](https://world.openfoodfacts.org) (licence ODbL).
- Les fiches Knowledge citent leurs sources (auteurs, année, revue, type d'étude) avec un lien de recherche PubMed.
- ARISE ne fournit pas d'avis médical. Univers visuel original inspiré de l'esthétique « hunter system », sans affiliation.
