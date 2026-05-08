-- Academy Follow-up MVP seed data
-- 파일럿 화면 확인용 최소 데이터입니다. 볼륨 테스트 데이터는 supabase/seed-volume.sql을 별도로 실행합니다.

insert into public.academies (
  id,
  name,
  slug,
  plan,
  status,
  category,
  brand_color,
  naver_place_id,
  sender_name,
  sender_phone
) values (
  '11111111-1111-4111-8111-111111111111',
  '더배움프라임영수학원',
  'thebaeum-prime',
  'pilot',
  'active',
  '영어 · 수학 전문 학원',
  '#047857',
  '1298554109',
  '더배움프라임',
  null
) on conflict (slug) do update set
  name = excluded.name,
  plan = excluded.plan,
  status = excluded.status,
  category = excluded.category,
  brand_color = excluded.brand_color,
  naver_place_id = excluded.naver_place_id,
  sender_name = excluded.sender_name,
  sender_phone = excluded.sender_phone;

insert into public.academy_settings (
  academy_id,
  sms_dry_run,
  allow_assistant_send,
  duplicate_guard_minutes,
  parent_phone_masking
) values (
  '11111111-1111-4111-8111-111111111111',
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

insert into public.classes (
  id,
  academy_id,
  name,
  subject,
  grade_label
) values
  ('22222222-2222-4222-8222-222222222221', '11111111-1111-4111-8111-111111111111', '중2 수학 A반', '수학', '중2'),
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', '중3 영어 B반', '영어', '중3')
on conflict (id) do update set
  name = excluded.name,
  subject = excluded.subject,
  grade_label = excluded.grade_label;

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
) values
  ('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '김민준', '탕정중', '중2', '김민준 학부모', '01000000001', '01010000001', 'active'),
  ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '이서연', '탕정중', '중2', '이서연 학부모', '01000000002', '01010000002', 'active'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '박지호', '한들중', '중3', '박지호 학부모', '01000000003', null, 'active'),
  ('33333333-3333-4333-8333-333333333334', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '최하은', '한들중', '중3', '최하은 학부모', '01000000004', null, 'active'),
  ('33333333-3333-4333-8333-333333333335', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '정도윤', '탕정중', '중2', '정도윤 학부모', '01000000005', null, 'active'),
  ('33333333-3333-4333-8333-333333333336', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '한유진', '한들중', '중3', '한유진 학부모', '01000000006', null, 'active')
on conflict (id) do update set
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
  memo
) values
  ('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', 'regular_class', 1, '16:30', '19:00', '수학', '중2 수학 A반', '월수금 정규 수업'),
  ('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', 'regular_class', 3, '16:30', '19:00', '수학', '중2 수학 A반', '월수금 정규 수업'),
  ('44444444-4444-4444-8444-444444444443', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', 'regular_class', 5, '16:30', '19:00', '수학', '중2 수학 A반', '월수금 정규 수업'),
  ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'regular_class', 2, '20:00', '21:30', '영어', '중3 영어 B반', '화목 정규 수업'),
  ('44444444-4444-4444-8444-444444444445', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', 'regular_class', 4, '20:00', '21:30', '영어', '중3 영어 B반', '화목 정규 수업'),
  ('44444444-4444-4444-8444-444444444446', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', null, 'external', 2, '19:00', '19:50', null, '논술학원', '보강 후보에서 제외할 외부 일정')
on conflict (id) do update set
  class_id = excluded.class_id,
  schedule_type = excluded.schedule_type,
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  subject = excluded.subject,
  title = excluded.title,
  memo = excluded.memo;

insert into public.attendance_records (
  academy_id,
  student_id,
  class_id,
  attendance_date,
  scheduled_start_time,
  scheduled_end_time,
  status,
  note
) values
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', '22222222-2222-4222-8222-222222222221', (now() at time zone 'Asia/Seoul')::date, '16:30', '19:00', 'present', 'MVP seed 출석'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333332', '22222222-2222-4222-8222-222222222221', (now() at time zone 'Asia/Seoul')::date, '16:30', '19:00', 'needs_check', 'MVP seed 확인 필요'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', (now() at time zone 'Asia/Seoul')::date, '20:00', '21:30', 'absent', 'MVP seed 결석')
on conflict (
  academy_id,
  student_id,
  class_id,
  attendance_date,
  scheduled_start_time,
  scheduled_end_time
) do update set
  status = excluded.status,
  note = excluded.note,
  updated_at = now();

select
  (select count(*) from public.classes where academy_id = '11111111-1111-4111-8111-111111111111') as class_count,
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111') as student_count,
  (select count(*) from public.student_schedules where academy_id = '11111111-1111-4111-8111-111111111111') as schedule_count,
  (select count(*) from public.attendance_records where academy_id = '11111111-1111-4111-8111-111111111111') as attendance_count;
