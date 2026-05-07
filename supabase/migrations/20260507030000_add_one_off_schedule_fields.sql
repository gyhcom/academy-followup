-- 날짜별 1회성 보강 일정을 주간 반복 스케줄과 함께 관리합니다.
-- schedule_date가 있으면 특정 날짜 일정, 없으면 기존 주간 반복 일정입니다.

alter table public.student_schedules
  add column if not exists schedule_date date,
  add column if not exists source_followup_id uuid references public.followups(id) on delete set null;

create index if not exists student_schedules_student_date_idx
  on public.student_schedules(student_id, schedule_date, start_time)
  where is_active = true and schedule_date is not null;

create unique index if not exists student_schedules_one_off_uidx
  on public.student_schedules(
    academy_id,
    student_id,
    schedule_type,
    schedule_date,
    start_time,
    end_time
  )
  where is_active = true and schedule_date is not null;
