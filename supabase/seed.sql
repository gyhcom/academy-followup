-- Academy Follow-up pilot seed data
-- 개발/파일럿 DB에서 더배움프라임영수학원 화면을 실제 DB 기반으로 확인하기 위한 샘플입니다.
-- 지금 단계에서는 화면 검증이 우선이므로 기본 샘플과 볼륨 테스트 데이터를 한 번에 넣습니다.

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
  sender_name = excluded.sender_name;

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
  ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', '중3 영어 B반', '영어', '중3'),
  ('22222222-2222-4222-8222-222222222223', '11111111-1111-4111-8111-111111111111', '중1 영어 A반', '영어', '중1'),
  ('22222222-2222-4222-8222-222222222224', '11111111-1111-4111-8111-111111111111', '중1 수학 B반', '수학', '중1'),
  ('22222222-2222-4222-8222-222222222225', '11111111-1111-4111-8111-111111111111', '중3 수학 심화반', '수학', '중3'),
  ('22222222-2222-4222-8222-222222222226', '11111111-1111-4111-8111-111111111111', '고1 영어 내신반', '영어', '고1')
on conflict (id) do update set
  name = excluded.name,
  subject = excluded.subject,
  grade_label = excluded.grade_label;

drop table if exists public.seed_pilot_volume_students;

create table public.seed_pilot_volume_students (
  seq integer primary key,
  id uuid not null,
  class_id uuid not null,
  name text not null,
  school_name text not null,
  grade_label text not null
);

alter table public.seed_pilot_volume_students enable row level security;

