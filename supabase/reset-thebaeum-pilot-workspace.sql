-- Academy Follow-up Thebaeum pilot workspace reset
-- 목적: 더배움프라임영수학원 파일럿/시연 워크스페이스의 학생/반/출석/연락 데이터를 비웁니다.
-- 이후 supabase/seed-pilot-200-students.sql 전체를 다시 실행하면 10개 주요 반 x 20명 기준으로 재생성됩니다.
--
-- 보존 대상:
-- - auth.users
-- - profiles
-- - academies의 더배움 학원 row
-- - academy_settings
-- - message_templates
-- - platform_admins
--
-- 삭제 대상:
-- - 더배움 학원 소속 학생/반/스케줄
-- - 출석 기록
-- - 연락 기록/followups
-- - message_logs
-- - 공유 링크/공유 토큰
-- - 수동 타 학원 수업
-- - seed 공유 학원
-- - 더배움 학원 audit logs
--
-- 주의: 실제 개인정보가 들어간 운영 DB에서는 실행하지 마세요.
-- 실행 순서:
-- 1. Preview SQL 실행
-- 2. Cleanup SQL 실행
-- 3. Verify SQL 실행
-- 4. supabase/seed-pilot-200-students.sql 전체 실행
-- 5. seed 파일 마지막 count와 앱 화면에서 학생 200명, 주요 반 20명 기준 확인

-- 1. Preview SQL: 삭제될 데이터 수만 확인합니다.
with
target_academy as (
  select '11111111-1111-4111-8111-111111111111'::uuid as id
),
target_students as (
  select id from public.students where academy_id = (select id from target_academy)
),
target_classes as (
  select id from public.classes where academy_id = (select id from target_academy)
),
target_followups as (
  select id from public.followups where academy_id = (select id from target_academy)
),
seed_shared_academies as (
  select md5('pilot-200-shared-academy-' || seq_value::text)::uuid as id
  from generate_series(1, 3) as seqs(seq_value)
)
select
  (select count(*) from public.students where academy_id = (select id from target_academy)) as delete_students,
  (select count(*) from public.classes where academy_id = (select id from target_academy)) as delete_classes,
  (select count(*) from public.student_schedules where academy_id = (select id from target_academy) or student_id in (select id from target_students) or class_id in (select id from target_classes)) as delete_student_schedules,
  (select count(*) from public.attendance_records where academy_id = (select id from target_academy) or student_id in (select id from target_students) or class_id in (select id from target_classes)) as delete_attendance_records,
  (select count(*) from public.followups where academy_id = (select id from target_academy) or student_id in (select id from target_students) or class_id in (select id from target_classes)) as delete_followups,
  (select count(*) from public.message_logs where academy_id = (select id from target_academy) or followup_id in (select id from target_followups)) as delete_message_logs,
  (select count(*) from public.student_share_tokens where academy_id = (select id from target_academy) or student_id in (select id from target_students)) as delete_share_tokens,
  (select count(*) from public.student_schedule_links where source_academy_id = (select id from target_academy) or source_student_id in (select id from target_students) or target_student_id in (select id from target_students) or target_academy_id in (select id from seed_shared_academies)) as delete_schedule_links,
  (select count(*) from public.student_external_class_enrollments where academy_id = (select id from target_academy) or student_id in (select id from target_students)) as delete_external_enrollments,
  (select count(*) from public.external_academy_classes where academy_id = (select id from target_academy)) as delete_external_classes,
  (select count(*) from public.external_academies where academy_id = (select id from target_academy)) as delete_external_academies,
  (select count(*) from public.academies where id in (select id from seed_shared_academies)) as delete_seed_shared_academies,
  (select count(*) from public.audit_logs where academy_id = (select id from target_academy)) as delete_audit_logs,
  (select count(*) from public.profiles where academy_id = (select id from target_academy)) as keep_profiles,
  (select count(*) from public.academy_settings where academy_id = (select id from target_academy)) as keep_academy_settings,
  (select count(*) from public.message_templates where academy_id = (select id from target_academy)) as keep_message_templates;

