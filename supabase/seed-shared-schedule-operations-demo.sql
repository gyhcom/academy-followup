-- Academy Follow-up shared schedule operations demo seed data
-- 여러 학생이 여러 학원 일정과 공유/충돌되는 운영형 데모 데이터입니다.
--
-- 실행 전 `supabase/seed-demo-operations.sql`을 먼저 실행해
-- 더배움프라임영수학원 64명 운영 데모 학생을 준비합니다.
--
-- 이 seed는 실제 개인정보가 아닌 운영/시연용 더미 데이터에서만 실행합니다.
-- 반복 실행해도 이 seed가 관리하는 고정 UUID 데이터만 upsert합니다.

do $$
begin
  if (
    select count(*)
    from public.students
    where academy_id = '11111111-1111-4111-8111-111111111111'
      and id in (
        md5('demo-operations-student-3')::uuid,
        md5('demo-operations-student-5')::uuid,
        md5('demo-operations-student-7')::uuid,
        md5('demo-operations-student-10')::uuid,
        md5('demo-operations-student-12')::uuid,
        md5('demo-operations-student-18')::uuid,
        md5('demo-operations-student-21')::uuid,
        md5('demo-operations-student-27')::uuid,
        md5('demo-operations-student-34')::uuid,
        md5('demo-operations-student-42')::uuid,
        md5('demo-operations-student-51')::uuid,
        md5('demo-operations-student-60')::uuid
      )
  ) < 10 then
    raise exception '먼저 supabase/seed-demo-operations.sql을 실행해 더배움 운영 데모 학생을 준비해 주세요.';
  end if;
end $$;

drop table if exists public.seed_shared_operations_academies;
drop table if exists public.seed_shared_operations_classes;
drop table if exists public.seed_shared_operations_assignments;
drop table if exists public.seed_shared_operations_schedules;

create table public.seed_shared_operations_academies (
  seq integer primary key,
  id uuid not null,
  name text not null,
  slug text not null,
  category text not null,
  brand_color text not null
);

create table public.seed_shared_operations_classes (
  seq integer primary key,
  academy_seq integer not null,
  id uuid not null,
  name text not null,
  subject text not null,
  grade_label text not null
);

create table public.seed_shared_operations_assignments (
  seq integer primary key,
  local_student_seq integer not null,
  academy_seq integer not null,
  class_seq integer not null
);

create table public.seed_shared_operations_schedules (
  seq integer primary key,
  assignment_seq integer not null,
  day_of_week smallint not null,
  start_time time not null,
  end_time time not null,
  subject text not null,
  title text not null
);

alter table public.seed_shared_operations_academies enable row level security;
alter table public.seed_shared_operations_classes enable row level security;
alter table public.seed_shared_operations_assignments enable row level security;
alter table public.seed_shared_operations_schedules enable row level security;

insert into public.seed_shared_operations_academies (
  seq,
  id,
  name,
  slug,
  category,
  brand_color
) values
  (1, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '다솜수학학원', 'dasom-math-demo', '수학 · 논술 보강 확인용 학원', '#315C7C'),
  (2, 'bbbb1111-bbbb-4bbb-8bbb-bbbbbbbb1111', '리딩논술학원', 'reading-essay-demo', '논술 · 독서 토론 학원', '#8A4F7D'),
  (3, 'cccc1111-cccc-4ccc-8ccc-cccccccc1111', '탑클래스영어학원', 'topclass-english-demo', '영어 내신 · 리딩 학원', '#B66A2C');

insert into public.seed_shared_operations_classes (
  seq,
  academy_seq,
  id,
  name,
  subject,
  grade_label
) values
  (1, 1, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '중2 논술 보강 확인반', '논술', '중2'),
  (2, 1, 'aaaa2222-aaaa-4aaa-8aaa-aaaaaaaa2222', '중등 수학 클리닉', '수학', '중등'),
  (3, 2, 'bbbb2222-bbbb-4bbb-8bbb-bbbbbbbb2222', '중등 독서토론 A반', '논술', '중등'),
  (4, 2, 'bbbb3333-bbbb-4bbb-8bbb-bbbbbbbb3333', '고등 논술 심화반', '논술', '고등'),
  (5, 3, 'cccc2222-cccc-4ccc-8ccc-cccccccc2222', '중등 영어 리딩반', '영어', '중등'),
  (6, 3, 'cccc3333-cccc-4ccc-8ccc-cccccccc3333', '고등 영어 내신반', '영어', '고등');

insert into public.seed_shared_operations_assignments (
  seq,
  local_student_seq,
  academy_seq,
  class_seq
) values
  (1, 3, 1, 1),
  (2, 5, 2, 3),
  (3, 7, 3, 5),
  (4, 10, 1, 2),
  (5, 12, 2, 3),
  (6, 18, 3, 5),
  (7, 21, 1, 1),
  (8, 27, 2, 4),
  (9, 34, 3, 6),
  (10, 42, 1, 2),
  (11, 51, 2, 4),
  (12, 60, 3, 6);

