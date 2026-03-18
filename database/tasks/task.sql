-- Tasks: due (data limite), scheduled (data específica), anytime (sem data)

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  notes text,
  category text,

  task_type text not null check (task_type in ('due', 'scheduled', 'anytime')),

  -- "data limite" (só para due)
  due_date date,

  -- "data específica" (só para scheduled)
  scheduled_at timestamptz,

  is_done boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- garante coerência do tipo com os campos de data
  constraint tasks_type_dates_chk check (
    (task_type = 'due' and due_date is not null and scheduled_at is null)
    or (task_type = 'scheduled' and scheduled_at is not null and due_date is null)
    or (task_type = 'anytime' and due_date is null and scheduled_at is null)
  )
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_done_idx on public.tasks(user_id, is_done);
create index if not exists tasks_user_type_idx on public.tasks(user_id, task_type);
create index if not exists tasks_due_date_idx on public.tasks(user_id, due_date);
create index if not exists tasks_scheduled_at_idx on public.tasks(user_id, scheduled_at);
create index if not exists tasks_user_category_idx on public.tasks(user_id, category);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks for select
using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks for insert
with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks for delete
using (auth.uid() = user_id);
