# 파일럿 seed 적용 상태 정합성 점검

작성일: 2026-06-01
대상 이슈: GitHub Issue #22, T-617 파일럿 seed 적용 상태 정합성 점검
작업 범위: 진단/문서화만 수행. Production DB 수정, destructive SQL 실행, 앱/API/seed 수정 없음.

## 1. 점검 목적

200명 운영형 파일럿 데이터가 실제 Production Supabase DB에 의도한 기준으로 들어갔는지 확인하기 위한 점검입니다.

현재 파일럿 UAT 문서 기준 기대값은 `학생 200명 / 반 20개`입니다. 하지만 200명 운영형 데이터 모바일 UAT 시점의 Production 화면과 리포트 API에서는 `학생 172명 / 반 19개 / 스케줄 미등록 74명`으로 확인되었습니다.

이 차이를 바로 보정하지 않고, 먼저 아래 항목을 분리해 확인합니다.

- 200명 seed가 실제로 전체 실행되었는지
- 다른 seed 또는 기존 데이터와 섞였는지
- 화면 집계 기준과 DB 원자료 집계 기준이 다른지
- 학생/반/스케줄의 active 조건 때문에 숫자가 다르게 보이는지
- 실제 파일럿 전에 기준 데이터를 200명으로 맞출지, 현재 Production 데이터를 기준으로 문서를 조정할지

## 2. 기대값과 현재값

### 기대값

`supabase/seed-pilot-200-students.sql` 기준:

- 더배움프라임영수학원 local 반: 20개
- 더배움프라임영수학원 local 학생: 200명
- 학생별 정규 수업 스케줄: 각 학생 2~3개 요일, 총 500개 예상
- 직접등록 타 학원 수업 연결: `seq % 5 = 0` 학생 대상, 40건 예상
- SaaS 연결 학원 공유 링크: 공유 동의 학생 중 짝수 seq 기준, 최대 30건
- 출석 기록: seed 날짜 범위와 수업 요일에 따라 생성

### 현재 확인값

`docs/testing/pilot-mobile-uat-200-students-2026-06.md` 기준:

- Production 화면/리포트 확인 학생: 172명
- Production 화면/리포트 확인 반: 19개
- 스케줄 미등록 학생: 74명
- 원장 문자 탭 반: 14개
- 관리 탭 반: 19개
- 관리 탭 직원: 5명

### 1차 판단

현재값은 `seed-pilot-200-students.sql`이 완전히 적용된 상태와 맞지 않습니다. 특히 200명 seed는 20개 반과 200명 학생을 고정 UUID로 upsert하므로, 정상 실행 후 local pilot ID 기준 count는 `20/200`이어야 합니다.

가능성이 큰 순서는 아래와 같습니다.

1. 200명 seed가 전체 실행되지 않았거나 중간에 실패했다.
2. 200명 seed가 아니라 `seed-demo-operations.sql`, `seed-volume.sql`, 수동 입력 데이터가 섞인 상태를 기준으로 UAT했다.
3. 200명 seed 실행 후 일부 데이터를 화면/관리 기능에서 수정하거나 삭제했다.
4. 화면은 `status = active`, `class_id`, `is_active` 같은 조건을 적용하고 있어 DB 총량과 다르게 보인다.
5. Production DB에는 200명 seed 보조 테이블이 마지막에 삭제되므로, 실행 결과 row를 놓쳤고 이후 실제 적용 여부를 별도 확인하지 않았다.

## 3. 확인용 SQL

아래 SQL은 모두 읽기 전용 확인 SQL입니다. Production SQL Editor에서 실행해도 데이터를 변경하지 않습니다.

### 3.1 기준 학원 확인

```sql
select
  id,
  name,
  slug,
  status,
  plan
from public.academies
where slug = 'thebaeum-prime'
   or id = '11111111-1111-4111-8111-111111111111';
```

### 3.2 전체 학생 수와 active 학생 수

```sql
select
  count(*) as total_students,
  count(*) filter (where status = 'active') as active_students,
  count(*) filter (where status <> 'active') as inactive_or_other_students,
  count(*) filter (where class_id is null) as students_without_class
from public.students
where academy_id = '11111111-1111-4111-8111-111111111111';
```

### 3.3 반 수와 active 학생이 연결된 반 수