-- 2. Cleanup SQL: 더배움 학원의 운영 데이터를 비웁니다.
do $$
declare
  target_academy uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  target_student_ids uuid[];
  target_class_ids uuid[];
  target_followup_ids uuid[];
  seed_shared_academy_ids uuid[];
begin
  select coalesce(array_agg(id), array[]::uuid[])
  into target_student_ids
  from public.students
  where academy_id = target_academy;

  select coalesce(array_agg(id), array[]::uuid[])
  into target_class_ids
  from public.classes
  where academy_id = target_academy;

  select coalesce(array_agg(id), array[]::uuid[])
  into target_followup_ids
  from public.followups
  where academy_id = target_academy
     or student_id = any(target_student_ids)
     or class_id = any(target_class_ids);

  select coalesce(array_agg(md5('pilot-200-shared-academy-' || seq_value::text)::uuid), array[]::uuid[])
  into seed_shared_academy_ids
  from generate_series(1, 3) as seqs(seq_value);

  raise notice 'reset students %, classes %, followups %',
    coalesce(array_length(target_student_ids, 1), 0),
    coalesce(array_length(target_class_ids, 1), 0),
    coalesce(array_length(target_followup_ids, 1), 0);

  delete from public.message_logs
  where academy_id = target_academy
     or followup_id = any(target_followup_ids)
     or provider_message_id like 'pilot-200-%'
     or provider_message_id like 'demo-operations-%'
     or provider_message_id like 'pilot-volume-%';

  update public.attendance_records
  set followup_id = null,
      updated_at = now()
  where followup_id = any(target_followup_ids);

  delete from public.attendance_records
  where academy_id = target_academy
     or student_id = any(target_student_ids)
     or class_id = any(target_class_ids);

  delete from public.student_share_tokens
  where academy_id = target_academy
     or student_id = any(target_student_ids);

  delete from public.student_schedule_links
  where source_academy_id = target_academy
     or source_student_id = any(target_student_ids)
     or target_student_id = any(target_student_ids)
     or target_academy_id = any(seed_shared_academy_ids)
     or source_academy_id = any(seed_shared_academy_ids);

  delete from public.student_external_class_enrollments
  where academy_id = target_academy
     or student_id = any(target_student_ids);

  delete from public.student_schedules
  where academy_id = target_academy
     or student_id = any(target_student_ids)
     or class_id = any(target_class_ids);

  delete from public.followups
  where id = any(target_followup_ids);

  delete from public.external_academy_classes
  where academy_id = target_academy;

  delete from public.external_academies
  where academy_id = target_academy;

  delete from public.students
  where id = any(target_student_ids);

  delete from public.classes
  where id = any(target_class_ids);

  delete from public.audit_logs
  where academy_id = target_academy;

  delete from public.academies
  where id = any(seed_shared_academy_ids);

  raise notice 'thebaeum pilot workspace reset completed';
end $$;

-- 3. Verify SQL: 운영 데이터가 비워지고 계정/설정/템플릿은 남았는지 확인합니다.
select
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111') as students_after_reset,
  (select count(*) from public.classes where academy_id = '11111111-1111-4111-8111-111111111111') as classes_after_reset,
  (select count(*) from public.student_schedules where academy_id = '11111111-1111-4111-8111-111111111111') as schedules_after_reset,
  (select count(*) from public.attendance_records where academy_id = '11111111-1111-4111-8111-111111111111') as attendance_after_reset,
  (select count(*) from public.followups where academy_id = '11111111-1111-4111-8111-111111111111') as followups_after_reset,
  (select count(*) from public.message_logs where academy_id = '11111111-1111-4111-8111-111111111111') as message_logs_after_reset,
  (select count(*) from public.profiles where academy_id = '11111111-1111-4111-8111-111111111111') as keep_profiles,
  (select count(*) from public.academy_settings where academy_id = '11111111-1111-4111-8111-111111111111') as keep_academy_settings,
  (select count(*) from public.message_templates where academy_id = '11111111-1111-4111-8111-111111111111') as keep_message_templates;
