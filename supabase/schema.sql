-- BIFROST optional sync schema.
-- Run this in the Supabase SQL editor, then add the project URL/key to Vercel.

create table if not exists public.libraries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.bookmarks (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  library_id uuid not null references public.libraries(id) on delete cascade,
  title text not null,
  base_url text not null,
  current_chapter integer not null check (current_chapter >= 1),
  total_chapters integer check (total_chapters is null or total_chapters >= current_chapter),
  category text not null,
  cover_image text,
  cover_path text,
  reminder_cadence text not null default 'none' check (reminder_cadence in ('none', 'daily', 'weekly', 'monthly')),
  reminder_created_at timestamptz,
  reminder_last_dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists libraries_user_updated_idx
  on public.libraries (user_id, updated_at desc);

create index if not exists bookmarks_user_library_updated_idx
  on public.bookmarks (user_id, library_id, updated_at desc);

create index if not exists bookmarks_library_idx
  on public.bookmarks (library_id);

alter table public.libraries enable row level security;
alter table public.bookmarks enable row level security;

drop policy if exists "Users manage their own libraries" on public.libraries;
create policy "Users manage their own libraries"
  on public.libraries
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own bookmarks" on public.bookmarks;
create policy "Users manage their own bookmarks"
  on public.bookmarks
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "Users upload their own covers" on storage.objects;
create policy "Users upload their own covers"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update their own covers" on storage.objects;
create policy "Users update their own covers"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users read covers" on storage.objects;
create policy "Users read covers"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
