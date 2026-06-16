-- Academy Follow-up realistic pilot attendance reset
-- 목적: 이미 적용된 pilot seed를 학원 운영형 출석부 검수 데이터로 다시 맞춥니다.
-- 실행 대상: 개인정보 없는 파일럿/시연 DB.
-- 주의: 실제 학원 개인정보가 들어간 운영 DB에서는 실행하지 마세요.
-- 선행 조건: supabase/seed-pilot-200-students.sql이 먼저 실행되어 있어야 합니다.
--            이 파일은 학생/반 seed를 새로 만들지 않고, 기존 pilot 학생을 재배치합니다.
--
-- 운영형 패턴:
-- - 주요 8개 반만 active 운영 대상으로 사용합니다.
-- - 반별 학생 수는 17~20명으로 섞습니다. 총 active 학생은 148명입니다.
-- - 나머지 pilot 학생은 삭제하지 않고 inactive + class_id null로 제외합니다.
-- - 과거 날짜: 대부분 정상 출석
-- - 지각: 수업별 0~2명 수준으로 날짜마다 분산
-- - 결석: 가끔 0~1명 수준
-- - 확인 필요: 소수만 발생
-- - 오늘: 아직 처리 전인 미체크 일부 유지
-- - 미래 날짜: 예정 상태(pending)

-- 1. Preview: 현재 pilot 데이터 규모 확인
with
pilot_students as (
  select seq_value as seq, md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
),
pilot_classes as (
  select seq_value as seq, md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
),
class_distribution(class_seq, expected_students, start_seq, end_seq) as (
  values
    (1, 20, 1, 20),
    (2, 19, 21, 39),
    (3, 18, 40, 57),
    (4, 20, 58, 77),
    (5, 17, 78, 94),
    (6, 19, 95, 113),
    (7, 18, 114, 131),
    (8, 17, 132, 148)
)
select
  (select count(*) from public.students where id in (select id from pilot_students)) as pilot_students,
  (select count(*) from public.students where id in (select id from pilot_students) and status = 'active') as current_active_pilot_students,
  (select sum(expected_students) from class_distribution) as expected_active_after_reset,
  (select count(*) from public.classes where id in (select id from pilot_classes)) as pilot_classes,
  (
    select count(*)
    from public.attendance_records
    where academy_id = '11111111-1111-4111-8111-111111111111'
      and student_id in (select id from pilot_students)
  ) as current_pilot_attendance_records,
  (
    select count(*)
    from public.followups
    where academy_id = '11111111-1111-4111-8111-111111111111'
      and student_id in (select id from pilot_students)
      and message_body like '[더배움프라임] 안녕하세요.%'
  ) as current_seed_followups;

-- 2. Apply: pilot 출석/seed 연락 기록을 8개 반 가변 인원 운영형 패턴으로 재생성
do $$
declare
  academy uuid := '11111111-1111-4111-8111-111111111111'::uuid;
