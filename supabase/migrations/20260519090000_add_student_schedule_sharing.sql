-- 학원 간 학생 스케줄 공유를 위한 파일럿 모델입니다.
-- 전화번호 기반 검색 없이, 원장이 보호자 동의를 수동 확인한 뒤 공유 코드로 학생끼리 연결합니다.

create table if not exists public.student_share_tokens (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'active',
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_share_tokens_status_check check (status in ('active', 'used', 'revoked', 'expired'))
);

create index if not exists student_share_tokens_student_idx
  on public.student_share_tokens(academy_id, student_id, created_at desc);

create index if not exists student_share_tokens_active_hash_idx
  on public.student_share_tokens(token_hash)
  where status = 'active';

alter table public.student_share_tokens enable row level security;

create table if not exists public.student_schedule_links (
  id uuid primary key default gen_random_uuid(),
  source_academy_id uuid not null references public.academies(id) on delete cascade,
  source_student_id uuid not null references public.students(id) on delete cascade,
  target_academy_id uuid not null references public.academies(id) on delete cascade,
  target_student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'active',
  consent_method text not null default 'manual',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  constraint student_schedule_links_status_check check (status in ('active', 'revoked')),
  constraint student_schedule_links_consent_check check (consent_method in ('manual')),
  constraint student_schedule_links_not_self_check check (source_student_id <> target_student_id)
);

create unique index if not exists student_schedule_links_active_pair_uidx
  on public.student_schedule_links(
    least(source_student_id::text, target_student_id::text),
    greatest(source_student_id::text, target_student_id::text)
  )
  where status = 'active';

create index if not exists student_schedule_links_source_idx
  on public.student_schedule_links(source_academy_id, source_student_id)
  where status = 'active';

create index if not exists student_schedule_links_target_idx
  on public.student_schedule_links(target_academy_id, target_student_id)
  where status = 'active';

alter table public.student_schedule_links enable row level security;
