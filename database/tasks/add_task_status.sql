-- Adiciona status real para tarefas sem apagar nada do que ja existe.
-- Registros antigos continuam preservados.

alter table public.tasks
add column if not exists status text;

update public.tasks
set status = case
  when is_done = true then 'done'
  else 'todo'
end
where status is null;

alter table public.tasks
alter column status set default 'todo';

alter table public.tasks
alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_status_chk'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
    add constraint tasks_status_chk
    check (status in ('todo', 'in_progress', 'done'));
  end if;
end $$;

update public.tasks
set is_done = (status = 'done')
where is_done is distinct from (status = 'done');

create index if not exists tasks_user_status_idx
on public.tasks(user_id, status);
