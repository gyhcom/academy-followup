-- Academy Follow-up initial schema
-- 한국 학원용 멀티테넌트 SaaS 구조를 전제로 합니다.

create extension if not exists pgcrypto;

create type public.academy_role as enum ('owner', 'manager', 'teacher', 'assistant');
create type public.followup_reason as enum (
  'absence',
  'late',
  'homework_missing',
  'retest',
  'materials_missing',
  'class_attitude',
  'consultation'
);
create type public.followup_status as enum ('draft', 'sent', 'failed');

create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sender_name text,
  sender_phone text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  academy_id uuid not null references public.academies(id) on delete cascade,
  email text not null,
  name text not null,
  role public.academy_role not null default 'teacher',
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null,
  subject text,
  grade_label text,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  name text not null,
  school_name text,
  grade_label text,
  parent_name text,
  parent_phone text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  reason public.followup_reason not null,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.followups (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  reason public.followup_reason not null,
  message_body text not null,
  status public.followup_status not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.message_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  followup_id uuid references public.followups(id) on delete set null,
  provider text not null default 'solapi',
  provider_message_id text,
  recipient_phone text not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index classes_academy_id_idx on public.classes(academy_id);
create index students_academy_id_idx on public.students(academy_id);
create index students_class_id_idx on public.students(class_id);
create index followups_academy_id_idx on public.followups(academy_id);
create index followups_student_id_idx on public.followups(student_id);
create index message_logs_academy_id_idx on public.message_logs(academy_id);

alter table public.academies enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.message_templates enable row level security;
alter table public.followups enable row level security;
alter table public.message_logs enable row level security;

-- RLS policies는 인증/초대 플로우를 구현하면서 academy_id 기준으로 추가합니다.