begin
  if (
    select count(*)
    from public.students
    where academy_id = academy
      and id in (
        select md5('pilot-200-student-' || seq_value::text)::uuid
        from generate_series(1, 200) as seqs(seq_value)
      )
  ) = 0 then
    raise exception 'pilot-200 학생이 없습니다. 먼저 supabase/seed-pilot-200-students.sql 전체를 실행한 뒤 이 reset SQL을 실행하세요.';
  end if;

  if (
    select count(*)
    from public.classes
    where academy_id = academy
      and id in (
        select md5('pilot-200-class-' || seq_value::text)::uuid
        from generate_series(1, 20) as seqs(seq_value)
      )
  ) = 0 then
    raise exception 'pilot-200 반이 없습니다. 먼저 supabase/seed-pilot-200-students.sql 전체를 실행한 뒤 이 reset SQL을 실행하세요.';
  end if;

  -- 기존 pilot 200명 중 앞 148명만 active 운영 대상으로 둡니다.
  -- 8개 반 학생 수: 20, 19, 18, 20, 17, 19, 18, 17
  with
  pilot_students as (
    select seq_value as seq, md5('pilot-200-student-' || seq_value::text)::uuid as id
    from generate_series(1, 200) as seqs(seq_value)
  ),
  class_distribution(class_seq, expected_students, start_seq, end_seq) as (
    values
      (1, 20, 1, 20),
      (2, 19, 21, 39),
      (3, 18, 40, 57),
      (4, 20, 58, 77),
      (5, 17, 78, 94),
      (6, 19, 95, 113),
      (7, 18, 114, 131),
      (8, 17, 132, 148)
  ),
  active_assignment as (
    select
      pilot_students.seq,
      pilot_students.id,
      class_distribution.class_seq,
      md5('pilot-200-class-' || class_distribution.class_seq::text)::uuid as class_id
    from pilot_students
    join class_distribution
      on pilot_students.seq between class_distribution.start_seq and class_distribution.end_seq
  )
  update public.students student_item
  set class_id = active_assignment.class_id,
      grade_label = coalesce(class_item.grade_label, student_item.grade_label),
      status = case when active_assignment.id is null then 'inactive' else 'active' end,
      school_name = case
        when active_assignment.id is null then student_item.school_name
        when class_item.grade_label like '고%' and pilot_students.seq % 2 = 0 then '온양고'
        when class_item.grade_label like '고%' then '설화고'
        when class_item.grade_label = '무학년제' then '탕정초중'
        when pilot_students.seq % 4 = 0 then '한들중'
        when pilot_students.seq % 3 = 0 then '설화중'
        else '탕정중'
      end
  from pilot_students
  left join active_assignment on active_assignment.id = pilot_students.id
  left join public.classes class_item on class_item.id = active_assignment.class_id
  where student_item.id = pilot_students.id
    and student_item.academy_id = academy;

  delete from public.student_schedules
  where academy_id = academy
    and student_id in (
      select md5('pilot-200-student-' || seq_value::text)::uuid
      from generate_series(1, 200) as seqs(seq_value)
    )
    and schedule_type = 'regular_class'
    and memo = '파일럿 200명: 반 공통 정규 수업';

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
  with
  pilot_students as (
    select seq_value as seq, md5('pilot-200-student-' || seq_value::text)::uuid as id
    from generate_series(1, 200) as seqs(seq_value)
  ),
  class_distribution(class_seq, expected_students, start_seq, end_seq) as (
    values
      (1, 20, 1, 20),
      (2, 19, 21, 39),
      (3, 18, 40, 57),
      (4, 20, 58, 77),
      (5, 17, 78, 94),
      (6, 19, 95, 113),
      (7, 18, 114, 131),
      (8, 17, 132, 148)
  ),
  active_assignment as (
    select
      pilot_students.seq,
      pilot_students.id,
      class_distribution.class_seq,
      md5('pilot-200-class-' || class_distribution.class_seq::text)::uuid as class_id
    from pilot_students
    join class_distribution
      on pilot_students.seq between class_distribution.start_seq and class_distribution.end_seq
  )
  select
    md5('pilot-200-regular-schedule-' || active_assignment.seq::text || '-' || day_value::text)::uuid,
    academy,
    student_item.id,
    class_item.id,
    class_item.teacher_id,
    'regular_class',
    null,
    day_value,
    case active_assignment.class_seq
      when 1 then '16:00'::time
      when 2 then '17:40'::time
      when 3 then '18:00'::time
      when 4 then '19:40'::time
      when 5 then '16:30'::time
      when 6 then '19:10'::time
      when 7 then '17:00'::time
      else '18:50'::time
    end,
    case active_assignment.class_seq
      when 1 then '17:30'::time
      when 2 then '19:10'::time
      when 3 then '19:30'::time
      when 4 then '21:10'::time
      when 5 then '19:00'::time
      when 6 then '21:10'::time
      when 7 then '18:40'::time
      else '20:30'::time
    end,
    class_item.subject,
    class_item.name,
    '파일럿 200명: 반 공통 정규 수업',
    true
  from active_assignment
  join public.students student_item on student_item.id = active_assignment.id
  join public.classes class_item on class_item.id = active_assignment.class_id
  cross join lateral unnest(
    case
      when active_assignment.class_seq in (1, 3, 5, 7) then array[1,3,5]::smallint[]
      else array[2,4,6]::smallint[]
    end
  ) as day_value
  where student_item.academy_id = academy
    and student_item.status = 'active'
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

  delete from public.message_logs
  where academy_id = academy
    and (
      provider_message_id like 'pilot-200-%'
      or followup_id in (
        select id
        from public.followups
        where academy_id = academy
          and student_id in (
            select md5('pilot-200-student-' || seq_value::text)::uuid
            from generate_series(1, 200) as seqs(seq_value)
          )
          and message_body like '[더배움프라임] 안녕하세요.%'
      )
    );

  delete from public.attendance_records
  where academy_id = academy
    and student_id in (
      select md5('pilot-200-student-' || seq_value::text)::uuid
      from generate_series(1, 200) as seqs(seq_value)
    );

  delete from public.followups
  where academy_id = academy
    and student_id in (
      select md5('pilot-200-student-' || seq_value::text)::uuid
      from generate_series(1, 200) as seqs(seq_value)
    )
    and message_body like '[더배움프라임] 안녕하세요.%';

  insert into public.attendance_records (
    id,
    academy_id,
    student_id,
    class_id,
    teacher_id,
    student_schedule_id,
    attendance_date,
    scheduled_start_time,
    scheduled_end_time,
    status,
    checked_at,
    arrived_at,
    note
  )
  with
  pilot_students as (
    select seq_value as seq, md5('pilot-200-student-' || seq_value::text)::uuid as id
    from generate_series(1, 200) as seqs(seq_value)
  ),
  pilot_classes as (
    select seq_value as seq, md5('pilot-200-class-' || seq_value::text)::uuid as id
    from generate_series(1, 20) as seqs(seq_value)
  ),
  month_dates as (
    select
      date_value::date as attendance_date,
      extract(dow from date_value)::smallint as day_of_week,
      (date_value::date - current_date)::integer as date_offset,
      extract(day from date_value)::integer as day_of_month
    from generate_series(
      date_trunc('month', current_date)::date,
      (date_trunc('month', current_date) + interval '1 month - 1 day')::date,
      interval '1 day'
    ) as dates(date_value)
  ),
  schedule_rows as (
    select
      pilot_students.seq as student_seq,
      pilot_classes.seq as class_seq,
      student_item.id as student_id,
      class_item.id as class_id,
      class_item.teacher_id,
      schedule_item.id as student_schedule_id,
      schedule_item.start_time,
      schedule_item.end_time,
      month_dates.attendance_date,
      month_dates.date_offset,
      month_dates.day_of_month
    from pilot_students
    join public.students student_item on student_item.id = pilot_students.id
    join public.student_schedules schedule_item
      on schedule_item.student_id = student_item.id
     and schedule_item.academy_id = academy
     and schedule_item.is_active = true
     and schedule_item.schedule_type = 'regular_class'
     and schedule_item.memo = '파일럿 200명: 반 공통 정규 수업'
    join public.classes class_item on class_item.id = schedule_item.class_id
    join pilot_classes on pilot_classes.id = class_item.id
    join month_dates on month_dates.day_of_week = schedule_item.day_of_week
    where student_item.academy_id = academy
      and student_item.status = 'active'
  ),
  calculated as (
    select
      *,
      case
        when date_offset > 0 and ((student_seq + class_seq + date_offset) % 37) = 0 then 'makeup'
        when date_offset > 0 then 'pending'
        when ((student_seq * 3 + class_seq * 5 + day_of_month) % 113) = 0 then 'absent'
        when ((student_seq * 5 + class_seq * 7 + day_of_month) % 61) = 0 then 'late'
        when ((student_seq * 7 + class_seq * 11 + day_of_month) % 83) = 0 then 'needs_check'
        when date_offset = 0 and ((student_seq + class_seq) % 13) = 0 then 'pending'
        when ((student_seq + class_seq * 13 + day_of_month) % 149) = 0 then 'makeup'
        else 'present'
      end::public.attendance_status as attendance_status
    from schedule_rows
  )
  select
    md5(
      'pilot-200-attendance-' ||
      student_seq::text || '-' ||
      attendance_date::text || '-' ||
      class_seq::text
    )::uuid,
    academy,
    student_id,
    class_id,
    teacher_id,
    student_schedule_id,
    attendance_date,
    start_time,
    end_time,
    attendance_status,
    case
      when date_offset > 0 then null
      when attendance_status = 'pending' then null
      else now() - (abs(date_offset) || ' days')::interval
    end,
    case
      when date_offset > 0 then null
      when attendance_status in ('absent', 'needs_check', 'pending') then null
      else now() - (abs(date_offset) || ' days')::interval
    end,
    case
      when date_offset > 0 then '파일럿 운영형: 예정 수업'
      when attendance_status = 'absent' then '파일럿 운영형: 날짜별 결석 연락 필요'
      when attendance_status = 'late' then '파일럿 운영형: 날짜별 지각'
      when attendance_status = 'needs_check' then '파일럿 운영형: 날짜별 확인 필요'
      when attendance_status = 'makeup' then '파일럿 운영형: 날짜별 보강'
      when attendance_status = 'pending' then '파일럿 운영형: 오늘 미체크'
      else '파일럿 운영형: 정상 출석'
    end
  from calculated;

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
  where attendance_item.academy_id = academy
    and attendance_item.attendance_date = current_date
    and attendance_item.student_id in (
      select md5('pilot-200-student-' || seq_value::text)::uuid
      from generate_series(1, 200) as seqs(seq_value)
    )
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
  where followup_item.academy_id = academy
    and followup_item.student_id in (
      select md5('pilot-200-student-' || seq_value::text)::uuid
      from generate_series(1, 200) as seqs(seq_value)
    )
    and followup_item.message_body like '[더배움프라임] 안녕하세요.%'
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
    and attendance_item.student_id in (
      select md5('pilot-200-student-' || seq_value::text)::uuid
      from generate_series(1, 200) as seqs(seq_value)
    )
    and attendance_item.status in ('absent', 'late')
    and followup_item.message_body like '[더배움프라임] 안녕하세요.%';
