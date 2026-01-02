-- =========================================
-- HabitTrack - Schema inicial (Supabase)
-- =========================================

-- extensões úteis
create extension if not exists "pgcrypto";

-- =========================================
-- TABELA: habits
-- =========================================
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  title text not null,
  color text not null default '#22c55e',

  -- frequência simples (você pode evoluir depois)
  -- daily | weekdays | weekly | custom
  frequency text not null default 'daily',

  -- usado em weekly/custom (0=domingo ... 6=sábado)
  days_of_week int[],

  start_date date not null default current_date,
  end_date date,

  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint habits_title_not_empty check (char_length(trim(title)) > 0),
  constraint habits_color_format check (color ~* '^#([0-9a-f]{6})$'),
  constraint habits_frequency_valid check (frequency in ('daily','weekdays','weekly','custom')),
  constraint habits_end_after_start check (end_date is null or end_date >= start_date)
);

-- índice para listar hábitos do usuário
create index if not exists habits_user_id_idx on public.habits (user_id);

-- =========================================
-- TABELA: habit_completions
-- =========================================
create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  value int not null default 1,

  created_at timestamptz not null default now(),

  constraint habit_completions_value_positive check (value > 0)
);

-- unique para permitir toggle por (habit, date)
create unique index if not exists habit_completions_unique
  on public.habit_completions (habit_id, date);

-- índices para queries por período e por hábito
create index if not exists habit_completions_user_date_idx
  on public.habit_completions (user_id, date);

create index if not exists habit_completions_habit_date_idx
  on public.habit_completions (habit_id, date);

-- =========================================
-- UPDATED_AT automático
-- =========================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_habits_updated_at on public.habits;
create trigger set_habits_updated_at
before update on public.habits
for each row
execute function public.set_updated_at();

-- =========================================
-- RLS
-- =========================================
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

-- =========================================
-- POLICIES: habits
-- =========================================
drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own"
on public.habits
for select
using (auth.uid() = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own"
on public.habits
for insert
with check (auth.uid() = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own"
on public.habits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own"
on public.habits
for delete
using (auth.uid() = user_id);

-- =========================================
-- POLICIES: habit_completions
-- =========================================
drop policy if exists "completions_select_own" on public.habit_completions;
create policy "completions_select_own"
on public.habit_completions
for select
using (auth.uid() = user_id);

drop policy if exists "completions_insert_own" on public.habit_completions;
create policy "completions_insert_own"
on public.habit_completions
for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.habits h
    where h.id = habit_completions.habit_id
      and h.user_id = auth.uid()
  )
);

drop policy if exists "completions_delete_own" on public.habit_completions;
create policy "completions_delete_own"
on public.habit_completions
for delete
using (auth.uid() = user_id);

-- (opcional) permitir update em completions (se um dia você usar value editável)
drop policy if exists "completions_update_own" on public.habit_completions;
create policy "completions_update_own"
on public.habit_completions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =========================================
-- DICA: para facilitar inserts no front
-- você pode usar default do user_id via trigger
-- MAS aqui eu mantive explícito (mais claro).
-- =========================================
