-- Academy Follow-up 200-student pilot seed data
-- 개인정보 없는 월간 파일럿 검증용 운영형 데이터입니다.
-- 출석부 검수 기준은 주요 10개 반에 학생 20명씩 배정한 구조입니다.
-- 실행 대상은 파일럿/시연용 DB입니다. 실제 학원 개인정보가 들어간 DB에서는 실행하지 마세요.
-- 반복 실행하면 이 seed가 관리하는 고정 UUID 데이터만 정리한 뒤 다시 생성합니다.

drop table if exists public.seed_pilot_200_classes;
drop table if exists public.seed_pilot_200_students;
drop table if exists public.seed_pilot_200_dates;
drop table if exists public.seed_pilot_200_external_academies;
drop table if exists public.seed_pilot_200_external_classes;
drop table if exists public.seed_pilot_200_external_assignments;
drop table if exists public.seed_pilot_200_shared_academies;
drop table if exists public.seed_pilot_200_shared_classes;
drop table if exists public.seed_pilot_200_shared_assignments;

create table public.seed_pilot_200_classes (
  seq integer primary key,
  id uuid not null,
  name text not null,
  subject text not null,
  grade_label text not null,
  start_time time not null,
  end_time time not null,
  days smallint[] not null
);

create table public.seed_pilot_200_students (
  seq integer primary key,
  id uuid not null,
  class_seq integer not null,
  class_id uuid not null,
  name text not null,
  school_name text not null,
  grade_label text not null,
  parent_phone text not null,
  student_phone text,
  share_consent boolean not null
);

create table public.seed_pilot_200_dates (
  attendance_date date primary key,
  day_of_week smallint not null,
  date_offset integer not null
);

create table public.seed_pilot_200_external_academies (
  seq integer primary key,
  id uuid not null,
  name text not null,
  category text not null
);

create table public.seed_pilot_200_external_classes (
  seq integer primary key,
  academy_seq integer not null,
  id uuid not null,
  title text not null,
  subject text not null,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null
);

create table public.seed_pilot_200_external_assignments (
  seq integer primary key,
  student_seq integer not null,
  external_class_seq integer not null
);

create table public.seed_pilot_200_shared_academies (
  seq integer primary key,
  id uuid not null,
  name text not null,
  slug text not null,
  category text not null,
  brand_color text not null
);

create table public.seed_pilot_200_shared_classes (
  seq integer primary key,
  academy_seq integer not null,
  id uuid not null,
  name text not null,
  subject text not null,
  grade_label text not null
);

create table public.seed_pilot_200_shared_assignments (
  seq integer primary key,
  local_student_seq integer not null,
  academy_seq integer not null,
  class_seq integer not null,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  subject text not null,
  title text not null
);

alter table public.seed_pilot_200_classes enable row level security;
alter table public.seed_pilot_200_students enable row level security;
alter table public.seed_pilot_200_dates enable row level security;
alter table public.seed_pilot_200_external_academies enable row level security;
alter table public.seed_pilot_200_external_classes enable row level security;
alter table public.seed_pilot_200_external_assignments enable row level security;
alter table public.seed_pilot_200_shared_academies enable row level security;
alter table public.seed_pilot_200_shared_classes enable row level security;
alter table public.seed_pilot_200_shared_assignments enable row level security;

