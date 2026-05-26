-- 타 학원 수업은 기존 student_schedules.external과 분리합니다.
-- student_schedules.external은 개인/기타 일정으로 남기고,
-- 실제 타 학원 수업은 학원-수업-학생 연결 구조로 관리합니다.

create table if not exists public.external_academies (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null,
  category text,
  memo text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_academies_name_length_check check (char_length(name) between 1 and 80),
  constraint external_academies_memo_length_check check (memo is null or char_length(memo) <= 300)
);

create table if not exists public.external_academy_classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  external_academy_id uuid not null references public.external_academies(id) on delete cascade,
  title text not null,
  subject text,
  schedule_date date,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  memo text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_academy_classes_day_of_week_check check (day_of_week between 0 and 6),
  constraint external_academy_classes_time_order_check check (start_time < end_time),
  constraint external_academy_classes_title_length_check check (char_length(title) between 1 and 80),
  constraint external_academy_classes_subject_length_check check (subject is null or char_length(subject) <= 40),
  constraint external_academy_classes_memo_length_check check (memo is null or char_length(memo) <= 300)
);

create table if not exists public.student_external_class_enrollments (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  external_academy_class_id uuid not null references public.external_academy_classes(id) on delete cascade,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_academies_academy_active_idx
  on public.external_academies(academy_id, is_active);

create index if not exists external_academy_classes_academy_day_idx
  on public.external_academy_classes(academy_id, day_of_week, start_time)
  where is_active = true;

create index if not exists external_academy_classes_external_academy_idx
  on public.external_academy_classes(external_academy_id)
  where is_active = true;

create index if not exists student_external_class_enrollments_student_idx
  on public.student_external_class_enrollments(student_id)
  where is_active = true;

create index if not exists student_external_class_enrollments_class_idx
  on public.student_external_class_enrollments(external_academy_class_id)
  where is_active = true;

create unique index if not exists student_external_class_enrollments_active_uidx
  on public.student_external_class_enrollments(student_id, external_academy_class_id)
  where is_active = true;

alter table public.external_academies enable row level security;
alter table public.external_academy_classes enable row level security;
alter table public.student_external_class_enrollments enable row level security;