insert into public.seed_pilot_volume_students (
  seq,
  id,
  class_id,
  name,
  school_name,
  grade_label
) values
  (1, '33333333-3333-4333-8333-333333333401', '22222222-2222-4222-8222-222222222221', '강도윤', '탕정중', '중2'),
  (2, '33333333-3333-4333-8333-333333333402', '22222222-2222-4222-8222-222222222221', '권서준', '탕정중', '중2'),
  (3, '33333333-3333-4333-8333-333333333403', '22222222-2222-4222-8222-222222222221', '김나은', '탕정중', '중2'),
  (4, '33333333-3333-4333-8333-333333333404', '22222222-2222-4222-8222-222222222221', '김도현', '한들중', '중2'),
  (5, '33333333-3333-4333-8333-333333333405', '22222222-2222-4222-8222-222222222221', '박서윤', '한들중', '중2'),
  (6, '33333333-3333-4333-8333-333333333406', '22222222-2222-4222-8222-222222222221', '박시우', '탕정중', '중2'),
  (7, '33333333-3333-4333-8333-333333333407', '22222222-2222-4222-8222-222222222221', '이하린', '탕정중', '중2'),
  (8, '33333333-3333-4333-8333-333333333408', '22222222-2222-4222-8222-222222222221', '정민재', '한들중', '중2'),
  (9, '33333333-3333-4333-8333-333333333409', '22222222-2222-4222-8222-222222222222', '강하준', '한들중', '중3'),
  (10, '33333333-3333-4333-8333-333333333410', '22222222-2222-4222-8222-222222222222', '고유나', '탕정중', '중3'),
  (11, '33333333-3333-4333-8333-333333333411', '22222222-2222-4222-8222-222222222222', '김민서', '탕정중', '중3'),
  (12, '33333333-3333-4333-8333-333333333412', '22222222-2222-4222-8222-222222222222', '문지후', '한들중', '중3'),
  (13, '33333333-3333-4333-8333-333333333413', '22222222-2222-4222-8222-222222222222', '배준영', '탕정중', '중3'),
  (14, '33333333-3333-4333-8333-333333333414', '22222222-2222-4222-8222-222222222222', '서아린', '한들중', '중3'),
  (15, '33333333-3333-4333-8333-333333333415', '22222222-2222-4222-8222-222222222222', '윤채원', '탕정중', '중3'),
  (16, '33333333-3333-4333-8333-333333333416', '22222222-2222-4222-8222-222222222222', '최도겸', '한들중', '중3'),
  (17, '33333333-3333-4333-8333-333333333417', '22222222-2222-4222-8222-222222222223', '강서아', '탕정중', '중1'),
  (18, '33333333-3333-4333-8333-333333333418', '22222222-2222-4222-8222-222222222223', '김리안', '탕정중', '중1'),
  (19, '33333333-3333-4333-8333-333333333419', '22222222-2222-4222-8222-222222222223', '남지율', '한들중', '중1'),
  (20, '33333333-3333-4333-8333-333333333420', '22222222-2222-4222-8222-222222222223', '류하윤', '탕정중', '중1'),
  (21, '33333333-3333-4333-8333-333333333421', '22222222-2222-4222-8222-222222222223', '박건우', '한들중', '중1'),
  (22, '33333333-3333-4333-8333-333333333422', '22222222-2222-4222-8222-222222222223', '신예준', '탕정중', '중1'),
  (23, '33333333-3333-4333-8333-333333333423', '22222222-2222-4222-8222-222222222223', '이소민', '한들중', '중1'),
  (24, '33333333-3333-4333-8333-333333333424', '22222222-2222-4222-8222-222222222223', '조은우', '탕정중', '중1'),
  (25, '33333333-3333-4333-8333-333333333425', '22222222-2222-4222-8222-222222222224', '강민성', '탕정중', '중1'),
  (26, '33333333-3333-4333-8333-333333333426', '22222222-2222-4222-8222-222222222224', '김서현', '한들중', '중1'),
  (27, '33333333-3333-4333-8333-333333333427', '22222222-2222-4222-8222-222222222224', '문서진', '탕정중', '중1'),
  (28, '33333333-3333-4333-8333-333333333428', '22222222-2222-4222-8222-222222222224', '박지안', '한들중', '중1'),
  (29, '33333333-3333-4333-8333-333333333429', '22222222-2222-4222-8222-222222222224', '오하람', '탕정중', '중1'),
  (30, '33333333-3333-4333-8333-333333333430', '22222222-2222-4222-8222-222222222224', '윤서진', '한들중', '중1'),
  (31, '33333333-3333-4333-8333-333333333431', '22222222-2222-4222-8222-222222222224', '이도윤', '탕정중', '중1'),
  (32, '33333333-3333-4333-8333-333333333432', '22222222-2222-4222-8222-222222222224', '최유찬', '한들중', '중1'),
  (33, '33333333-3333-4333-8333-333333333433', '22222222-2222-4222-8222-222222222225', '권민준', '한들중', '중3'),
  (34, '33333333-3333-4333-8333-333333333434', '22222222-2222-4222-8222-222222222225', '김가온', '탕정중', '중3'),
  (35, '33333333-3333-4333-8333-333333333435', '22222222-2222-4222-8222-222222222225', '박연우', '한들중', '중3'),
  (36, '33333333-3333-4333-8333-333333333436', '22222222-2222-4222-8222-222222222225', '서지호', '탕정중', '중3'),
  (37, '33333333-3333-4333-8333-333333333437', '22222222-2222-4222-8222-222222222225', '안채린', '한들중', '중3'),
  (38, '33333333-3333-4333-8333-333333333438', '22222222-2222-4222-8222-222222222225', '이준서', '탕정중', '중3'),
  (39, '33333333-3333-4333-8333-333333333439', '22222222-2222-4222-8222-222222222225', '정서우', '한들중', '중3'),
  (40, '33333333-3333-4333-8333-333333333440', '22222222-2222-4222-8222-222222222225', '최하준', '탕정중', '중3'),
  (41, '33333333-3333-4333-8333-333333333441', '22222222-2222-4222-8222-222222222226', '강현우', '설화고', '고1'),
  (42, '33333333-3333-4333-8333-333333333442', '22222222-2222-4222-8222-222222222226', '김다인', '온양고', '고1'),
  (43, '33333333-3333-4333-8333-333333333443', '22222222-2222-4222-8222-222222222226', '박태윤', '설화고', '고1'),
  (44, '33333333-3333-4333-8333-333333333444', '22222222-2222-4222-8222-222222222226', '송예린', '온양여고', '고1'),
  (45, '33333333-3333-4333-8333-333333333445', '22222222-2222-4222-8222-222222222226', '오지민', '설화고', '고1'),
  (46, '33333333-3333-4333-8333-333333333446', '22222222-2222-4222-8222-222222222226', '윤시현', '온양고', '고1'),
  (47, '33333333-3333-4333-8333-333333333447', '22222222-2222-4222-8222-222222222226', '이예준', '설화고', '고1'),
  (48, '33333333-3333-4333-8333-333333333448', '22222222-2222-4222-8222-222222222226', '정하은', '온양여고', '고1');