insert into public.seed_pilot_200_classes (
  seq,
  id,
  name,
  subject,
  grade_label,
  start_time,
  end_time,
  days
) values
  (1, md5('pilot-200-class-1')::uuid, '중1 수학 기본 A', '수학', '중1', '16:00', '17:30', array[1,3,5]::smallint[]),
  (2, md5('pilot-200-class-2')::uuid, '중1 수학 기본 B', '수학', '중1', '17:40', '19:10', array[2,4,6]::smallint[]),
  (3, md5('pilot-200-class-3')::uuid, '중1 영어 독해 A', '영어', '중1', '18:00', '19:30', array[1,3,5]::smallint[]),
  (4, md5('pilot-200-class-4')::uuid, '중1 영어 문법 B', '영어', '중1', '19:40', '21:10', array[2,4,6]::smallint[]),
  (5, md5('pilot-200-class-5')::uuid, '중2 수학 A반', '수학', '중2', '16:30', '19:00', array[1,3,5]::smallint[]),
  (6, md5('pilot-200-class-6')::uuid, '중2 수학 B반', '수학', '중2', '19:10', '21:10', array[2,4,6]::smallint[]),
  (7, md5('pilot-200-class-7')::uuid, '중2 영어 내신 A', '영어', '중2', '17:00', '18:40', array[1,3,5]::smallint[]),
  (8, md5('pilot-200-class-8')::uuid, '중2 영어 리딩 B', '영어', '중2', '18:50', '20:30', array[2,4,6]::smallint[]),
  (9, md5('pilot-200-class-9')::uuid, '중3 수학 심화 A', '수학', '중3', '19:30', '21:30', array[1,3,5]::smallint[]),
  (10, md5('pilot-200-class-10')::uuid, '중3 수학 실전 B', '수학', '중3', '16:30', '18:30', array[2,4,6]::smallint[]),
  (11, md5('pilot-200-class-11')::uuid, '중3 영어 내신 A', '영어', '중3', '18:40', '20:20', array[1,3,5]::smallint[]),
  (12, md5('pilot-200-class-12')::uuid, '중3 영어 문법 B', '영어', '중3', '20:30', '22:00', array[2,4,6]::smallint[]),
  (13, md5('pilot-200-class-13')::uuid, '고1 수학 개념 A', '수학', '고1', '18:30', '20:30', array[1,3,5]::smallint[]),
  (14, md5('pilot-200-class-14')::uuid, '고1 수학 심화 B', '수학', '고1', '20:40', '22:20', array[2,4,6]::smallint[]),
  (15, md5('pilot-200-class-15')::uuid, '고1 영어 내신 A', '영어', '고1', '19:00', '21:00', array[1,3,5]::smallint[]),
  (16, md5('pilot-200-class-16')::uuid, '고1 영어 리딩 B', '영어', '고1', '17:20', '19:20', array[2,4,6]::smallint[]),
  (17, md5('pilot-200-class-17')::uuid, '고2 수학 클리닉', '수학', '고2', '20:00', '22:00', array[1,3,5]::smallint[]),
  (18, md5('pilot-200-class-18')::uuid, '고2 영어 클리닉', '영어', '고2', '19:20', '21:20', array[2,4,6]::smallint[]),
  (19, md5('pilot-200-class-19')::uuid, '무학년제 독서논술', '논술', '무학년제', '10:00', '12:00', array[0,6]::smallint[]),
  (20, md5('pilot-200-class-20')::uuid, '무학년제 오답클리닉', '클리닉', '무학년제', '14:00', '16:00', array[0,6]::smallint[]);

insert into public.seed_pilot_200_students (
  seq,
  id,
  class_seq,
  class_id,
  name,
  school_name,
  grade_label,
  parent_phone,
  student_phone,
  share_consent
)
select
  seq_value,
  md5('pilot-200-student-' || seq_value::text)::uuid,
  ((seq_value - 1) / 20) + 1,
  class_item.id,
  surname.name || given_a.name || given_b.name || lpad(seq_value::text, 3, '0'),
  case
    when class_item.grade_label like '고%' and seq_value % 2 = 0 then '온양고'
    when class_item.grade_label like '고%' then '설화고'
    when class_item.grade_label = '무학년제' then '탕정초중'
    when seq_value % 4 = 0 then '한들중'
    when seq_value % 3 = 0 then '설화중'
    else '탕정중'
  end,
  class_item.grade_label,
  '01077' || lpad(seq_value::text, 6, '0'),
  case when seq_value % 4 = 0 then '01078' || lpad(seq_value::text, 6, '0') else null end,
  seq_value % 3 = 0
