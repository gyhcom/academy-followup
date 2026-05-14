-- Academy Follow-up operations demo seed data
-- 실제 운영처럼 매일 수업/출석/문자 기록을 확인하기 위한 리허설 데이터입니다.
-- 기존 MVP seed, volume seed와 분리해서 필요할 때만 Supabase SQL Editor에서 실행합니다.
-- 반복 실행하면 이전 운영 데모 데이터만 정리한 뒤 오늘 날짜 기준으로 다시 생성합니다.

drop table if exists seed_demo_operations_classes;
drop table if exists seed_demo_operations_students;
drop table if exists seed_demo_operations_dates;

create temporary table seed_demo_operations_classes (
  seq integer primary key,
  id uuid not null,
  name text not null,
  subject text not null,
  grade_label text not null,
  start_time time not null,
  end_time time not null,
  days smallint[] not null
);

create temporary table seed_demo_operations_students (
  seq integer primary key,
  id uuid not null,
  class_seq integer not null,
  class_id uuid not null,
  name text not null,
  school_name text not null,
  grade_label text not null
);

create temporary table seed_demo_operations_dates (
  attendance_date date primary key,
  day_of_week smallint not null,
  date_offset integer not null
);

insert into seed_demo_operations_classes (
  seq,
  id,
  name,
  subject,
  grade_label,
  start_time,
  end_time,
  days
) values
  (1, md5('demo-operations-class-1')::uuid, '중1 수학 기본반', '수학', '중1', '16:00', '17:30', array[1, 3, 5]::smallint[]),
  (2, md5('demo-operations-class-2')::uuid, '중1 영어 내신반', '영어', '중1', '17:40', '19:10', array[2, 4, 6]::smallint[]),
  (3, md5('demo-operations-class-3')::uuid, '중2 수학 A반', '수학', '중2', '16:30', '19:00', array[1, 3, 5]::smallint[]),
  (4, md5('demo-operations-class-4')::uuid, '중2 영어 독해반', '영어', '중2', '19:10', '20:40', array[2, 4, 6]::smallint[]),
  (5, md5('demo-operations-class-5')::uuid, '중3 수학 심화반', '수학', '중3', '19:30', '21:30', array[1, 3, 5]::smallint[]),
  (6, md5('demo-operations-class-6')::uuid, '중3 영어 문법반', '영어', '중3', '17:00', '19:00', array[2, 4, 6]::smallint[]),
  (7, md5('demo-operations-class-7')::uuid, '고1 영어 내신반', '영어', '고1', '20:00', '22:00', array[1, 3, 5]::smallint[]),
  (8, md5('demo-operations-class-8')::uuid, '고1 수학 개념반', '수학', '고1', '18:30', '20:30', array[0, 2, 4]::smallint[]);

insert into seed_demo_operations_students (
  seq,
  id,
  class_seq,
  class_id,
  name,
  school_name,
  grade_label
)
select
  ((class_item.seq - 1) * 8) + student_item.student_order as seq,
  md5('demo-operations-student-' || (((class_item.seq - 1) * 8) + student_item.student_order)::text)::uuid as id,
  class_item.seq,
  class_item.id,
  student_item.name,
  case
    when class_item.grade_label = '고1' and student_item.student_order % 2 = 0 then '온양고'
    when class_item.grade_label = '고1' then '설화고'
    when student_item.student_order % 3 = 0 then '한들중'
    else '탕정중'
  end as school_name,
  class_item.grade_label
from seed_demo_operations_classes class_item
join lateral (
  values
    (1, '강도윤'), (2, '권서준'), (3, '김나은'), (4, '김도현'),
    (5, '박서윤'), (6, '박시우'), (7, '이하린'), (8, '정민재')
) as student_item(student_order, name) on true;

insert into seed_demo_operations_dates (
  attendance_date,
  day_of_week,
  date_offset
)
select
  current_date + offset_value,
  extract(dow from current_date + offset_value)::smallint,
  offset_value
from generate_series(-6, 6) as offsets(offset_value);

-- 이전 운영 데모 데이터 정리
delete from public.message_logs
where academy_id = '11111111-1111-4111-8111-111111111111'
  and followup_id in (
    select id
    from public.followups
    where student_id in (select id from seed_demo_operations_students)
  );

