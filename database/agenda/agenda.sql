-- Agenda: calendar-style activities with day, week, and month views.

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  notes text,
  location text,
  category text,
  color text not null default '#22c55e',

  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  status text not null default 'planned' check (status in ('planned', 'done', 'canceled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint calendar_events_time_chk check (end_at is null or end_at > start_at)
);

create index if not exists calendar_events_user_start_idx on public.calendar_events(user_id, start_at);
create index if not exists calendar_events_user_status_idx on public.calendar_events(user_id, status);
create index if not exists calendar_events_user_category_idx on public.calendar_events(user_id, category);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
before update on public.calendar_events
for each row execute function public.set_updated_at();

alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own"
on public.calendar_events for select
using (auth.uid() = user_id);

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own"
on public.calendar_events for insert
with check (auth.uid() = user_id);

drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own"
on public.calendar_events for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own"
on public.calendar_events for delete
using (auth.uid() = user_id);
