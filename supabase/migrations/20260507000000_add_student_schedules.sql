-- 학생별 주간 반복 스케줄입니다.
-- 정규 수업, 보강, 외부 일정, 상담 시간을 같은 구조로 저장합니다.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'student_schedule_type'
      and n.nspname = 'public'
  ) then
    create type public.student_schedule_type as enum (
      'regular_class',
      'makeup',
      'external',
      'consultation'
    );
  end if;
end $$;

create table if not exists public.student_schedules (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  schedule_type public.student_schedule_type not null default 'regular_class',
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  subject text,
  title text not null,
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_schedules_day_of_week_check check (day_of_week between 0 and 6),
  constraint student_schedules_time_order_check check (start_time < end_time)
);

create index if not exists student_schedules_academy_id_idx
  on public.student_schedules(academy_id);

create index if not exists student_schedules_student_day_idx
  on public.student_schedules(student_id, day_of_week, start_time)
  where is_active = true;

create index if not exists student_schedules_academy_day_idx
  on public.student_schedules(academy_id, day_of_week, start_time)
  where is_active = true;

create index if not exists student_schedules_class_id_idx
  on public.student_schedules(class_id)
  where class_id is not null;

create index if not exists student_schedules_teacher_id_idx
  on public.student_schedules(teacher_id)
  where teacher_id is not null;

alter table public.student_schedules enable row level security;
