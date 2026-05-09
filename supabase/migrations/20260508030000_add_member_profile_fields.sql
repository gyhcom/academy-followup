alter table public.profiles
  add column if not exists phone text,
  add column if not exists status text not null default 'active';

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'inactive'));

create index if not exists profiles_academy_status_idx
  on public.profiles(academy_id, status);