insert into public.students (
  id,
  academy_id,
  class_id,
  name,
  school_name,
  grade_label,
  parent_name,
  parent_phone,
  status
) values
  ('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '김민준', '탕정중', '중2', '김민준 학부모', '01000000001', 'active'),
  ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '이서연', '탕정중', '중2', '이서연 학부모', '01000000002', 'active'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '박지호', '한들중', '중3', '박지호 학부모', '01000000003', 'active'),
  ('33333333-3333-4333-8333-333333333334', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '최하은', '한들중', '중3', '최하은 학부모', '01000000004', 'active')
on conflict (id) do update set
  class_id = excluded.class_id,
  name = excluded.name,
  school_name = excluded.school_name,
  grade_label = excluded.grade_label,
  parent_name = excluded.parent_name,
  parent_phone = excluded.parent_phone,
  status = excluded.status;

insert into public.students (
  id,
  academy_id,
  class_id,
  name,
  school_name,
  grade_label,
  parent_name,
  parent_phone,
  status
)
select
  id,
  '11111111-1111-4111-8111-111111111111',
  class_id,
  name,
  school_name,
  grade_label,
  name || ' 학부모',
  '0100001' || lpad(seq::text, 4, '0'),
  'active'
from public.seed_pilot_volume_students
on conflict (id) do update set
  class_id = excluded.class_id,
  name = excluded.name,
  school_name = excluded.school_name,
  grade_label = excluded.grade_label,
  parent_name = excluded.parent_name,
  parent_phone = excluded.parent_phone,
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
  (
    '44444444-4444-4444-8444-444444444441',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222221',
    'regular_class',
    1,
    '16:30',
    '19:00',
    '수학',
    '중2 수학 A반',
    '월수금 정규 수업'
  ),
  (
    '44444444-4444-4444-8444-444444444442',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222221',
    'regular_class',
    3,
    '16:30',
    '19:00',
    '수학',
    '중2 수학 A반',
    '월수금 정규 수업'
  ),
  (
    '44444444-4444-4444-8444-444444444443',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222221',
    'regular_class',
    5,
    '16:30',
    '19:00',
    '수학',
    '중2 수학 A반',
    '월수금 정규 수업'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    null,
    'external',
    2,
    '19:30',
    '20:30',
    null,
    '논술학원',
    '보강 후보에서 제외할 외부 일정'
  )
on conflict (id) do update set
  class_id = excluded.class_id,
  schedule_type = excluded.schedule_type,
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  subject = excluded.subject,
  title = excluded.title,
  memo = excluded.memo,
  is_active = true,
  updated_at = now();

delete from public.student_schedules
where academy_id = '11111111-1111-4111-8111-111111111111'
  and student_id in (select id from public.seed_pilot_volume_students)
  and memo like '파일럿 볼륨 테스트%';

insert into public.student_schedules (
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
)
select
  '11111111-1111-4111-8111-111111111111',
  v.id,
  v.class_id,
  'regular_class',
  slot.day_of_week,
  slot.start_time,
  slot.end_time,
  slot.subject,
  slot.title,
  '파일럿 볼륨 테스트 정규 수업'