insert into public.seed_shared_operations_schedules (
  seq,
  assignment_seq,
  day_of_week,
  start_time,
  end_time,
  subject,
  title
) values
  (1, 1, 2, '19:30', '20:30', '논술', '논술학원'),
  (2, 1, 4, '19:30', '20:30', '논술', '논술학원'),
  (3, 2, 1, '20:00', '21:30', '논술', '독서토론'),
  (4, 2, 3, '20:00', '21:30', '논술', '독서토론'),
  (5, 3, 5, '18:30', '20:00', '영어', '영어 리딩'),
  (6, 4, 6, '10:00', '12:00', '수학', '수학 클리닉'),
  (7, 5, 2, '19:00', '20:20', '논술', '독서 논술'),
  (8, 5, 4, '19:00', '20:20', '논술', '독서 논술'),
  (9, 6, 1, '18:40', '20:10', '영어', '영어 문법'),
  (10, 6, 3, '18:40', '20:10', '영어', '영어 문법'),
  (11, 7, 2, '20:30', '21:30', '논술', '논술 보강'),
  (12, 8, 5, '19:30', '21:00', '논술', '고등 논술'),
  (13, 9, 2, '20:00', '21:30', '영어', '고등 영어'),
  (14, 9, 4, '20:00', '21:30', '영어', '고등 영어'),
  (15, 10, 0, '14:00', '16:00', '수학', '주말 수학 클리닉'),
  (16, 11, 6, '09:30', '11:30', '논술', '주말 논술'),
  (17, 12, 5, '20:10', '21:40', '영어', '고등 내신'),
  (18, 12, 6, '13:00', '15:00', '영어', '주말 영어 클리닉');

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
from public.seed_shared_operations_academies
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
from public.seed_shared_operations_academies
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
  academy_item.id,
  class_item.name,
  class_item.subject,
  class_item.grade_label,
  null
from public.seed_shared_operations_classes class_item
join public.seed_shared_operations_academies academy_item on academy_item.seq = class_item.academy_seq
on conflict (id) do update set
  academy_id = excluded.academy_id,
  name = excluded.name,
  subject = excluded.subject,
  grade_label = excluded.grade_label,
  teacher_id = excluded.teacher_id;

update public.students local_student
set schedule_share_consent_confirmed = true,
    schedule_share_consent_confirmed_at = coalesce(local_student.schedule_share_consent_confirmed_at, now()),
    schedule_share_consent_confirmed_by = coalesce(
      local_student.schedule_share_consent_confirmed_by,
      (
        select profile.id
        from public.profiles profile
        where profile.academy_id = local_student.academy_id
          and profile.role in ('owner', 'manager')
        order by case profile.role when 'owner' then 0 else 1 end, profile.created_at
        limit 1
      )
    )
where local_student.academy_id = '11111111-1111-4111-8111-111111111111'
  and local_student.id in (
    select md5('demo-operations-student-' || assignment.local_student_seq::text)::uuid
    from public.seed_shared_operations_assignments assignment
  );

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
  md5('shared-operations-remote-student-' || academy_item.slug || '-' || assignment.local_student_seq::text)::uuid,
  academy_item.id,
  class_item.id,
  local_student.name,
  local_student.school_name,
  local_student.grade_label,
  local_student.parent_name,
  local_student.parent_phone,
  local_student.student_phone,
  true,
  now(),
  null,
  'active'
from public.seed_shared_operations_assignments assignment
join public.seed_shared_operations_academies academy_item on academy_item.seq = assignment.academy_seq
join public.seed_shared_operations_classes class_item on class_item.seq = assignment.class_seq
join public.students local_student
  on local_student.id = md5('demo-operations-student-' || assignment.local_student_seq::text)::uuid
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
  schedule_share_consent_confirmed_by = excluded.schedule_share_consent_confirmed_by,
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
)
select
  md5(
    'shared-operations-remote-schedule-' ||
    schedule_item.assignment_seq::text || '-' ||
    schedule_item.day_of_week::text || '-' ||
    schedule_item.start_time::text
  )::uuid,
  academy_item.id,
  md5('shared-operations-remote-student-' || academy_item.slug || '-' || assignment.local_student_seq::text)::uuid,
  class_item.id,
  'regular_class',
  schedule_item.day_of_week,
  schedule_item.start_time,
  schedule_item.end_time,
  schedule_item.subject,
  schedule_item.title,
  '공유 운영 데모: 연결 학원 보강 불가 일정',
  true
from public.seed_shared_operations_schedules schedule_item
join public.seed_shared_operations_assignments assignment on assignment.seq = schedule_item.assignment_seq
join public.seed_shared_operations_academies academy_item on academy_item.seq = assignment.academy_seq
join public.seed_shared_operations_classes class_item on class_item.seq = assignment.class_seq
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
  is_active = true,
  updated_at = now();