```sql
select
  (select count(*)
   from public.classes
   where academy_id = '11111111-1111-4111-8111-111111111111') as total_classes,
  (select count(distinct class_id)
   from public.students
   where academy_id = '11111111-1111-4111-8111-111111111111'
     and status = 'active'
     and class_id is not null) as classes_with_active_students;
```

### 3.4 학생 상태별 집계

```sql
select
  coalesce(status, '(null)') as status,
  count(*) as student_count
from public.students
where academy_id = '11111111-1111-4111-8111-111111111111'
group by coalesce(status, '(null)')
order by student_count desc, status;
```

### 3.5 active 학생 중 class_id 없는 학생

```sql
select
  id,
  name,
  school_name,
  grade_label,
  status,
  class_id
from public.students
where academy_id = '11111111-1111-4111-8111-111111111111'
  and status = 'active'
  and class_id is null
order by name, id;
```

### 3.6 class_id가 존재하지 않는 반을 참조하는 학생 여부

```sql
select
  s.id,
  s.name,
  s.school_name,
  s.grade_label,
  s.status,
  s.class_id
from public.students s
left join public.classes c on c.id = s.class_id
where s.academy_id = '11111111-1111-4111-8111-111111111111'
  and s.class_id is not null
  and c.id is null
order by s.name, s.id;
```

### 3.7 스케줄 없는 active 학생 수

```sql
select
  count(*) as active_students_without_active_schedule
from public.students s
where s.academy_id = '11111111-1111-4111-8111-111111111111'
  and s.status = 'active'
  and not exists (
    select 1
    from public.student_schedules ss
    where ss.student_id = s.id
      and ss.academy_id = s.academy_id
      and ss.is_active = true
  );
```

### 3.8 student_schedules가 존재하지 않는 active 학생 목록

```sql
select
  s.id,
  s.name,
  s.school_name,
  s.grade_label,
  s.class_id,
  c.name as class_name
from public.students s
left join public.classes c on c.id = s.class_id
where s.academy_id = '11111111-1111-4111-8111-111111111111'
  and s.status = 'active'
  and not exists (
    select 1
    from public.student_schedules ss
    where ss.student_id = s.id
      and ss.academy_id = s.academy_id
      and ss.is_active = true
  )
order by c.name nulls last, s.grade_label, s.name, s.id;
```

### 3.9 반별 학생 수

```sql
select
  c.id as class_id,
  c.name as class_name,
  c.grade_label,
  c.subject,
  count(s.id) filter (where s.status = 'active') as active_student_count,
  count(s.id) as total_student_count
from public.classes c
left join public.students s on s.class_id = c.id
where c.academy_id = '11111111-1111-4111-8111-111111111111'
group by c.id, c.name, c.grade_label, c.subject
order by c.name;
```

### 3.10 반별 스케줄 수

```sql
select
  c.id as class_id,
  c.name as class_name,
  c.grade_label,
  c.subject,
  count(ss.id) filter (where ss.is_active = true) as active_schedule_count,
  count(distinct ss.student_id) filter (where ss.is_active = true) as students_with_schedule_count
from public.classes c
left join public.student_schedules ss on ss.class_id = c.id
where c.academy_id = '11111111-1111-4111-8111-111111111111'
group by c.id, c.name, c.grade_label, c.subject
order by c.name;
```

### 3.11 200명 seed 기대 ID 기준 누락 학생

`seed-pilot-200-students.sql`은 학생 ID를 `md5('pilot-200-student-' || seq)::uuid`로 생성합니다. seed 보조 테이블은 마지막에 삭제되므로, 아래처럼 기대 ID를 다시 생성해 누락을 확인합니다.

```sql
with expected_students as (
  select
    seq_value,
    md5('pilot-200-student-' || seq_value::text)::uuid as expected_student_id
  from generate_series(1, 200) as seqs(seq_value)
)
select
  e.seq_value,
  e.expected_student_id
from expected_students e
left join public.students s on s.id = e.expected_student_id
where s.id is null
order by e.seq_value;
```

### 3.12 200명 seed 기대 class 기준 누락 반

