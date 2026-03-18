-- Adiciona um status explicito para as marcacoes de habitos.
-- Registros antigos continuam preservados e passam a ser tratados como "done".

alter table public.habit_completions
add column if not exists status text not null default 'done';

alter table public.habit_completions
drop constraint if exists habit_completions_status_valid;

alter table public.habit_completions
add constraint habit_completions_status_valid
check (status in ('done', 'partial', 'missed'));

create index if not exists habit_completions_user_date_status_idx
on public.habit_completions(user_id, date, status);