from public.seed_pilot_volume_students v
join lateral (
  values
    ('22222222-2222-4222-8222-222222222221'::uuid, 1, '16:30'::time, '19:00'::time, '수학', '중2 수학 A반'),
    ('22222222-2222-4222-8222-222222222221'::uuid, 3, '16:30'::time, '19:00'::time, '수학', '중2 수학 A반'),
    ('22222222-2222-4222-8222-222222222221'::uuid, 5, '16:30'::time, '19:00'::time, '수학', '중2 수학 A반'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 2, '17:00'::time, '19:00'::time, '영어', '중3 영어 B반'),
    ('22222222-2222-4222-8222-222222222222'::uuid, 4, '17:00'::time, '19:00'::time, '영어', '중3 영어 B반'),
    ('22222222-2222-4222-8222-222222222223'::uuid, 1, '17:30'::time, '19:00'::time, '영어', '중1 영어 A반'),
    ('22222222-2222-4222-8222-222222222223'::uuid, 3, '17:30'::time, '19:00'::time, '영어', '중1 영어 A반'),
    ('22222222-2222-4222-8222-222222222224'::uuid, 2, '16:00'::time, '18:00'::time, '수학', '중1 수학 B반'),
    ('22222222-2222-4222-8222-222222222224'::uuid, 4, '16:00'::time, '18:00'::time, '수학', '중1 수학 B반'),
    ('22222222-2222-4222-8222-222222222225'::uuid, 1, '19:30'::time, '21:30'::time, '수학', '중3 수학 심화반'),
    ('22222222-2222-4222-8222-222222222225'::uuid, 3, '19:30'::time, '21:30'::time, '수학', '중3 수학 심화반'),
    ('22222222-2222-4222-8222-222222222225'::uuid, 5, '19:30'::time, '21:30'::time, '수학', '중3 수학 심화반'),
    ('22222222-2222-4222-8222-222222222226'::uuid, 2, '20:00'::time, '22:00'::time, '영어', '고1 영어 내신반'),
    ('22222222-2222-4222-8222-222222222226'::uuid, 4, '20:00'::time, '22:00'::time, '영어', '고1 영어 내신반')
) as slot(class_id, day_of_week, start_time, end_time, subject, title)
  on slot.class_id = v.class_id;

insert into public.student_schedules (
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
)
select
  '11111111-1111-4111-8111-111111111111',
  id,
  null,
  'external',
  case
    when seq % 3 = 0 then 1
    when seq % 3 = 1 then 2
    else 4
  end,
  case
    when seq % 2 = 0 then '19:30'::time
    else '20:00'::time
  end,
  case
    when seq % 2 = 0 then '20:30'::time
    else '21:00'::time
  end,
  null,
  case
    when seq % 2 = 0 then '논술학원'
    else '개인 일정'
  end,
  '파일럿 볼륨 테스트 외부 일정'
from public.seed_pilot_volume_students
where seq % 4 = 0;

insert into public.attendance_records (
  academy_id,
  student_id,
  class_id,
  attendance_date,
  scheduled_start_time,
  scheduled_end_time,
  status,
  checked_at,
  arrived_at,
  note
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333331',
    '22222222-2222-4222-8222-222222222221',
    current_date,
    '16:30',
    '19:00',
    'needs_check',
    now(),
    null,
    '수업 시작 후 미도착. 결석 확정 전 확인 필요'
  ),
  (
    '11111111-1111-4111-8111-111111111111',
    '33333333-3333-4333-8333-333333333332',
    '22222222-2222-4222-8222-222222222221',
    current_date,
    '16:30',
    '19:00',
    'present',
    now(),
    now(),
    '정상 출석'
  )
on conflict (
  academy_id,
  student_id,
  class_id,
  attendance_date,
  scheduled_start_time,
  scheduled_end_time
) do update set
  status = excluded.status,
  checked_at = excluded.checked_at,
  arrived_at = excluded.arrived_at,
  note = excluded.note,
  updated_at = now();

insert into public.attendance_records (
  academy_id,
  student_id,
  class_id,
  attendance_date,
  scheduled_start_time,
  scheduled_end_time,
  status,
  checked_at,
  arrived_at,
  note
)
select
  '11111111-1111-4111-8111-111111111111',
  v.id,
  v.class_id,
  current_date,
  session.start_time,
  session.end_time,
  case
    when v.seq % 12 = 0 then 'absent'
    when v.seq % 8 = 0 then 'late'
    when v.seq % 7 = 0 then 'needs_check'
    when v.seq % 9 = 0 then 'makeup'
    else 'present'
  end::public.attendance_status,
  now(),
  case
    when v.seq % 12 = 0 or v.seq % 7 = 0 then null
    else now()
  end,
  case
    when v.seq % 12 = 0 then '볼륨 테스트: 결석 연락 필요'
    when v.seq % 8 = 0 then '볼륨 테스트: 수업 시작 후 도착'
    when v.seq % 7 = 0 then '볼륨 테스트: 결석 확정 전 확인 필요'
    when v.seq % 9 = 0 then '볼륨 테스트: 보강 출석'
    else '볼륨 테스트: 정상 출석'
  end
