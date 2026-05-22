-- 학생별 타 학원 스케줄 공유 동의 확인 상태입니다.
-- 파일럿에서는 원장이 종이 동의서 수령 여부를 수동으로 확인합니다.

alter table public.students
  add column if not exists schedule_share_consent_confirmed boolean not null default false,
  add column if not exists schedule_share_consent_confirmed_at timestamptz,
  add column if not exists schedule_share_consent_confirmed_by uuid references public.profiles(id) on delete set null;
