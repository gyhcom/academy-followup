-- 반별 수업 날짜/시간 기준 출석부 기록입니다.
-- 16:00 수업에서 16:10 미도착, 16:15 도착 같은 예외를 처리할 수 있게
-- 확인 필요 상태와 실제 도착 시각을 분리합니다.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'attendance_status'
      and n.nspname = 'public'
  ) then
    create type public.attendance_status as enum (
      'pending',
      'present',
      'late',
      'absent',
      'makeup',
      'excused',
      'needs_check'
    );
  end if;
end $$;

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  student_schedule_id uuid references public.student_schedules(id) on delete set null,
  attendance_date date not null,
  scheduled_start_time time not null,
  scheduled_end_time time not null,
  status public.attendance_status not null default 'pending',
  checked_at timestamptz,
  arrived_at timestamptz,
  note text,
  followup_id uuid references public.followups(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_time_order_check
    check (scheduled_start_time < scheduled_end_time),
  constraint attendance_records_note_length_check
    check (note is null or char_length(note) <= 300)
);

create unique index if not exists attendance_records_session_student_uidx
  on public.attendance_records(
    academy_id,
    student_id,
    class_id,
    attendance_date,
    scheduled_start_time,
    scheduled_end_time
  );

create index if not exists attendance_records_academy_date_idx
  on public.attendance_records(academy_id, attendance_date);

create index if not exists attendance_records_class_session_idx
  on public.attendance_records(
    academy_id,
    class_id,
    attendance_date,
    scheduled_start_time
  );

create index if not exists attendance_records_student_date_idx
  on public.attendance_records(student_id, attendance_date desc, scheduled_start_time);

create index if not exists attendance_records_teacher_date_idx
  on public.attendance_records(teacher_id, attendance_date desc)
  where teacher_id is not null;

create index if not exists attendance_records_action_status_idx
  on public.attendance_records(academy_id, attendance_date, status)
  where status in (
    'absent'::public.attendance_status,
    'late'::public.attendance_status,
    'needs_check'::public.attendance_status
  );

alter table public.attendance_records enable row level security;