from generate_series(1, 200) as seqs(seq_value)
join public.seed_pilot_200_classes class_item on class_item.seq = ((seq_value - 1) / 20) + 1
join lateral (values
  (1, '김'), (2, '박'), (3, '이'), (4, '최'), (5, '정'),
  (6, '강'), (7, '조'), (8, '윤'), (9, '장'), (10, '임')
) as surname(idx, name) on surname.idx = ((seq_value - 1) % 10) + 1
join lateral (values
  (1, '서'), (2, '도'), (3, '하'), (4, '민'), (5, '지')
) as given_a(idx, name) on given_a.idx = ((seq_value - 1) % 5) + 1
join lateral (values
  (1, '준'), (2, '윤'), (3, '린'), (4, '우')
) as given_b(idx, name) on given_b.idx = ((seq_value - 1) % 4) + 1;

insert into public.seed_pilot_200_dates (
  attendance_date,
  day_of_week,
  date_offset
)
select
  date_value,
  extract(dow from date_value)::smallint,
  (date_value - current_date)::integer
from generate_series(
  date_trunc('month', current_date)::date,
  (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
  interval '1 day'
) as dates(date_value);

insert into public.seed_pilot_200_external_academies (
  seq,
  id,
  name,
  category
) values
  (1, md5('pilot-200-manual-external-academy-1')::uuid, '논술나무학원', '논술'),
  (2, md5('pilot-200-manual-external-academy-2')::uuid, '리딩브릿지영어', '영어'),
  (3, md5('pilot-200-manual-external-academy-3')::uuid, '탑매쓰클리닉', '수학'),
  (4, md5('pilot-200-manual-external-academy-4')::uuid, '토요과학실험', '과학');

insert into public.seed_pilot_200_external_classes (
  seq,
  academy_seq,
  id,
  title,
  subject,
  day_of_week,
  start_time,
  end_time
) values
  (1, 1, md5('pilot-200-manual-external-class-1')::uuid, '중등 논술 A', '논술', 2, '19:30', '20:30'),
  (2, 1, md5('pilot-200-manual-external-class-2')::uuid, '중등 논술 A', '논술', 4, '19:30', '20:30'),
  (3, 2, md5('pilot-200-manual-external-class-3')::uuid, '영어 리딩', '영어', 1, '20:00', '21:20'),
  (4, 2, md5('pilot-200-manual-external-class-4')::uuid, '영어 리딩', '영어', 3, '20:00', '21:20'),
  (5, 3, md5('pilot-200-manual-external-class-5')::uuid, '수학 클리닉', '수학', 6, '10:00', '12:00'),
  (6, 4, md5('pilot-200-manual-external-class-6')::uuid, '과학 실험', '과학', 0, '14:00', '16:00');

insert into public.seed_pilot_200_external_assignments (
  seq,
  student_seq,
  external_class_seq
)
select
  row_number() over () as seq,
  student_seq,
  external_class_seq
from (
  select seq as student_seq, ((seq % 6) + 1) as external_class_seq
  from public.seed_pilot_200_students
  where seq % 5 = 0
) seed_assignments;

insert into public.seed_pilot_200_shared_academies (
  seq,
  id,
  name,
  slug,
  category,
  brand_color
) values
  (1, md5('pilot-200-shared-academy-1')::uuid, '다솜수학학원', 'pilot-200-dasom-math', '수학 · 보강 공유 학원', '#315C7C'),
  (2, md5('pilot-200-shared-academy-2')::uuid, '리딩논술학원', 'pilot-200-reading-essay', '논술 · 독서 토론 학원', '#8A4F7D'),
  (3, md5('pilot-200-shared-academy-3')::uuid, '탑클래스영어학원', 'pilot-200-topclass-english', '영어 내신 학원', '#B66A2C');

insert into public.seed_pilot_200_shared_classes (
  seq,
  academy_seq,
  id,
  name,
  subject,
  grade_label
) values
  (1, 1, md5('pilot-200-shared-class-1')::uuid, '중등 수학 클리닉', '수학', '중등'),
  (2, 2, md5('pilot-200-shared-class-2')::uuid, '중등 독서토론', '논술', '중등'),
  (3, 3, md5('pilot-200-shared-class-3')::uuid, '중등 영어 리딩', '영어', '중등'),
  (4, 1, md5('pilot-200-shared-class-4')::uuid, '고등 수학 클리닉', '수학', '고등'),
  (5, 2, md5('pilot-200-shared-class-5')::uuid, '고등 논술 심화', '논술', '고등'),
  (6, 3, md5('pilot-200-shared-class-6')::uuid, '고등 영어 내신', '영어', '고등');

insert into public.seed_pilot_200_shared_assignments (
  seq,
  local_student_seq,
  academy_seq,
  class_seq,
  day_of_week,
  start_time,
  end_time,
  subject,
  title
)
select
  row_number() over () as seq,
  student_item.seq,
  ((row_number() over () - 1) % 3) + 1,
  ((row_number() over () - 1) % 6) + 1,
  case ((row_number() over () - 1) % 6)
    when 0 then 2
    when 1 then 4
    when 2 then 1
    when 3 then 3
    when 4 then 5
    else 6
  end,
  case ((row_number() over () - 1) % 6)
    when 0 then '19:30'::time
    when 1 then '20:00'::time
    when 2 then '18:40'::time
    when 3 then '20:10'::time
    when 4 then '19:20'::time
    else '10:00'::time
  end,
  case ((row_number() over () - 1) % 6)
    when 0 then '20:30'::time
    when 1 then '21:30'::time
    when 2 then '20:00'::time
    when 3 then '21:40'::time
    when 4 then '21:00'::time
    else '12:00'::time
  end,
  case ((row_number() over () - 1) % 3)
    when 0 then '수학'
    when 1 then '논술'
    else '영어'
  end,
  case ((row_number() over () - 1) % 3)
    when 0 then '연결 수학 수업'
    when 1 then '연결 논술 수업'
    else '연결 영어 수업'
  end
from public.seed_pilot_200_students student_item
where student_item.share_consent
  and student_item.seq % 2 = 0
limit 30;

-- 이전 200명 파일럿 seed 데이터 정리
delete from public.message_logs
where academy_id = '11111111-1111-4111-8111-111111111111'
  and followup_id in (
    select id
    from public.followups
    where id::text like md5('pilot-200-followup-prefix') || '%'
       or student_id in (select id from public.seed_pilot_200_students)
  );

delete from public.attendance_records
where academy_id = '11111111-1111-4111-8111-111111111111'
  and student_id in (select id from public.seed_pilot_200_students);

delete from public.student_schedule_links
where source_student_id in (select id from public.seed_pilot_200_students)
   or target_student_id in (select id from public.seed_pilot_200_students)
   or source_academy_id in (select id from public.seed_pilot_200_shared_academies)
   or target_academy_id in (select id from public.seed_pilot_200_shared_academies);

delete from public.student_external_class_enrollments
where academy_id = '11111111-1111-4111-8111-111111111111'
  and student_id in (select id from public.seed_pilot_200_students);

delete from public.external_academy_classes
where academy_id = '11111111-1111-4111-8111-111111111111'
  and id in (select id from public.seed_pilot_200_external_classes);

delete from public.external_academies
where academy_id = '11111111-1111-4111-8111-111111111111'
  and id in (select id from public.seed_pilot_200_external_academies);

delete from public.student_schedules
where student_id in (select id from public.seed_pilot_200_students)
   or class_id in (select id from public.seed_pilot_200_classes)
   or academy_id in (select id from public.seed_pilot_200_shared_academies);

delete from public.followups
where academy_id = '11111111-1111-4111-8111-111111111111'
  and student_id in (select id from public.seed_pilot_200_students);

delete from public.students
where id in (select id from public.seed_pilot_200_students)
   or academy_id in (select id from public.seed_pilot_200_shared_academies);

delete from public.classes
where id in (select id from public.seed_pilot_200_classes)
   or academy_id in (select id from public.seed_pilot_200_shared_academies);

delete from public.academy_settings
where academy_id in (select id from public.seed_pilot_200_shared_academies);

delete from public.academies
where id in (select id from public.seed_pilot_200_shared_academies);

-- 더배움 파일럿 학원 기본값 보장
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

insert into public.academies (
  id,
  name,
  slug,
  plan,
  status,
  category,
  brand_color,
  sender_name,
  sender_phone
)
select
  id,
  name,
  slug,
  'pilot',
  'active',
  category,
  brand_color,
  name,
  null
from public.seed_pilot_200_shared_academies
on conflict (slug) do update set
  name = excluded.name,
  plan = excluded.plan,
  status = excluded.status,
  category = excluded.category,
  brand_color = excluded.brand_color,
  sender_name = excluded.sender_name,
  sender_phone = excluded.sender_phone;

insert into public.academy_settings (
  academy_id,
  sms_dry_run,
  allow_assistant_send,
  duplicate_guard_minutes,
  parent_phone_masking
)
select
  id,
  true,
  false,
  1440,
  true
from public.seed_pilot_200_shared_academies
on conflict (academy_id) do update set
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
  grade_label,
  teacher_id
)
select
  class_item.id,
  '11111111-1111-4111-8111-111111111111',
  class_item.name,
  class_item.subject,
  class_item.grade_label,
  (
    select profile.id
    from public.profiles profile
    where profile.academy_id = '11111111-1111-4111-8111-111111111111'
      and profile.role in ('teacher', 'assistant', 'manager', 'owner')
      and profile.status = 'active'
    order by
      case profile.role
        when 'teacher' then 0
        when 'assistant' then 1
        when 'manager' then 2
        else 3
      end,
      profile.created_at,
      profile.id
    offset ((class_item.seq - 1) % greatest((
      select count(*)
      from public.profiles profile
      where profile.academy_id = '11111111-1111-4111-8111-111111111111'
        and profile.role in ('teacher', 'assistant', 'manager', 'owner')
        and profile.status = 'active'
    ), 1))
    limit 1
  )