from public.seed_pilot_volume_students v
join lateral (
  values
    ('22222222-2222-4222-8222-222222222221'::uuid, '16:30'::time, '19:00'::time),
    ('22222222-2222-4222-8222-222222222222'::uuid, '17:00'::time, '19:00'::time),
    ('22222222-2222-4222-8222-222222222223'::uuid, '17:30'::time, '19:00'::time),
    ('22222222-2222-4222-8222-222222222224'::uuid, '16:00'::time, '18:00'::time),
    ('22222222-2222-4222-8222-222222222225'::uuid, '19:30'::time, '21:30'::time),
    ('22222222-2222-4222-8222-222222222226'::uuid, '20:00'::time, '22:00'::time)
) as session(class_id, start_time, end_time)
  on session.class_id = v.class_id
on conflict (
  academy_id,
  student_id,
  class_id,
  attendance_date,
  scheduled_start_time,
  scheduled_end_time
) do update set
  status = excluded.status,
  checked_at = excluded.checked_at,
  arrived_at = excluded.arrived_at,
  note = excluded.note,
  updated_at = now();

insert into public.message_templates (
  academy_id,
  reason,
  title,
  body
) values
  ('11111111-1111-4111-8111-111111111111', 'absence', '결석 안내', '[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업에 결석하여 안내드립니다.\n확인 부탁드리며, 보강 일정이 필요한 경우 {{teacherName}}이 다시 안내드리겠습니다.'),
  ('11111111-1111-4111-8111-111111111111', 'late', '지각 안내', '[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업에 지각하여 안내드립니다.\n다음 수업부터 시간 확인 부탁드립니다.'),
  ('11111111-1111-4111-8111-111111111111', 'homework_missing', '숙제 미완료 안내', '[{{academyName}}] 안녕하세요. {{studentName}} 학생이 이번 과제를 완료하지 못해 안내드립니다.\n다음 수업 전까지 과제를 마무리할 수 있도록 확인 부탁드립니다.'),
  ('11111111-1111-4111-8111-111111111111', 'retest', '재시험 안내', '[{{academyName}}] 안녕하세요. {{studentName}} 학생은 오늘 수업 내용 중 재시험이 필요하여 안내드립니다.\n다음 수업 전까지 오답을 다시 확인할 수 있도록 지도 부탁드립니다.'),
  ('11111111-1111-4111-8111-111111111111', 'makeup', '보강 안내', '[{{academyName}}] 안녕하세요. {{studentName}} 학생 보강 일정 안내드립니다.\n가능하시면 {{makeupCandidateTime}} 시간으로 보강 진행 가능 여부 확인 부탁드립니다.'),
  ('11111111-1111-4111-8111-111111111111', 'materials_missing', '준비물 미지참 안내', '[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업 준비물을 지참하지 않아 안내드립니다.\n다음 수업에는 교재와 필기구를 꼭 챙길 수 있도록 확인 부탁드립니다.'),
  ('11111111-1111-4111-8111-111111111111', 'class_attitude', '수업 태도 확인 안내', '[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생의 수업 집중도와 참여도에 대해 확인이 필요하여 안내드립니다.\n담당 선생님이 수업 흐름을 다시 잡을 수 있도록 지도하겠습니다.'),
  ('11111111-1111-4111-8111-111111111111', 'consultation', '상담 권장 안내', '[{{academyName}}] 안녕하세요. {{studentName}} 학생의 최근 학습 흐름에 대해 간단한 상담이 필요하여 안내드립니다.\n가능하신 시간에 {{teacherName}}에게 연락 부탁드립니다.')
on conflict (academy_id, reason) do update set
  title = excluded.title,
  body = excluded.body,
  is_active = true;

drop table if exists public.seed_pilot_volume_students;