```sql
with expected_classes as (
  select
    seq_value,
    md5('pilot-200-class-' || seq_value::text)::uuid as expected_class_id
  from generate_series(1, 20) as seqs(seq_value)
)
select
  e.seq_value,
  e.expected_class_id
from expected_classes e
left join public.classes c on c.id = e.expected_class_id
where c.id is null
order by e.seq_value;
```

### 3.13 200명 기대값과 실제값 차이

```sql
with expected_students as (
  select md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
),
expected_classes as (
  select md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
)
select
  200 as expected_pilot_students,
  count(s.id) as actual_pilot_students,
  200 - count(s.id) as missing_pilot_students,
  20 as expected_pilot_classes,
  (select count(c.id)
   from expected_classes ec
   left join public.classes c on c.id = ec.id) as actual_pilot_classes,
  20 - (
    select count(c.id)
    from expected_classes ec
    left join public.classes c on c.id = ec.id
  ) as missing_pilot_classes
from expected_students es
left join public.students s on s.id = es.id;
```

### 3.14 200명 seed 학생 중 스케줄 없는 학생

```sql
with expected_students as (
  select
    seq_value,
    md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
)
select
  e.seq_value,
  e.id as student_id,
  s.name,
  s.school_name,
  s.grade_label,
  s.status,
  s.class_id
from expected_students e
join public.students s on s.id = e.id
where s.status = 'active'
  and not exists (
    select 1
    from public.student_schedules ss
    where ss.student_id = s.id
      and ss.is_active = true
  )
order by e.seq_value;
```

### 3.15 200명 seed 학생의 정규 스케줄 수 요약

```sql
with expected_students as (
  select
    seq_value,
    md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
),
schedule_counts as (
  select
    e.seq_value,
    e.id,
    count(ss.id) filter (where ss.is_active = true) as active_schedule_count
  from expected_students e
  left join public.student_schedules ss on ss.student_id = e.id
  group by e.seq_value, e.id
)
select
  active_schedule_count,
  count(*) as student_count
from schedule_counts
group by active_schedule_count
order by active_schedule_count;
```

### 3.16 200명 seed 실행 흔적 확인

```sql
select
  (select count(*) from public.students where id in (
    select md5('pilot-200-student-' || seq_value::text)::uuid
    from generate_series(1, 200) as seqs(seq_value)
  )) as pilot_200_student_id_count,
  (select count(*) from public.classes where id in (
    select md5('pilot-200-class-' || seq_value::text)::uuid
    from generate_series(1, 20) as seqs(seq_value)
  )) as pilot_200_class_id_count,
  (select count(*) from public.student_schedules where memo = '파일럿 200명: 반 공통 정규 수업') as pilot_200_regular_schedule_count,
  (select count(*) from public.attendance_records where note like '파일럿 200명:%') as pilot_200_attendance_count,
  (select count(*) from public.followups where message_body like '[더배움프라임]%') as pilot_200_followup_like_count,
  (select count(*) from public.message_logs where provider_message_id like 'pilot-200-%') as pilot_200_message_log_count;
```

### 3.17 다른 seed 데이터가 섞였는지 확인

```sql
select
  (select count(*) from public.students where parent_phone like '01088%') as operations_demo_students,
  (select count(*) from public.students where id::text between '33333333-3333-4333-8333-333333333401' and '33333333-3333-4333-8333-333333333448') as volume_seed_students,
  (select count(*) from public.students where id::text between '33333333-3333-4333-8333-333333333331' and '33333333-3333-4333-8333-333333333336') as mvp_seed_students,
  (select count(*) from public.student_schedules where memo like '운영 데모:%') as operations_demo_schedules,
  (select count(*) from public.student_schedules where memo = '파일럿 200명: 반 공통 정규 수업') as pilot_200_schedules;
```

## 4. 불일치 원인 후보

### 원인 후보 1. 200명 seed가 전체 실행되지 않음

`seed-pilot-200-students.sql`은 보조 테이블 생성, seed 데이터 구성, 기존 pilot 200 데이터 정리, 실제 insert/upsert, 검증 select, 보조 테이블 삭제 순서로 구성되어 있습니다. SQL Editor에서 일부만 선택 실행하거나 중간 오류가 발생하면 학생/반/스케줄 중 일부만 들어갈 수 있습니다.

확인 기준:

- `3.11`, `3.12`, `3.16` SQL에서 pilot 200 ID count가 200/20이 아니면 전체 실행이 아니거나 이후 일부 삭제된 상태입니다.