delete from public.attendance_records
where academy_id = '11111111-1111-4111-8111-111111111111'
  and student_id in (select id from seed_demo_operations_students);

delete from public.student_schedules
where academy_id = '11111111-1111-4111-8111-111111111111'
  and (
    student_id in (select id from seed_demo_operations_students)
    or class_id in (select id from seed_demo_operations_classes)
    or memo like '운영 데모:%'
  );

delete from public.followups
where academy_id = '11111111-1111-4111-8111-111111111111'
  and student_id in (select id from seed_demo_operations_students);

delete from public.students
where academy_id = '11111111-1111-4111-8111-111111111111'
  and id in (select id from seed_demo_operations_students);

delete from public.classes
where academy_id = '11111111-1111-4111-8111-111111111111'
  and id in (select id from seed_demo_operations_classes);

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
)
select
  id,
  '11111111-1111-4111-8111-111111111111',
  name,
  subject,
  grade_label
from seed_demo_operations_classes
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
)
select
  student_item.id,
  '11111111-1111-4111-8111-111111111111',
  student_item.class_id,
  student_item.name,
  student_item.school_name,
  student_item.grade_label,
  student_item.name || ' 학부모',
  '01088' || lpad(student_item.seq::text, 6, '0'),
  case when student_item.seq % 5 = 0 then '01099' || lpad(student_item.seq::text, 6, '0') else null end,
  'active'
