create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text not null,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

create index if not exists audit_logs_academy_created_idx
  on public.audit_logs (academy_id, created_at desc);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (academy_id, entity_type, entity_id);