from public.seed_pilot_200_classes class_item
on conflict (id) do update set
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
  schedule_share_consent_confirmed,
  schedule_share_consent_confirmed_at,
  schedule_share_consent_confirmed_by,
  status
)
select
  student_item.id,
  '11111111-1111-4111-8111-111111111111',
  student_item.class_id,
  student_item.name,
  student_item.school_name,
  student_item.grade_label,
  student_item.name || ' 보호자',
  student_item.parent_phone,
  student_item.student_phone,
  student_item.share_consent,
  case when student_item.share_consent then now() else null end,
  case
    when student_item.share_consent then (
      select profile.id
      from public.profiles profile
      where profile.academy_id = '11111111-1111-4111-8111-111111111111'
        and profile.role in ('owner', 'manager')
      order by case profile.role when 'owner' then 0 else 1 end, profile.created_at
      limit 1
    )
    else null
  end,
  'active'
from public.seed_pilot_200_students student_item
on conflict (id) do update set
  class_id = excluded.class_id,
  name = excluded.name,
  school_name = excluded.school_name,
  grade_label = excluded.grade_label,
  parent_name = excluded.parent_name,
  parent_phone = excluded.parent_phone,
  student_phone = excluded.student_phone,
  schedule_share_consent_confirmed = excluded.schedule_share_consent_confirmed,
  schedule_share_consent_confirmed_at = excluded.schedule_share_consent_confirmed_at,
  schedule_share_consent_confirmed_by = excluded.schedule_share_consent_confirmed_by,
  status = excluded.status;

