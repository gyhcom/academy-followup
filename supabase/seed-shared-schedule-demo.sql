-- Academy Follow-up shared schedule demo seed data
-- 학원 간 학생 스케줄 공유 기능을 확인하기 위한 타 학원 더미 데이터입니다.
--
-- 실행 전 Supabase Dashboard > Authentication > Users에서 아래 사용자를 먼저 만듭니다.
-- email: other-owner@test.com
-- password: 1234
--
-- 이 seed는 auth.users의 해당 이메일을 찾아 다솜수학학원 owner profile로 연결합니다.

do $$
declare
  other_owner_id uuid;
begin
  select id
  into other_owner_id
  from auth.users
  where lower(email) = 'other-owner@test.com'
  limit 1;

  if other_owner_id is null then
    raise exception 'other-owner@test.com Auth 사용자를 먼저 Supabase Authentication에서 생성해 주세요.';
  end if;

  insert into public.academies (
    id,
    name,
    slug,
    plan,
    status,
    category,
    brand_color,
    sender_name,
    sender_phone,
    owner_user_id
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '다솜수학학원',
    'dasom-math-demo',
    'pilot',
    'active',
    '수학 · 논술 보강 확인용 학원',
    '#315C7C',
    '다솜수학',
    null,
    other_owner_id
  ) on conflict (slug) do update set
    name = excluded.name,
    plan = excluded.plan,
    status = excluded.status,
    category = excluded.category,
    brand_color = excluded.brand_color,
    sender_name = excluded.sender_name,
    sender_phone = excluded.sender_phone,
    owner_user_id = excluded.owner_user_id;

  insert into public.academy_settings (
    academy_id,
    sms_dry_run,
    allow_assistant_send,
    duplicate_guard_minutes,
    parent_phone_masking
  ) values (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    true,
    false,
    1440,
    true
  ) on conflict (academy_id) do update set
    sms_dry_run = excluded.sms_dry_run,
    allow_assistant_send = excluded.allow_assistant_send,
    duplicate_guard_minutes = excluded.duplicate_guard_minutes,
    parent_phone_masking = excluded.parent_phone_masking,
    updated_at = now();

  insert into public.profiles (
    id,
    academy_id,
    email,
    name,
    role,
    status,
    phone
  ) values (
    other_owner_id,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'other-owner@test.com',
    '다솜 원장',
    'owner',
    'active',
    null
  ) on conflict (id) do update set
    academy_id = excluded.academy_id,
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    status = excluded.status,
    phone = excluded.phone;
end $$;

insert into public.classes (
  id,
  academy_id,
  name,
  subject,
  grade_label,
  teacher_id
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '중2 논술 보강 확인반',
  '논술',
  '중2',
  null
) on conflict (id) do update set
  academy_id = excluded.academy_id,
  name = excluded.name,
  subject = excluded.subject,
  grade_label = excluded.grade_label,
  teacher_id = excluded.teacher_id;

insert into public.students (
  id,
  academy_id,
  class_id,
  name,
  school_name,
  grade_label,
  parent_name,
  parent_phone,
  student_phone,
  status
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '김민준',
  '탕정중',
  '중2',
  '김민준 학부모',
  '01077770001',
  '01077771001',
  'active'
) on conflict (id) do update set
  academy_id = excluded.academy_id,
  class_id = excluded.class_id,
  name = excluded.name,
  school_name = excluded.school_name,
  grade_label = excluded.grade_label,
  parent_name = excluded.parent_name,
  parent_phone = excluded.parent_phone,
  student_phone = excluded.student_phone,
  status = excluded.status;

insert into public.student_schedules (
  id,
  academy_id,
  student_id,
  class_id,
  schedule_type,
  day_of_week,
  start_time,
  end_time,
  subject,
  title,
  memo,
  is_active
) values
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd01',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'regular_class',
    2,
    '19:30',
    '20:30',
    '논술',
    '논술학원',
    '공유 테스트: 화요일 타 학원 일정',
    true
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddd02',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'regular_class',
    4,
    '19:30',
    '20:30',
    '논술',
    '논술학원',
    '공유 테스트: 목요일 타 학원 일정',
    true
  )
on conflict (id) do update set
  academy_id = excluded.academy_id,
  student_id = excluded.student_id,
  class_id = excluded.class_id,
  schedule_type = excluded.schedule_type,
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  subject = excluded.subject,
  title = excluded.title,
  memo = excluded.memo,
  is_active = excluded.is_active,
  updated_at = now();

select
  (select count(*) from public.academies where slug = 'dasom-math-demo') as academy_count,
  (select count(*) from public.profiles where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and email = 'other-owner@test.com') as owner_profile_count,
  (select count(*) from public.classes where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') as class_count,
  (select count(*) from public.students where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') as student_count,
  (select count(*) from public.student_schedules where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and is_active = true) as schedule_count;

-- 정리 SQL이 필요하면 아래를 검토 후 별도 실행합니다.
--
-- delete from public.student_schedule_links
-- where source_academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
--    or target_academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
--
-- delete from public.student_share_tokens
-- where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
--
-- delete from public.student_schedules
-- where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
--
-- delete from public.students
-- where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
--
-- delete from public.classes
-- where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
--
-- delete from public.profiles
-- where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
--   and email = 'other-owner@test.com';
--
-- delete from public.academy_settings
-- where academy_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
--
-- delete from public.academies
-- where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