from seed_demo_operations_students student_item
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
)
select
  md5('demo-operations-regular-schedule-' || student_item.seq::text || '-' || day_value::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_item.id,
  class_item.id,
  'regular_class',
  day_value,
  class_item.start_time,
  class_item.end_time,
  class_item.subject,
  class_item.name,
  '운영 데모: 반 공통 정규 수업'
from seed_demo_operations_students student_item
join seed_demo_operations_classes class_item on class_item.seq = student_item.class_seq
cross join lateral unnest(class_item.days) as day_value
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
)
select
  md5('demo-operations-external-schedule-' || student_item.seq::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_item.id,
  null,
  'external',
  case when student_item.seq % 2 = 0 then 2 else 4 end,
  case when student_item.seq % 2 = 0 then '19:30'::time else '20:00'::time end,
  case when student_item.seq % 2 = 0 then '20:30'::time else '21:00'::time end,
  null,
  case when student_item.seq % 2 = 0 then '논술학원' else '개인 일정' end,
  '운영 데모: 보강 후보 제외 외부 일정'
from seed_demo_operations_students student_item
where student_item.seq % 6 = 0
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

insert into public.attendance_records (
  id,
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
  md5(
    'demo-operations-attendance-' ||
    student_item.seq::text || '-' ||
    date_item.attendance_date::text || '-' ||
    class_item.seq::text
  )::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_item.id,
  class_item.id,
  date_item.attendance_date,
  class_item.start_time,
  class_item.end_time,
  case
    when date_item.date_offset > 0 then 'pending'
    when date_item.date_offset = 0 and student_item.seq % 13 = 0 then 'absent'
    when date_item.date_offset = 0 and student_item.seq % 11 = 0 then 'late'
    when date_item.date_offset = 0 and student_item.seq % 7 = 0 then 'needs_check'
    when date_item.date_offset = 0 and student_item.seq % 17 = 0 then 'makeup'
    when date_item.date_offset = 0 and student_item.seq % 5 = 0 then 'pending'
    when date_item.date_offset < 0 and student_item.seq % 19 = 0 then 'absent'
    when date_item.date_offset < 0 and student_item.seq % 14 = 0 then 'late'
    else 'present'
  end::public.attendance_status,
  case
    when date_item.date_offset > 0 then null
    when date_item.date_offset = 0 and student_item.seq % 5 = 0 then null
    else now() - (abs(date_item.date_offset) || ' days')::interval
  end,
  case
    when date_item.date_offset > 0 then null
    when date_item.date_offset = 0 and student_item.seq % 13 = 0 then null
    when date_item.date_offset = 0 and student_item.seq % 7 = 0 then null
    when date_item.date_offset = 0 and student_item.seq % 5 = 0 then null
    when date_item.date_offset < 0 and student_item.seq % 19 = 0 then null
    else now() - (abs(date_item.date_offset) || ' days')::interval
  end,
  case
    when date_item.date_offset > 0 then '운영 데모: 예정 수업'
    when date_item.date_offset = 0 and student_item.seq % 13 = 0 then '운영 데모: 결석 연락 필요'
    when date_item.date_offset = 0 and student_item.seq % 11 = 0 then '운영 데모: 지각 도착'
    when date_item.date_offset = 0 and student_item.seq % 7 = 0 then '운영 데모: 확인 필요'
    when date_item.date_offset = 0 and student_item.seq % 17 = 0 then '운영 데모: 보강 출석'
    when date_item.date_offset = 0 and student_item.seq % 5 = 0 then '운영 데모: 아직 미체크'
    else '운영 데모: 정상 출석'
  end
from seed_demo_operations_students student_item
join seed_demo_operations_classes class_item on class_item.seq = student_item.class_seq
join seed_demo_operations_dates date_item on date_item.day_of_week = any(class_item.days)
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

insert into public.followups (
  id,
  academy_id,
  student_id,
  class_id,
  reason,
  message_body,
  recipient_type,
  status,
  sent_at,
  created_at
)
select
  md5('demo-operations-followup-' || attendance_item.student_id::text || '-' || attendance_item.status::text)::uuid,
  attendance_item.academy_id,
  attendance_item.student_id,
  attendance_item.class_id,
  case when attendance_item.status = 'late' then 'late' else 'absence' end::public.followup_reason,
  '[더배움프라임] 안녕하세요. ' || student_item.name || ' 학생 ' ||
    case
      when attendance_item.status = 'late' then '지각 안내드립니다. 다음 수업 시간 확인 부탁드립니다.'
      else '결석 확인이 필요하여 안내드립니다. 확인 부탁드립니다.'
    end,
  'parent',
  'sent',
  now(),
  now()
from public.attendance_records attendance_item
join public.students student_item on student_item.id = attendance_item.student_id
where attendance_item.academy_id = '11111111-1111-4111-8111-111111111111'
  and attendance_item.attendance_date = current_date
  and attendance_item.student_id in (select id from seed_demo_operations_students)
  and attendance_item.status in ('absent', 'late')
on conflict (id) do update set
  message_body = excluded.message_body,
  recipient_type = excluded.recipient_type,
  status = excluded.status,
  sent_at = excluded.sent_at;

insert into public.message_logs (
  id,
  academy_id,
  followup_id,
  provider,
  provider_message_id,
  recipient_phone,
  recipient_type,
  status
)
select
  md5('demo-operations-message-log-' || followup_item.id::text)::uuid,
  followup_item.academy_id,
  followup_item.id,
  'demo',
  'demo-operations-' || followup_item.id::text,
  student_item.parent_phone,
  followup_item.recipient_type,
  'dry_run'
from public.followups followup_item
join public.students student_item on student_item.id = followup_item.student_id
where followup_item.student_id in (select id from seed_demo_operations_students)
on conflict (id) do update set
  recipient_phone = excluded.recipient_phone,
  recipient_type = excluded.recipient_type,
  status = excluded.status;

update public.attendance_records attendance_item
set followup_id = followup_item.id,
    updated_at = now()
from public.followups followup_item
where attendance_item.academy_id = followup_item.academy_id
  and attendance_item.student_id = followup_item.student_id
  and attendance_item.class_id = followup_item.class_id
  and attendance_item.attendance_date = current_date
  and attendance_item.student_id in (select id from seed_demo_operations_students)
  and attendance_item.status in ('absent', 'late');

select
  (select count(*) from public.classes where id in (select id from seed_demo_operations_classes)) as demo_class_count,
  (select count(*) from public.students where id in (select id from seed_demo_operations_students)) as demo_student_count,
  (select count(*) from public.student_schedules where student_id in (select id from seed_demo_operations_students) and is_active = true) as demo_schedule_count,
  (select count(*) from public.attendance_records where student_id in (select id from seed_demo_operations_students)) as demo_attendance_count,
  (select count(*) from public.followups where student_id in (select id from seed_demo_operations_students)) as demo_followup_count;

drop table if exists seed_demo_operations_dates;
drop table if exists seed_demo_operations_students;
drop table if exists seed_demo_operations_classes;