end $$;

-- 3. Verify: 날짜별 분포 확인
with
pilot_students as (
  select md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
)
select
  attendance_date,
  count(*) as total,
  count(*) filter (where status = 'present') as present,
  count(*) filter (where status = 'late') as late,
  count(*) filter (where status = 'absent') as absent,
  count(*) filter (where status = 'needs_check') as needs_check,
  count(*) filter (where status = 'makeup') as makeup,
  count(*) filter (where status = 'pending') as pending
from public.attendance_records
where academy_id = '11111111-1111-4111-8111-111111111111'
  and student_id in (select id from pilot_students)
  and attendance_date between date_trunc('month', current_date)::date
      and (date_trunc('month', current_date) + interval '1 month - 1 day')::date
group by attendance_date
order by attendance_date;

-- 4. Verify: active 반별 학생 수 확인. 주요 8개 반은 17~20명으로 섞여야 합니다.
with
pilot_classes as (
  select seq_value as seq, md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
),
expected_distribution(class_seq, expected_students) as (
  values
    (1, 20),
    (2, 19),
    (3, 18),
    (4, 20),
    (5, 17),
    (6, 19),
    (7, 18),
    (8, 17)
)
select
  pilot_classes.seq as class_seq,
  class_item.name,
  coalesce(expected_distribution.expected_students, 0) as expected_students,
  count(student_item.id) as active_student_count
from pilot_classes
join public.classes class_item on class_item.id = pilot_classes.id
left join expected_distribution on expected_distribution.class_seq = pilot_classes.seq
left join public.students student_item
  on student_item.class_id = class_item.id
 and student_item.academy_id = '11111111-1111-4111-8111-111111111111'
 and student_item.status = 'active'
group by pilot_classes.seq, class_item.name, expected_distribution.expected_students
order by pilot_classes.seq;

-- 5. Verify: active/inactive pilot 학생 수와 스케줄 수 확인
with
pilot_students as (
  select md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
)
select
  count(*) filter (where student_item.status = 'active') as active_pilot_students,
  count(*) filter (where student_item.status <> 'active') as inactive_pilot_students,
  (
    select count(*)
    from public.student_schedules schedule_item
    where schedule_item.student_id in (select id from pilot_students)
      and schedule_item.academy_id = '11111111-1111-4111-8111-111111111111'
      and schedule_item.is_active = true
      and schedule_item.schedule_type = 'regular_class'
      and schedule_item.memo = '파일럿 200명: 반 공통 정규 수업'
  ) as active_regular_schedules
from public.students student_item
where student_item.id in (select id from pilot_students)
  and student_item.academy_id = '11111111-1111-4111-8111-111111111111';