### 원인 후보 2. 200명 seed가 아니라 다른 seed 기준으로 운영 중

현재 repo에는 아래 seed가 공존합니다.

- `supabase/seed.sql`: MVP 최소 데이터
- `supabase/seed-volume.sql`: 48명 볼륨 테스트 데이터
- `supabase/seed-demo-operations.sql`: 64명 운영 리허설 데이터
- `supabase/seed-shared-schedule-operations-demo.sql`: 공유 일정 데모 데이터
- `supabase/seed-pilot-200-students.sql`: 200명 운영형 파일럿 데이터

UAT의 `학생 172명 / 반 19개`는 200명 seed 단독 기대값과 다릅니다. 여러 seed가 섞였거나 200명 seed가 아닌 운영형 데모 데이터를 기준으로 검수했을 가능성이 있습니다.

확인 기준:

- `3.17`에서 `operations_demo_students`, `volume_seed_students`, `mvp_seed_students`가 동시에 존재하면 seed 혼재 상태입니다.

### 원인 후보 3. 기존 데이터와 충돌 또는 수동 수정

200명 seed는 자기 고정 UUID 데이터는 upsert하지만, 기존 MVP/volume/operations 데이터 전체를 항상 정리하지는 않습니다. 반대로 seed 이후 관리 화면에서 일부 학생/반이 비활성화 또는 삭제되었을 수도 있습니다.

확인 기준:

- `3.4` 학생 상태별 집계
- `3.11` 누락 학생
- `3.12` 누락 반
- `3.17` 다른 seed 흔적

### 원인 후보 4. 학생 id range 일부 누락

200명 seed 학생 ID는 range 숫자 문자열이 아니라 `md5('pilot-200-student-' || seq)::uuid` 방식입니다. 따라서 단순 UUID 문자 범위로 확인하면 누락 판단이 틀릴 수 있습니다.

확인 기준:

- 반드시 `generate_series(1, 200)`으로 기대 ID를 재생성해 비교해야 합니다.

### 원인 후보 5. 반 20개 중 1개 생성 실패

200명 seed 반 ID는 `md5('pilot-200-class-' || seq)::uuid`입니다. 현재 반 19개는 class 하나가 누락되었거나, 화면이 active 학생이 연결된 반만 보여주는 조건 때문에 달라졌을 수 있습니다.

확인 기준:

- `3.12` 기대 class 누락 확인
- `3.3` 전체 반 수와 active 학생 연결 반 수 비교

### 원인 후보 6. 스케줄 생성 쿼리가 일부 학생에게 적용되지 않음

200명 seed는 학생의 `class_seq`와 반의 `days`를 기준으로 정규 스케줄을 생성합니다. 정상이라면 모든 200명 학생에게 active 정규 스케줄이 최소 2개 이상 있어야 합니다.

확인 기준:

- `3.14` 200명 seed 학생 중 스케줄 없는 학생
- `3.15` active schedule count 분포

### 원인 후보 7. active/inactive/status 조건 때문에 화면 집계와 DB 집계가 다름

앱의 여러 관리/홈 집계는 `student.status = 'active'`, `student_schedules.is_active = true`, `class_id` 유무에 영향을 받습니다. DB 총 학생 수와 화면의 재원 학생 수는 다를 수 있습니다.

확인 기준:

- `3.2` 전체/active 학생
- `3.4` 상태별 집계
- `3.7` active 학생 중 스케줄 없는 학생

### 원인 후보 8. Production 데이터가 파일럿 검수용 DB와 분리되지 않음

실제 운영형 테스트 seed와 수동 입력 데이터가 같은 Production DB에 누적되면, UAT의 기준값이 계속 흔들립니다.

확인 기준:

- `3.17` seed 혼재 확인
- 파일럿 전 “기준 DB”를 하나로 고정할지, 별도 Supabase project/academy slug를 사용할지 결정 필요

## 5. Production DB에서 확인해야 할 항목

Production SQL Editor에서 아래 순서로 확인합니다.