insert into public.student_schedules (
  id,
  academy_id,
  student_id,
  class_id,
  teacher_id,
  schedule_type,
  schedule_date,
  day_of_week,
  start_time,
  end_time,
  subject,
  title,
  memo,
  is_active
)
select
  md5('pilot-200-regular-schedule-' || student_item.seq::text || '-' || day_value::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_item.id,
  class_item.id,
  class_record.teacher_id,
  'regular_class',
  null,
  day_value,
  class_item.start_time,
  class_item.end_time,
  class_item.subject,
  class_item.name,
  '파일럿 200명: 반 공통 정규 수업',
  true
from public.seed_pilot_200_students student_item
join public.seed_pilot_200_classes class_item on class_item.seq = student_item.class_seq
join public.classes class_record on class_record.id = class_item.id
cross join lateral unnest(class_item.days) as day_value
on conflict (id) do update set
  teacher_id = excluded.teacher_id,
  class_id = excluded.class_id,
  schedule_type = excluded.schedule_type,
  schedule_date = excluded.schedule_date,
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  subject = excluded.subject,
  title = excluded.title,
  memo = excluded.memo,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.external_academies (
  id,
  academy_id,
  name,
  category,
  memo
)
select
  id,
  '11111111-1111-4111-8111-111111111111',
  name,
  category,
  '파일럿 200명: 원장이 수동 등록한 타 학원'
from public.seed_pilot_200_external_academies
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  memo = excluded.memo,
  is_active = true,
  updated_at = now();

insert into public.external_academy_classes (
  id,
  academy_id,
  external_academy_id,
  title,
  subject,
  schedule_date,
  day_of_week,
  start_time,
  end_time,
  memo,
  is_active
)
select
  class_item.id,
  '11111111-1111-4111-8111-111111111111',
  academy_item.id,
  class_item.title,
  class_item.subject,
  null,
  class_item.day_of_week,
  class_item.start_time,
  class_item.end_time,
  '파일럿 200명: 직접등록 타 학원 수업',
  true
from public.seed_pilot_200_external_classes class_item
join public.seed_pilot_200_external_academies academy_item on academy_item.seq = class_item.academy_seq
on conflict (id) do update set
  title = excluded.title,
  subject = excluded.subject,
  schedule_date = excluded.schedule_date,
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  memo = excluded.memo,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.student_external_class_enrollments (
  id,
  academy_id,
  student_id,
  external_academy_class_id,
  is_active
)
select
  md5('pilot-200-external-enrollment-' || assignment.seq::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_item.id,
  external_class.id,
  true
from public.seed_pilot_200_external_assignments assignment
join public.seed_pilot_200_students student_item on student_item.seq = assignment.student_seq
join public.seed_pilot_200_external_classes external_class on external_class.seq = assignment.external_class_seq
on conflict (id) do update set
  student_id = excluded.student_id,
  external_academy_class_id = excluded.external_academy_class_id,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.classes (
  id,
  academy_id,
  name,
  subject,
  grade_label
)
select
  class_item.id,
  academy_item.id,
  class_item.name,
  class_item.subject,
  class_item.grade_label
from public.seed_pilot_200_shared_classes class_item
join public.seed_pilot_200_shared_academies academy_item on academy_item.seq = class_item.academy_seq
on conflict (id) do update set
  academy_id = excluded.academy_id,
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
  schedule_share_consent_confirmed,
  schedule_share_consent_confirmed_at,
  status
)
select
  md5('pilot-200-shared-student-' || assignment.seq::text)::uuid,
  academy_item.id,
  shared_class.id,
  local_student.name,
  local_student.school_name,
  local_student.grade_label,
  local_student.name || ' 보호자',
  local_student.parent_phone,
  local_student.student_phone,
  true,
  now(),
  'active'
from public.seed_pilot_200_shared_assignments assignment
join public.seed_pilot_200_students local_student on local_student.seq = assignment.local_student_seq
join public.seed_pilot_200_shared_academies academy_item on academy_item.seq = assignment.academy_seq
join public.seed_pilot_200_shared_classes shared_class on shared_class.seq = assignment.class_seq
on conflict (id) do update set
  academy_id = excluded.academy_id,
  class_id = excluded.class_id,
  name = excluded.name,
  school_name = excluded.school_name,
  grade_label = excluded.grade_label,
  parent_name = excluded.parent_name,
  parent_phone = excluded.parent_phone,
  student_phone = excluded.student_phone,
  schedule_share_consent_confirmed = excluded.schedule_share_consent_confirmed,
  schedule_share_consent_confirmed_at = excluded.schedule_share_consent_confirmed_at,
  status = excluded.status;

insert into public.student_schedules (
  id,
  academy_id,
  student_id,
  class_id,
  schedule_type,
  schedule_date,
  day_of_week,
  start_time,
  end_time,
  subject,
  title,
  memo,
  is_active
)
select
  md5('pilot-200-shared-schedule-' || assignment.seq::text)::uuid,
  academy_item.id,
  md5('pilot-200-shared-student-' || assignment.seq::text)::uuid,
  shared_class.id,
  'regular_class',
  null,
  assignment.day_of_week,
  assignment.start_time,
  assignment.end_time,
  assignment.subject,
  assignment.title,
  '파일럿 200명: SaaS 연결 학원 공유 일정',
  true
from public.seed_pilot_200_shared_assignments assignment
join public.seed_pilot_200_shared_academies academy_item on academy_item.seq = assignment.academy_seq
join public.seed_pilot_200_shared_classes shared_class on shared_class.seq = assignment.class_seq
on conflict (id) do update set
  class_id = excluded.class_id,
  schedule_type = excluded.schedule_type,
  schedule_date = excluded.schedule_date,
  day_of_week = excluded.day_of_week,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  subject = excluded.subject,
  title = excluded.title,
  memo = excluded.memo,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.student_schedule_links (
  id,
  source_academy_id,
  source_student_id,
  target_academy_id,
  target_student_id,
  status,
  consent_method
)
select
  md5('pilot-200-schedule-link-' || assignment.seq::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  local_student.id,
  academy_item.id,
  md5('pilot-200-shared-student-' || assignment.seq::text)::uuid,
  'active',
  'manual'
from public.seed_pilot_200_shared_assignments assignment
join public.seed_pilot_200_students local_student on local_student.seq = assignment.local_student_seq
join public.seed_pilot_200_shared_academies academy_item on academy_item.seq = assignment.academy_seq
on conflict (id) do update set
  status = 'active',
  revoked_at = null,
  revoked_by = null;

insert into public.attendance_records (
  id,
  academy_id,
  student_id,
  class_id,
  teacher_id,
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
    'pilot-200-attendance-' ||
    student_item.seq::text || '-' ||
    date_item.attendance_date::text || '-' ||
    class_item.seq::text
  )::uuid,
  '11111111-1111-4111-8111-111111111111',
  student_item.id,
  class_item.id,
  class_record.teacher_id,
  date_item.attendance_date,
  class_item.start_time,
  class_item.end_time,
  -- 실제 학원 운영에 가깝게 과거 날짜는 대부분 정상 출석으로 두고,
  -- 날짜/반/학생 조합에 따라 소수의 지각, 결석, 확인 필요만 분산합니다.
  -- 오늘은 수업 직후 처리 전인 미체크가 일부 남고, 미래 날짜는 예정 상태로 둡니다.
  case
    when date_item.date_offset > 0 and ((student_item.seq + class_item.seq + date_item.date_offset) % 29) = 0 then 'makeup'
    when date_item.date_offset > 0 then 'pending'
    when ((student_item.seq * 3 + class_item.seq * 5 + extract(day from date_item.attendance_date)::integer) % 97) = 0 then 'absent'
    when ((student_item.seq * 5 + class_item.seq * 7 + extract(day from date_item.attendance_date)::integer) % 53) = 0 then 'late'
    when ((student_item.seq * 7 + class_item.seq * 11 + extract(day from date_item.attendance_date)::integer) % 71) = 0 then 'needs_check'
    when date_item.date_offset = 0 and ((student_item.seq + class_item.seq) % 11) = 0 then 'pending'
    when ((student_item.seq + class_item.seq * 13 + extract(day from date_item.attendance_date)::integer) % 127) = 0 then 'makeup'
    else 'present'
  end::public.attendance_status,
  case
    when date_item.date_offset > 0 then null
    when date_item.date_offset = 0 and ((student_item.seq + class_item.seq) % 11) = 0 then null
    else now() - (abs(date_item.date_offset) || ' days')::interval
  end,
  case
    when date_item.date_offset > 0 then null
    when ((student_item.seq * 3 + class_item.seq * 5 + extract(day from date_item.attendance_date)::integer) % 97) = 0 then null
    when ((student_item.seq * 7 + class_item.seq * 11 + extract(day from date_item.attendance_date)::integer) % 71) = 0 then null
    when date_item.date_offset = 0 and ((student_item.seq + class_item.seq) % 11) = 0 then null
    else now() - (abs(date_item.date_offset) || ' days')::interval
  end,
  case
    when date_item.date_offset > 0 then '파일럿 200명: 예정 수업'
    when ((student_item.seq * 3 + class_item.seq * 5 + extract(day from date_item.attendance_date)::integer) % 97) = 0 then '파일럿 200명: 날짜별 결석 연락 필요'
    when ((student_item.seq * 5 + class_item.seq * 7 + extract(day from date_item.attendance_date)::integer) % 53) = 0 then '파일럿 200명: 날짜별 지각'
    when ((student_item.seq * 7 + class_item.seq * 11 + extract(day from date_item.attendance_date)::integer) % 71) = 0 then '파일럿 200명: 날짜별 확인 필요'
    when ((student_item.seq + class_item.seq * 13 + extract(day from date_item.attendance_date)::integer) % 127) = 0 then '파일럿 200명: 날짜별 보강'
    when date_item.date_offset = 0 and ((student_item.seq + class_item.seq) % 11) = 0 then '파일럿 200명: 오늘 미체크'
    else '파일럿 200명: 정상 출석'
  end
from public.seed_pilot_200_students student_item
join public.seed_pilot_200_classes class_item on class_item.seq = student_item.class_seq
join public.classes class_record on class_record.id = class_item.id
join public.seed_pilot_200_dates date_item on date_item.day_of_week = any(class_item.days)
on conflict (
  academy_id,
  student_id,
  class_id,
  attendance_date,
  scheduled_start_time,
  scheduled_end_time
) do update set
  teacher_id = excluded.teacher_id,
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
  teacher_id,
  reason,
  message_body,
  recipient_type,
  status,
  sent_at,
  created_at
)
select
  md5('pilot-200-followup-' || attendance_item.student_id::text || '-' || attendance_item.status::text)::uuid,
  attendance_item.academy_id,
  attendance_item.student_id,
  attendance_item.class_id,
  attendance_item.teacher_id,
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
  and attendance_item.student_id in (select id from public.seed_pilot_200_students)
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
  md5('pilot-200-message-log-' || followup_item.id::text)::uuid,
  followup_item.academy_id,
  followup_item.id,
  'demo',
  'pilot-200-' || followup_item.id::text,
  student_item.parent_phone,
  followup_item.recipient_type,
  'dry_run'
from public.followups followup_item
join public.students student_item on student_item.id = followup_item.student_id
where followup_item.student_id in (select id from public.seed_pilot_200_students)
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
  and attendance_item.student_id in (select id from public.seed_pilot_200_students)
  and attendance_item.status in ('absent', 'late');

select
  (select count(*) from public.classes where id in (select id from public.seed_pilot_200_classes)) as pilot_class_count,
  (select count(*) from public.students where id in (select id from public.seed_pilot_200_students)) as pilot_student_count,
  (select count(*) from public.student_schedules where student_id in (select id from public.seed_pilot_200_students) and is_active = true) as pilot_regular_schedule_count,
  (select count(*) from public.student_external_class_enrollments where student_id in (select id from public.seed_pilot_200_students) and is_active = true) as pilot_manual_external_count,
  (select count(*) from public.student_schedule_links where source_student_id in (select id from public.seed_pilot_200_students) and status = 'active') as pilot_shared_link_count,
  (select count(*) from public.attendance_records where student_id in (select id from public.seed_pilot_200_students)) as pilot_attendance_count,
  (select count(*) from public.followups where student_id in (select id from public.seed_pilot_200_students)) as pilot_followup_count;

drop table if exists public.seed_pilot_200_shared_assignments;
drop table if exists public.seed_pilot_200_shared_classes;
drop table if exists public.seed_pilot_200_shared_academies;
drop table if exists public.seed_pilot_200_external_assignments;
drop table if exists public.seed_pilot_200_external_classes;
drop table if exists public.seed_pilot_200_external_academies;
drop table if exists public.seed_pilot_200_dates;
drop table if exists public.seed_pilot_200_students;
drop table if exists public.seed_pilot_200_classes;
