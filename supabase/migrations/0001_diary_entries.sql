-- Create ENUM for diary status
do $$
begin
  if not exists (select 1 from pg_type where typname = 'diary_status') then
    create type diary_status as enum ('draft', 'published');
  end if;
end $$;

-- Create diary_entries table
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title varchar(100) not null,
  content text not null check (char_length(content) <= 2000),
  category varchar(50),
  tags text[] default '{}' check (cardinality(tags) <= 5),
  image_url text,
  status diary_status not null default 'draft',
  is_public boolean not null default false,
  scheduled_publish_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Indexes for faster queries
create index if not exists idx_diary_entries_user_status on public.diary_entries (user_id, status);
create index if not exists idx_diary_entries_public on public.diary_entries (is_public, status) where status = 'published';

-- Enable Row Level Security
alter table public.diary_entries enable row level security;

-- Policy: owner can manage their entries
drop policy if exists "diary_owner_rw" on public.diary_entries;
create policy "diary_owner_rw"
  on public.diary_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: anyone can read published public entries
drop policy if exists "diary_public_read" on public.diary_entries;
create policy "diary_public_read"
  on public.diary_entries
  for select
  using (status = 'published' and is_public = true);

-- Trigger to update updated_at
drop trigger if exists set_diary_updated_at on public.diary_entries;
drop function if exists public.set_updated_at();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger set_diary_updated_at
  before update on public.diary_entries
  for each row
  execute function public.set_updated_at();