1. 기준 학원 ID가 `11111111-1111-4111-8111-111111111111`인지 확인
2. 전체 학생 수와 active 학생 수 확인
3. 전체 반 수와 active 학생이 연결된 반 수 확인
4. 200명 seed 기대 ID 기준 누락 학생 확인
5. 200명 seed 기대 class 기준 누락 반 확인
6. active 학생 중 스케줄 없는 학생 목록 확인
7. 다른 seed 데이터 흔적 확인
8. 화면 count와 DB count가 어떤 기준에서 달라지는지 확인

Production에서 확인 결과를 기록할 때는 아래 표로 남깁니다.

| 항목 | 기대값 | 확인값 | 판단 |
| --- | ---: | ---: | --- |
| pilot 200 학생 ID count | 200 |  |  |
| pilot 200 반 ID count | 20 |  |  |
| active 전체 학생 | 200 또는 파일럿 기준값 |  |  |
| 전체 반 | 20 또는 파일럿 기준값 |  |  |
| 스케줄 없는 active 학생 | 0 |  |  |
| operations demo 학생 | 0 또는 분리 기준값 |  |  |
| volume seed 학생 | 0 또는 분리 기준값 |  |  |

## 6. 수정 후보 SQL

이 섹션의 SQL은 바로 실행하지 않습니다. 확인용 SQL 결과를 사람이 검토한 뒤 Supabase SQL Editor에서 선택 실행하는 후보입니다.

### 실행 전 주의사항

- 실제 학원 개인정보가 들어간 DB에서는 seed 재실행 또는 정리 SQL을 실행하지 않습니다.
- `seed-pilot-200-students.sql`은 내부에 `delete` 문이 포함되어 있습니다.
- Production에서 실행 전 현재 DB 백업 또는 Supabase point-in-time recovery 가능 여부를 확인합니다.
- 실제 파일럿 DB를 `thebaeum-prime` 그대로 쓸지, 별도 academy slug를 만들지 먼저 결정합니다.

### 안전한 보정 SQL 후보 A: 수정 없이 기준값만 확정

확인 SQL 결과 현재 Production 데이터가 실제로 172명 운영형 데이터로 의도된 상태라면, DB를 수정하지 않고 UAT 기준 문서만 172명 기준으로 정정합니다.

실행 SQL 없음.

권장 조건:

- `pilot_200_student_id_count`가 낮고, 200명 seed를 실행하지 않은 것이 의도였음
- 실제 파일럿은 172명 데이터로 충분함
- 원장 시연에 200명 정확도가 중요하지 않음

### 안전한 보정 SQL 후보 B: 200명 seed 전체 재실행

확인 결과 200명 seed를 파일럿 기준으로 고정하기로 결정하면, repo의 `supabase/seed-pilot-200-students.sql` 파일 전체를 Supabase SQL Editor에서 실행합니다.

주의:

- 파일 일부가 아니라 전체 파일을 실행해야 합니다.
- 이 파일은 기존 pilot 200 고정 UUID 데이터와 연결 공유 seed 일부를 정리한 뒤 다시 생성합니다.
- 다른 seed에서 들어간 데이터는 일부 남을 수 있으므로, 실행 후 반드시 `3.13`, `3.16`, `3.17`을 다시 실행합니다.

실행 후 확인 SQL:

```sql
with expected_students as (
  select md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
),
expected_classes as (
  select md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
)
select
  (select count(s.id) from expected_students e join public.students s on s.id = e.id) as pilot_students,
  (select count(c.id) from expected_classes e join public.classes c on c.id = e.id) as pilot_classes,
  (select count(*) from public.student_schedules where memo = '파일럿 200명: 반 공통 정규 수업' and is_active = true) as pilot_regular_schedules,
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111' and status = 'active') as active_students_in_academy;
```

### 안전한 보정 SQL 후보 C: 누락 class/student만 재생성하는 별도 보정 script 작성

확인 결과 200명 seed 중 일부만 누락되었고, 기존 Production 데이터를 최대한 보존해야 한다면 전체 seed 재실행보다 별도 보정 script를 새 이슈/PR로 작성합니다.

이번 문서에서는 직접 보정 SQL을 만들지 않습니다. 이유:

- 누락 원인에 따라 학생만 보정할지, 반/스케줄/출석/공유 링크까지 함께 보정할지 달라집니다.
- 잘못된 부분 보정은 중복 출석 기록이나 반별 학생 수 왜곡을 만들 수 있습니다.

권장 조건:

- `3.11` 누락 학생이 일부만 존재
- `3.12` 누락 반이 일부만 존재
- 다른 seed/수동 데이터가 이미 많이 섞여 있어 전체 재실행이 위험

### 롤백 기준

수정 후보 SQL 실행 후 아래 중 하나라도 발생하면 즉시 롤백 또는 재검토합니다.

- pilot 200 학생 ID count가 200이 아님
- pilot 200 반 ID count가 20이 아님
- active 학생 중 스케줄 없는 학생이 계속 다수 존재
- 원장/선생님 테스트 계정의 담당 반 필터가 바뀜
- 실제 학원 개인정보가 들어간 데이터가 seed 데이터와 섞임
- 홈/출석/문자/관리 화면 count가 문서 기준과 다시 불일치

## 7. 권장 조치

### 바로 수정: 완료

2026-06-03 기준으로 사용자가 Supabase SQL Editor에서 아래 순서의 SQL을 직접 실행했습니다.

1. `supabase/seed-pilot-200-students.sql` 전체 실행
2. 기존 테스트/데모 학생과 반을 정리하고 pilot 200 학생/반만 남기는 cleanup SQL 실행
3. verify SQL 실행

실행은 앱 코드나 seed 파일 변경이 아니라 Production/파일럿 DB 데이터 정리 작업입니다. 이 문서 PR에서는 DB를 직접 수정하지 않고, 사용자가 확인한 결과값만 기록합니다.

### 현재 기준 데이터

아래 값이 Supabase SQL Editor verify 결과와 앱 관리 화면에서 확인되었습니다.

| 항목 | 기대값 | 최종 확인값 | 판단 |
| --- | ---: | ---: | --- |
| 전체 학생 | 200 | 200 | 정상 |
| active 학생 | 200 | 200 | 정상 |
| pilot 200 학생 ID count | 200 | 200 | 정상 |
| 전체 반 | 20 | 20 | 정상 |
| pilot 200 반 ID count | 20 | 20 | 정상 |
| active 스케줄 | 580 | 580 | 정상 |
| pilot 정규 스케줄 | 580 | 580 | 정상 |
| 스케줄 없는 active 학생 | 0 | 0 | 정상 |

따라서 파일럿 기준 데이터는 `학생 200명 / 반 20개 / 정규 스케줄 580개 / 스케줄 미등록 0명`으로 고정합니다.

### 보류

추가 DB 보정 SQL은 현재 필요하지 않습니다.

### 주의

- demo seed, volume seed, 이전 operations demo 데이터는 더 이상 파일럿 기준으로 사용하지 않습니다.
- 실제 학원 개인정보를 넣기 전까지는 200명 fake seed를 기준으로 모바일 UAT와 원장/선생님 시연을 진행합니다.
- 실제 학원 데이터로 전환할 때는 별도 체크리스트와 백업 기준을 두고 진행합니다.

## 8. 최종 결론

선택: **추가 조치 불필요**

이유:

- 초기 불일치였던 `학생 172명 / 반 19개 / 스케줄 미등록 74명` 상태는 더 이상 현재 기준이 아닙니다.
- 2026-06-03 후속 cleanup/verify 결과, 200명 seed 기준값이 정상화되었습니다.
- 앱 관리 화면에서도 학생 200명 count가 확인되었습니다.
- DB schema, API, 화면 집계 코드 수정 없이 데이터 정리로 문제가 해소되었습니다.

보조 결론:

- seed 파일 수정은 필요하지 않습니다.
- API/화면 집계 코드 수정도 필요하지 않습니다.
- Issue #22는 이 문서 업데이트와 PR merge 후 닫을 수 있습니다.

## 9. 후속 GitHub Issue 후보

현재 T-617 범위에서는 추가 이슈가 필요하지 않습니다.

다만 실제 파일럿 진행 전에는 별도 우선순위로 아래 검수만 이어가면 됩니다.

- 200명 기준 모바일 홈/출석/문자/관리 smoke 재확인
- owner/teacher/assistant 계정별 권한 smoke 재확인
- 실제 학원 데이터 전환 전 백업/정리 체크리스트 확인

이 항목들은 새 데이터 보정 이슈가 아니라 파일럿 릴리즈 체크리스트 또는 UAT 작업에서 다루는 것이 적절합니다.
