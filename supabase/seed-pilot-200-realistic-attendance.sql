-- Academy Follow-up 200-student realistic attendance reset
-- 목적: 이미 적용된 200명 pilot seed의 출석 데이터를 월간 캘린더 검수에 맞게 다시 생성합니다.
-- 실행 대상: 개인정보 없는 파일럿/시연 DB.
-- 주의: 실제 학원 개인정보가 들어간 운영 DB에서는 실행하지 마세요.
--
-- 운영형 패턴:
-- - 주요 10개 반에 학생 20명씩 배정
-- - 과거 날짜: 대부분 정상 출석
-- - 지각: 수업별 0~2명 수준으로 날짜마다 분산
-- - 결석: 가끔 0~1명 수준
-- - 확인 필요: 소수만 발생
-- - 오늘: 아직 처리 전인 미체크 일부 유지
-- - 미래 날짜: 예정 상태(pending)

-- 1. Preview: 현재 pilot 200 출석 데이터 규모 확인
with
pilot_students as (
  select seq_value as seq, md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
),
pilot_classes as (
  select seq_value as seq, md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
)
select
  (select count(*) from public.students where id in (select id from pilot_students)) as pilot_students,
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

-- 2. Apply: pilot 200 출석/seed 연락 기록을 월간 운영형 패턴으로 재생성
do $$
declare
  academy uuid := '11111111-1111-4111-8111-111111111111'::uuid;
begin
  -- 기존 20개 반 10명 배정은 출석부 검수 밀도가 낮으므로,
  -- 주요 10개 반에 20명씩 재배정합니다. 반 레코드 20개 자체는 유지합니다.
  update public.students student_item
  set class_id = class_item.id,
      grade_label = class_item.grade_label,
      school_name = case
        when class_item.grade_label like '고%' and pilot.seq % 2 = 0 then '온양고'
        when class_item.grade_label like '고%' then '설화고'
        when class_item.grade_label = '무학년제' then '탕정초중'
        when pilot.seq % 4 = 0 then '한들중'
        when pilot.seq % 3 = 0 then '설화중'
        else '탕정중'
      end
  from (
    select
      seq_value as seq,
      md5('pilot-200-student-' || seq_value::text)::uuid as id,
      md5('pilot-200-class-' || (((seq_value - 1) / 20) + 1)::text)::uuid as class_id
    from generate_series(1, 200) as seqs(seq_value)
  ) pilot
  join public.classes class_item on class_item.id = pilot.class_id
  where student_item.id = pilot.id
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
    select
      seq_value as seq,
      md5('pilot-200-student-' || seq_value::text)::uuid as id,
      (((seq_value - 1) / 20) + 1) as class_seq
    from generate_series(1, 200) as seqs(seq_value)
  ),
  pilot_classes as (
    select seq_value as seq, md5('pilot-200-class-' || seq_value::text)::uuid as id
    from generate_series(1, 10) as seqs(seq_value)
  )
  select
    md5('pilot-200-regular-schedule-' || pilot_students.seq::text || '-' || day_value::text)::uuid,
    academy,
    student_item.id,
    class_item.id,
    class_item.teacher_id,
    'regular_class',
    null,
    day_value,
    case class_seq
      when 1 then '16:00'::time
      when 2 then '17:40'::time
      when 3 then '18:00'::time
      when 4 then '19:40'::time
      when 5 then '16:30'::time
      when 6 then '19:10'::time
      when 7 then '17:00'::time
      when 8 then '18:50'::time
      when 9 then '19:30'::time
      else '16:30'::time
    end,
    case class_seq
      when 1 then '17:30'::time
      when 2 then '19:10'::time
      when 3 then '19:30'::time
      when 4 then '21:10'::time
      when 5 then '19:00'::time
      when 6 then '21:10'::time
      when 7 then '18:40'::time
      when 8 then '20:30'::time
      when 9 then '21:30'::time
      else '18:30'::time
    end,
    class_item.subject,
    class_item.name,
    '파일럿 200명: 반 공통 정규 수업',
    true
  from pilot_students
  join public.students student_item on student_item.id = pilot_students.id
  join pilot_classes on pilot_classes.seq = pilot_students.class_seq
  join public.classes class_item on class_item.id = pilot_classes.id
  cross join lateral unnest(
    case
      when pilot_students.class_seq in (1, 3, 5, 7, 9) then array[1,3,5]::smallint[]
      else array[2,4,6]::smallint[]
    end
  ) as day_value
  where student_item.academy_id = academy
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
        when date_offset > 0 and ((student_seq + class_seq + date_offset) % 29) = 0 then 'makeup'
        when date_offset > 0 then 'pending'
        when ((student_seq * 3 + class_seq * 5 + day_of_month) % 97) = 0 then 'absent'
        when ((student_seq * 5 + class_seq * 7 + day_of_month) % 53) = 0 then 'late'
        when ((student_seq * 7 + class_seq * 11 + day_of_month) % 71) = 0 then 'needs_check'
        when date_offset = 0 and ((student_seq + class_seq) % 11) = 0 then 'pending'
        when ((student_seq + class_seq * 13 + day_of_month) % 127) = 0 then 'makeup'
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
      when date_offset > 0 then '파일럿 200명: 예정 수업'
      when attendance_status = 'absent' then '파일럿 200명: 날짜별 결석 연락 필요'
      when attendance_status = 'late' then '파일럿 200명: 날짜별 지각'
      when attendance_status = 'needs_check' then '파일럿 200명: 날짜별 확인 필요'
      when attendance_status = 'makeup' then '파일럿 200명: 날짜별 보강'
      when attendance_status = 'pending' then '파일럿 200명: 오늘 미체크'
      else '파일럿 200명: 정상 출석'
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

-- 4. Verify: 반별 학생 수 확인. 주요 10개 반은 각 20명이어야 합니다.
with
pilot_classes as (
  select seq_value as seq, md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
)
select
  pilot_classes.seq as class_seq,
  class_item.name,
  count(student_item.id) as student_count
from pilot_classes
join public.classes class_item on class_item.id = pilot_classes.id
left join public.students student_item
  on student_item.class_id = class_item.id
 and student_item.academy_id = '11111111-1111-4111-8111-111111111111'
 and student_item.status = 'active'
group by pilot_classes.seq, class_item.name
order by pilot_classes.seq;