insert into public.student_schedule_links (
  id,
  source_academy_id,
  source_student_id,
  target_academy_id,
  target_student_id,
  status,
  consent_method,
  created_by,
  revoked_at,
  revoked_by
)
select
  md5('shared-operations-link-' || academy_item.slug || '-' || assignment.local_student_seq::text)::uuid,
  '11111111-1111-4111-8111-111111111111',
  md5('demo-operations-student-' || assignment.local_student_seq::text)::uuid,
  academy_item.id,
  md5('shared-operations-remote-student-' || academy_item.slug || '-' || assignment.local_student_seq::text)::uuid,
  'active',
  'manual',
  (
    select profile.id
    from public.profiles profile
    where profile.academy_id = '11111111-1111-4111-8111-111111111111'
      and profile.role in ('owner', 'manager')
    order by case profile.role when 'owner' then 0 else 1 end, profile.created_at
    limit 1
  ),
  null,
  null
from public.seed_shared_operations_assignments assignment
join public.seed_shared_operations_academies academy_item on academy_item.seq = assignment.academy_seq
where not exists (
  select 1
  from public.student_schedule_links existing_link
  where existing_link.status = 'active'
    and least(existing_link.source_student_id::text, existing_link.target_student_id::text) =
      least(
        md5('demo-operations-student-' || assignment.local_student_seq::text)::uuid::text,
        md5('shared-operations-remote-student-' || academy_item.slug || '-' || assignment.local_student_seq::text)::uuid::text
      )
    and greatest(existing_link.source_student_id::text, existing_link.target_student_id::text) =
      greatest(
        md5('demo-operations-student-' || assignment.local_student_seq::text)::uuid::text,
        md5('shared-operations-remote-student-' || academy_item.slug || '-' || assignment.local_student_seq::text)::uuid::text
      )
)
on conflict (id) do update set
  status = excluded.status,
  consent_method = excluded.consent_method,
  created_by = excluded.created_by,
  revoked_at = null,
  revoked_by = null;

select
  (select count(*) from public.academies where slug in ('dasom-math-demo', 'reading-essay-demo', 'topclass-english-demo')) as shared_demo_academy_count,
  (
    select count(*)
    from public.students
    where academy_id = '11111111-1111-4111-8111-111111111111'
      and schedule_share_consent_confirmed = true
      and id in (
        select md5('demo-operations-student-' || assignment.local_student_seq::text)::uuid
        from public.seed_shared_operations_assignments assignment
      )
  ) as local_consent_on_count,
  (
    select count(*)
    from public.students
    where academy_id in (select id from public.seed_shared_operations_academies)
      and schedule_share_consent_confirmed = true
  ) as remote_consent_on_count,
  (
    select count(*)
    from public.student_schedule_links link
    where link.status = 'active'
      and link.source_student_id in (
        select md5('demo-operations-student-' || assignment.local_student_seq::text)::uuid
        from public.seed_shared_operations_assignments assignment
      )
      and link.target_academy_id in (select id from public.seed_shared_operations_academies)
  ) as active_shared_link_count,
  (
    select count(*)
    from public.student_schedules schedule
    where schedule.academy_id in (select id from public.seed_shared_operations_academies)
      and schedule.memo = '공유 운영 데모: 연결 학원 보강 불가 일정'
      and schedule.is_active = true
  ) as remote_shared_schedule_count;

drop table if exists public.seed_shared_operations_schedules;
drop table if exists public.seed_shared_operations_assignments;
drop table if exists public.seed_shared_operations_classes;
drop table if exists public.seed_shared_operations_academies;

-- 정리 SQL이 필요하면 아래를 검토 후 별도 실행합니다.
--
-- update public.student_schedule_links
-- set status = 'revoked',
--     revoked_at = now()
-- where id::text in (
--   select md5('shared-operations-link-' || academy_slug || '-' || local_seq::text)::uuid::text
--   from (
--     values
--       ('dasom-math-demo', 3), ('reading-essay-demo', 5), ('topclass-english-demo', 7),
--       ('dasom-math-demo', 10), ('reading-essay-demo', 12), ('topclass-english-demo', 18),
--       ('dasom-math-demo', 21), ('reading-essay-demo', 27), ('topclass-english-demo', 34),
--       ('dasom-math-demo', 42), ('reading-essay-demo', 51), ('topclass-english-demo', 60)
--   ) as managed_links(academy_slug, local_seq)
-- );
--
-- delete from public.student_schedules
-- where memo = '공유 운영 데모: 연결 학원 보강 불가 일정';
--
-- delete from public.students
-- where id in (
--   select md5('shared-operations-remote-student-' || academy_slug || '-' || local_seq::text)::uuid
--   from (
--     values
--       ('dasom-math-demo', 3), ('reading-essay-demo', 5), ('topclass-english-demo', 7),
--       ('dasom-math-demo', 10), ('reading-essay-demo', 12), ('topclass-english-demo', 18),
--       ('dasom-math-demo', 21), ('reading-essay-demo', 27), ('topclass-english-demo', 34),
--       ('dasom-math-demo', 42), ('reading-essay-demo', 51), ('topclass-english-demo', 60)
--   ) as managed_students(academy_slug, local_seq)
-- );
