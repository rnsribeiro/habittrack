-- Adiciona categoria em tarefas sem tocar nos registros existentes.
-- Tarefas atuais permanecem com category = null e continuam funcionando normalmente.

alter table public.tasks
add column if not exists category text;

create index if not exists tasks_user_category_idx
on public.tasks(user_id, category);

