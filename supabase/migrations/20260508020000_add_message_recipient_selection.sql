-- 문자 발송 대상을 학부모/학생/둘 다로 선택하기 위한 필드입니다.
-- 기존 데이터는 모두 학부모 발송으로 유지합니다.

alter table public.students
  add column if not exists student_phone text;

alter table public.followups
  add column if not exists recipient_type text not null default 'parent';

alter table public.message_logs
  add column if not exists recipient_type text not null default 'parent';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'followups_recipient_type_check'
  ) then
    alter table public.followups
      add constraint followups_recipient_type_check
      check (recipient_type in ('parent', 'student', 'both'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'message_logs_recipient_type_check'
  ) then
    alter table public.message_logs
      add constraint message_logs_recipient_type_check
      check (recipient_type in ('parent', 'student', 'both'));
  end if;
end $$;
