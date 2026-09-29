-- ARISE — schéma Supabase (Postgres)
-- Synchronisation local-first : l'application garde une copie complète en IndexedDB.
-- Chaque table stocke la ligne complète dans `data` (jsonb) + des colonnes typées
-- indexées pour les requêtes. XP, niveaux, quêtes, scores et records sont DÉRIVÉS
-- des données côté client (jamais stockés), ce qui évite toute incohérence.
--
-- Conventions communes :
--   user_id     propriétaire (auth.users), clé primaire composite (user_id, id)
--   id          identifiant UUID généré côté client
--   updated_at  horodatage client de la dernière modification (résolution de conflits)
--   deleted_at  suppression logique propagée entre appareils
--   synced_at   horodatage serveur (trigger) utilisé comme curseur de synchronisation

create or replace function public.arise_set_synced_at() returns trigger
language plpgsql as $$
begin
  new.synced_at := now();
  return new;
end;
$$;

-- Profil, objectifs, cibles quotidiennes, planning (data.targets, data.schedule)
create table if not exists public.profiles (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text,
  goal text,
  start_weight_kg numeric,
  target_weight_kg numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists profiles_sync_idx on public.profiles (user_id, synced_at);
drop trigger if exists profiles_synced_at on public.profiles;
create trigger profiles_synced_at before insert or update on public.profiles
  for each row execute function public.arise_set_synced_at();
alter table public.profiles enable row level security;
drop policy if exists "profiles_owner" on public.profiles;
create policy "profiles_owner" on public.profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Aliments personnalisés et produits Open Food Facts mis en cache (valeurs /100 g dans data)
create table if not exists public.foods (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text,
  brand text,
  barcode text,
  source text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists foods_sync_idx on public.foods (user_id, synced_at);
drop trigger if exists foods_synced_at on public.foods;
create trigger foods_synced_at before insert or update on public.foods
  for each row execute function public.arise_set_synced_at();
alter table public.foods enable row level security;
drop policy if exists "foods_owner" on public.foods;
create policy "foods_owner" on public.foods
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Aliments favoris
create table if not exists public.favorites (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  food_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists favorites_sync_idx on public.favorites (user_id, synced_at);
create index if not exists favorites_food_id_idx on public.favorites (user_id, food_id);
drop trigger if exists favorites_synced_at on public.favorites;
create trigger favorites_synced_at before insert or update on public.favorites
  for each row execute function public.arise_set_synced_at();
alter table public.favorites enable row level security;
drop policy if exists "favorites_owner" on public.favorites;
create policy "favorites_owner" on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Journal alimentaire (macros figées au moment de la saisie)
create table if not exists public.food_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date,
  meal text,
  food_id text,
  name text,
  grams numeric,
  kcal numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists food_entries_sync_idx on public.food_entries (user_id, synced_at);
create index if not exists food_entries_date_idx on public.food_entries (user_id, date);
create index if not exists food_entries_food_id_idx on public.food_entries (user_id, food_id);
drop trigger if exists food_entries_synced_at on public.food_entries;
create trigger food_entries_synced_at before insert or update on public.food_entries
  for each row execute function public.arise_set_synced_at();
alter table public.food_entries enable row level security;
drop policy if exists "food_entries_owner" on public.food_entries;
create policy "food_entries_owner" on public.food_entries
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Repas enregistrés (data.items = ingrédients)
create table if not exists public.meals (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists meals_sync_idx on public.meals (user_id, synced_at);
drop trigger if exists meals_synced_at on public.meals;
create trigger meals_synced_at before insert or update on public.meals
  for each row execute function public.arise_set_synced_at();
alter table public.meals enable row level security;
drop policy if exists "meals_owner" on public.meals;
create policy "meals_owner" on public.meals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Recettes (data.items = recipe_ingredients, data.servings)
create table if not exists public.recipes (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text,
  servings numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists recipes_sync_idx on public.recipes (user_id, synced_at);
drop trigger if exists recipes_synced_at on public.recipes;
create trigger recipes_synced_at before insert or update on public.recipes
  for each row execute function public.arise_set_synced_at();
alter table public.recipes enable row level security;
drop policy if exists "recipes_owner" on public.recipes;
create policy "recipes_owner" on public.recipes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Exercices créés par l'utilisateur
create table if not exists public.custom_exercises (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text,
  primary_muscle text,
  equipment text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists custom_exercises_sync_idx on public.custom_exercises (user_id, synced_at);
drop trigger if exists custom_exercises_synced_at on public.custom_exercises;
create trigger custom_exercises_synced_at before insert or update on public.custom_exercises
  for each row execute function public.arise_set_synced_at();
alter table public.custom_exercises enable row level security;
drop policy if exists "custom_exercises_owner" on public.custom_exercises;
create policy "custom_exercises_owner" on public.custom_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Programmes / modèles de séance (data.exercises)
create table if not exists public.routines (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text,
  type text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists routines_sync_idx on public.routines (user_id, synced_at);
drop trigger if exists routines_synced_at on public.routines;
create trigger routines_synced_at before insert or update on public.routines
  for each row execute function public.arise_set_synced_at();
alter table public.routines enable row level security;
drop policy if exists "routines_owner" on public.routines;
create policy "routines_owner" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Séances d'entraînement (workout_sessions)
create table if not exists public.sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date,
  routine_id text,
  name text,
  type text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists sessions_sync_idx on public.sessions (user_id, synced_at);
create index if not exists sessions_date_idx on public.sessions (user_id, date);
create index if not exists sessions_routine_id_idx on public.sessions (user_id, routine_id);
drop trigger if exists sessions_synced_at on public.sessions;
create trigger sessions_synced_at before insert or update on public.sessions
  for each row execute function public.arise_set_synced_at();
alter table public.sessions enable row level security;
drop policy if exists "sessions_owner" on public.sessions;
create policy "sessions_owner" on public.sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Séries (exercise_sets) — relation logique : session_id -> sessions.id
create table if not exists public.workout_sets (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  session_id text,
  exercise_id text,
  date date,
  set_order integer,
  weight_kg numeric,
  reps integer,
  rpe numeric,
  warmup boolean,
  done boolean,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists workout_sets_sync_idx on public.workout_sets (user_id, synced_at);
create index if not exists workout_sets_date_idx on public.workout_sets (user_id, date);
create index if not exists workout_sets_session_id_idx on public.workout_sets (user_id, session_id);
create index if not exists workout_sets_exercise_id_idx on public.workout_sets (user_id, exercise_id);
drop trigger if exists workout_sets_synced_at on public.workout_sets;
create trigger workout_sets_synced_at before insert or update on public.workout_sets
  for each row execute function public.arise_set_synced_at();
alter table public.workout_sets enable row level security;
drop policy if exists "workout_sets_owner" on public.workout_sets;
create policy "workout_sets_owner" on public.workout_sets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Séances de cardio
create table if not exists public.cardio_sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date,
  type text,
  duration_min numeric,
  distance_km numeric,
  kcal numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists cardio_sessions_sync_idx on public.cardio_sessions (user_id, synced_at);
create index if not exists cardio_sessions_date_idx on public.cardio_sessions (user_id, date);
drop trigger if exists cardio_sessions_synced_at on public.cardio_sessions;
create trigger cardio_sessions_synced_at before insert or update on public.cardio_sessions
  for each row execute function public.arise_set_synced_at();
alter table public.cardio_sessions enable row level security;
drop policy if exists "cardio_sessions_owner" on public.cardio_sessions;
create policy "cardio_sessions_owner" on public.cardio_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Poids, composition corporelle et mensurations (1 ligne / jour)
create table if not exists public.body_measurements (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date,
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_kg numeric,
  waist_cm numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists body_measurements_sync_idx on public.body_measurements (user_id, synced_at);
create index if not exists body_measurements_date_idx on public.body_measurements (user_id, date);
drop trigger if exists body_measurements_synced_at on public.body_measurements;
create trigger body_measurements_synced_at before insert or update on public.body_measurements
  for each row execute function public.arise_set_synced_at();
alter table public.body_measurements enable row level security;
drop policy if exists "body_measurements_owner" on public.body_measurements;
create policy "body_measurements_owner" on public.body_measurements
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Photos de progression (fichiers dans le bucket privé progress-photos)
create table if not exists public.progress_photos (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date,
  pose text,
  storage_path text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists progress_photos_sync_idx on public.progress_photos (user_id, synced_at);
create index if not exists progress_photos_date_idx on public.progress_photos (user_id, date);
drop trigger if exists progress_photos_synced_at on public.progress_photos;
create trigger progress_photos_synced_at before insert or update on public.progress_photos
  for each row execute function public.arise_set_synced_at();
alter table public.progress_photos enable row level security;
drop policy if exists "progress_photos_owner" on public.progress_photos;
create policy "progress_photos_owner" on public.progress_photos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Pas, eau, sommeil, énergie (1 ligne / jour)
create table if not exists public.daily_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  date date,
  steps integer,
  water_ml integer,
  sleep_min integer,
  energy numeric,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists daily_logs_sync_idx on public.daily_logs (user_id, synced_at);
create index if not exists daily_logs_date_idx on public.daily_logs (user_id, date);
drop trigger if exists daily_logs_synced_at on public.daily_logs;
create trigger daily_logs_synced_at before insert or update on public.daily_logs
  for each row execute function public.arise_set_synced_at();
alter table public.daily_logs enable row level security;
drop policy if exists "daily_logs_owner" on public.daily_logs;
create policy "daily_logs_owner" on public.daily_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Rapports hebdomadaires (analyse IA dans data.aiText)
create table if not exists public.weekly_reports (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  week_start date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists weekly_reports_sync_idx on public.weekly_reports (user_id, synced_at);
drop trigger if exists weekly_reports_synced_at on public.weekly_reports;
create trigger weekly_reports_synced_at before insert or update on public.weekly_reports
  for each row execute function public.arise_set_synced_at();
alter table public.weekly_reports enable row level security;
drop policy if exists "weekly_reports_owner" on public.weekly_reports;
create policy "weekly_reports_owner" on public.weekly_reports
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Historique du coach ARISE AI
create table if not exists public.coach_messages (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  role text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists coach_messages_sync_idx on public.coach_messages (user_id, synced_at);
drop trigger if exists coach_messages_synced_at on public.coach_messages;
create trigger coach_messages_synced_at before insert or update on public.coach_messages
  for each row execute function public.arise_set_synced_at();
alter table public.coach_messages enable row level security;
drop policy if exists "coach_messages_owner" on public.coach_messages;
create policy "coach_messages_owner" on public.coach_messages
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Photos : bucket privé, un dossier par utilisateur ({user_id}/{photo_id}.jpg)
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "progress_photos_owner_select" on storage.objects;
create policy "progress_photos_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "progress_photos_owner_insert" on storage.objects;
create policy "progress_photos_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "progress_photos_owner_update" on storage.objects;
create policy "progress_photos_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "progress_photos_owner_delete" on storage.objects;
create policy "progress_photos_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
