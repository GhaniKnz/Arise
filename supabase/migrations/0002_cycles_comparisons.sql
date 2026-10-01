-- ARISE — cycles (sèche, prise de masse, maintien…) et galerie avant/après.
-- À exécuter après 0001_init.sql. Mêmes conventions : ligne complète dans `data`,
-- colonnes typées pour les requêtes, RLS « chaque utilisateur ne voit que ses lignes ».
-- Les fichiers audio importés restent sur l'appareil (jamais synchronisés).

-- Cycles nutritionnels : objectif, dates, poids de départ / cible (data)
create table if not exists public.goal_cycles (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  goal text,
  start_date date,
  end_date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists goal_cycles_sync_idx on public.goal_cycles (user_id, synced_at);
create index if not exists goal_cycles_start_idx on public.goal_cycles (user_id, start_date);
drop trigger if exists goal_cycles_synced_at on public.goal_cycles;
create trigger goal_cycles_synced_at before insert or update on public.goal_cycles
  for each row execute function public.arise_set_synced_at();
alter table public.goal_cycles enable row level security;
drop policy if exists "goal_cycles_owner" on public.goal_cycles;
create policy "goal_cycles_owner" on public.goal_cycles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Comparaisons avant / après enregistrées (paires de photos)
create table if not exists public.photo_comparisons (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  before_id text,
  after_id text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists photo_comparisons_sync_idx on public.photo_comparisons (user_id, synced_at);
drop trigger if exists photo_comparisons_synced_at on public.photo_comparisons;
create trigger photo_comparisons_synced_at before insert or update on public.photo_comparisons
  for each row execute function public.arise_set_synced_at();
alter table public.photo_comparisons enable row level security;
drop policy if exists "photo_comparisons_owner" on public.photo_comparisons;
create policy "photo_comparisons_owner" on public.photo_comparisons
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
