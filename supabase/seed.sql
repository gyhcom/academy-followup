-- Academy Follow-up pilot seed data
-- 개발/파일럿 DB에서 더배움프라임영수학원 화면을 실제 DB 기반으로 확인하기 위한 샘플입니다.

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
  parent_phone
) values
  ('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '김민준', '탕정중', '중2', '김민준 학부모', '01000000001'),
  ('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222221', '이서연', '탕정중', '중2', '이서연 학부모', '01000000002'),
  ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '박지호', '한들중', '중3', '박지호 학부모', '01000000003'),
  ('33333333-3333-4333-8333-333333333334', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '최하은', '한들중', '중3', '최하은 학부모', '01000000004')
on conflict (id) do update set
  class_id = excluded.class_id,
  name = excluded.name,
  school_name = excluded.school_name,
  grade_label = excluded.grade_label,
  parent_name = excluded.parent_name,
  parent_phone = excluded.parent_phone;

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
  ('11111111-1111-4111-8111-111111111111', 'materials_missing', '준비물 미지참 안내', '[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생이 수업 준비물을 지참하지 않아 안내드립니다.\n다음 수업에는 교재와 필기구를 꼭 챙길 수 있도록 확인 부탁드립니다.'),
  ('11111111-1111-4111-8111-111111111111', 'class_attitude', '수업 태도 확인 안내', '[{{academyName}}] 안녕하세요. 오늘 {{studentName}} 학생의 수업 집중도와 참여도에 대해 확인이 필요하여 안내드립니다.\n담당 선생님이 수업 흐름을 다시 잡을 수 있도록 지도하겠습니다.'),
  ('11111111-1111-4111-8111-111111111111', 'consultation', '상담 권장 안내', '[{{academyName}}] 안녕하세요. {{studentName}} 학생의 최근 학습 흐름에 대해 간단한 상담이 필요하여 안내드립니다.\n가능하신 시간에 {{teacherName}}에게 연락 부탁드립니다.')
on conflict (academy_id, reason) do update set
  title = excluded.title,
  body = excluded.body,
  is_active = true;
