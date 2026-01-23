-- =========================
-- BOOKS
-- =========================
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  author text not null,
  cover_url text null,

  total_pages int not null check (total_pages > 0),
  current_page int not null default 0 check (current_page >= 0),

  status text not null default 'reading' check (status in ('reading','finished','abandoned')),
  started_at timestamptz null,
  finished_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists books_user_idx on public.books(user_id);
create index if not exists books_user_status_idx on public.books(user_id, status);
create index if not exists books_user_finished_at_idx on public.books(user_id, finished_at);

-- Atualiza updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_books_updated_at on public.books;
create trigger trg_books_updated_at
before update on public.books
for each row execute function public.set_updated_at();


-- =========================
-- READING SESSIONS (paginômetro)
-- =========================
create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,

  session_date date not null default (now() at time zone 'utc')::date,
  pages_read int not null check (pages_read > 0),

  created_at timestamptz not null default now()
);

create index if not exists reading_sessions_user_date_idx on public.reading_sessions(user_id, session_date);
create index if not exists reading_sessions_book_idx on public.reading_sessions(book_id);


-- =========================
-- RLS
-- =========================
alter table public.books enable row level security;
alter table public.reading_sessions enable row level security;

drop policy if exists "books_select_own" on public.books;
create policy "books_select_own"
on public.books for select
using (auth.uid() = user_id);

drop policy if exists "books_insert_own" on public.books;
create policy "books_insert_own"
on public.books for insert
with check (auth.uid() = user_id);

drop policy if exists "books_update_own" on public.books;
create policy "books_update_own"
on public.books for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "books_delete_own" on public.books;
create policy "books_delete_own"
on public.books for delete
using (auth.uid() = user_id);

drop policy if exists "sessions_select_own" on public.reading_sessions;
create policy "sessions_select_own"
on public.reading_sessions for select
using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.reading_sessions;
create policy "sessions_insert_own"
on public.reading_sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "sessions_delete_own" on public.reading_sessions;
create policy "sessions_delete_own"
on public.reading_sessions for delete
using (auth.uid() = user_id);
