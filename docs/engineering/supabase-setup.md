# Supabase 적용 순서

이 문서는 실제 Supabase DB와 repo의 schema/migration/seed 상태가 어긋나지 않게 하기 위한 운영 순서입니다.

## 적용 순서

1. Supabase SQL Editor에서 `supabase/schema.sql` 또는 아직 적용하지 않은 `supabase/migrations/*.sql`을 먼저 실행합니다.
2. 아래 확인 SQL로 필수 컬럼이 있는지 확인합니다.
3. `supabase/seed.sql`을 실행해 MVP 최소 데이터를 넣습니다.
4. `/app`에서 학생, 스케줄, 출석부 화면이 열리는지 확인합니다.
5. 많은 학생 수로 모바일/스크롤 테스트가 필요할 때만 `supabase/seed-volume.sql`을 추가 실행합니다.
6. 운영 리허설처럼 매일 수업/출석/문자 기록이 필요할 때만 `supabase/seed-demo-operations.sql`을 추가 실행합니다.

## 필수 컬럼 확인

```sql
select table_name, column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('students', 'followups', 'message_logs', 'profiles', 'academies', 'academy_settings')
  and column_name in (
    'student_phone',
    'recipient_type',
    'phone',
    'status',
    'sender_phone',
    'sms_dry_run',
    'allow_assistant_send',
    'duplicate_guard_minutes'
  )
order by table_name, column_name;
```

필수 확인 결과:

- `students.student_phone`
- `followups.recipient_type`
- `message_logs.recipient_type`
- `profiles.phone`
- `profiles.status`
- `academies.sender_phone`
- `academy_settings.sms_dry_run`
- `academy_settings.allow_assistant_send`
- `academy_settings.duplicate_guard_minutes`

위 컬럼 중 하나라도 없으면 앱 코드보다 실제 Supabase DB migration 적용 상태를 먼저 확인합니다.

## 최근 누락 컬럼 복구 SQL

`column followups.recipient_type does not exist`가 나오면 아래 SQL을 Supabase SQL Editor에서 실행합니다.

```sql
alter table public.students
  add column if not exists student_phone text;

alter table public.followups
  add column if not exists recipient_type text not null default 'parent';

alter table public.message_logs
  add column if not exists recipient_type text not null default 'parent';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'followups_recipient_type_check'
  ) then
    alter table public.followups
      add constraint followups_recipient_type_check
      check (recipient_type in ('parent', 'student', 'both'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'message_logs_recipient_type_check'
  ) then
    alter table public.message_logs
      add constraint message_logs_recipient_type_check
      check (recipient_type in ('parent', 'student', 'both'));
  end if;
end $$;
```

이 SQL은 `add column if not exists`와 constraint 존재 확인을 사용하므로 같은 DB에서 반복 실행해도 기존 컬럼을 다시 만들지 않습니다.

## 구성원/설정 컬럼 복구 SQL

로그인 후 `profiles.status does not exist`, 학원 설정 저장 실패, 발신번호 조회 실패가 나오면 아래 SQL 적용 여부를 확인합니다.

```sql
alter table public.profiles
  add column if not exists phone text;

alter table public.profiles
  add column if not exists status text not null default 'active';

alter table public.academies
  add column if not exists sender_phone text;

create table if not exists public.academy_settings (
  academy_id uuid primary key references public.academies(id) on delete cascade,
  sms_dry_run boolean not null default true,
  allow_assistant_send boolean not null default false,
  duplicate_guard_minutes integer not null default 1440,
  parent_phone_masking boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

운영 DB에서는 destructive SQL을 실행하지 않고, 누락 컬럼 추가만 수행합니다.

## MVP Seed 확인

`supabase/seed.sql` 실행 후 아래 쿼리로 데이터 규모를 확인합니다.

```sql
select
  (select count(*) from public.classes where academy_id = '11111111-1111-4111-8111-111111111111') as class_count,
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111') as student_count,
  (select count(*) from public.student_schedules where academy_id = '11111111-1111-4111-8111-111111111111') as schedule_count,
  (select count(*) from public.attendance_records where academy_id = '11111111-1111-4111-8111-111111111111') as attendance_count;
```

MVP seed 기준으로 학생 수는 4~8명 수준이어야 합니다. 수십 명 이상이면 volume seed가 함께 실행된 상태입니다.

## Volume Seed 정리

볼륨 테스트 데이터를 지우고 MVP 데이터만 다시 보고 싶을 때는 아래 SQL을 검토한 뒤 실행합니다. 운영 데이터가 섞인 DB에서는 실행하지 않습니다.

```sql
delete from public.attendance_records
where student_id::text between '33333333-3333-4333-8333-333333333401'
  and '33333333-3333-4333-8333-333333333448';

delete from public.student_schedules
where student_id::text between '33333333-3333-4333-8333-333333333401'
  and '33333333-3333-4333-8333-333333333448';

delete from public.students
where id::text between '33333333-3333-4333-8333-333333333401'
  and '33333333-3333-4333-8333-333333333448';

drop table if exists public.seed_pilot_volume_students;
```

## Operations Demo Seed 확인

`supabase/seed-demo-operations.sql`은 원장 운영 리허설용 데이터입니다. 실행하면 오늘 날짜 기준으로 최근 6일, 오늘, 다음 6일의 수업/출석 기록을 생성합니다.

Supabase SQL Editor에서는 파일 전체를 한 번에 실행합니다. 일부 구간만 선택 실행하면 seed 보조 테이블이 만들어지지 않아 `relation "seed_demo_operations_classes" does not exist` 오류가 날 수 있습니다.

이 seed는 실행 중 `public.seed_demo_operations_classes`, `public.seed_demo_operations_students`, `public.seed_demo_operations_dates` 보조 테이블을 만들고, 마지막에 자동으로 삭제합니다. 중간에 실패해도 재실행 시 처음에 보조 테이블을 정리합니다.

```sql
select
  (select count(*) from public.classes where name in (
    '중1 수학 기본반',
    '중1 영어 내신반',
    '중2 수학 A반',
    '중2 영어 독해반',
    '중3 수학 심화반',
    '중3 영어 문법반',
    '고1 영어 내신반',
    '고1 수학 개념반'
  )) as demo_class_count,
  (select count(*) from public.students where parent_phone like '01088%') as demo_student_count,
  (select count(*) from public.student_schedules where memo like '운영 데모:%') as demo_schedule_count,
  (select count(*) from public.attendance_records where note like '운영 데모:%') as demo_attendance_count,
  (select count(*) from public.message_logs where provider = 'demo') as demo_message_log_count;
```

예상 규모:

- 반 8개
- 학생 64명
- 주간 반복 스케줄 192개 이상
- 오늘 기준 전후 13일 범위 출석 기록
- 결석/지각 dry-run 팔로업 및 message log 일부

## Operations Demo Seed 정리

운영 데모 데이터를 지우고 MVP/볼륨 데이터만 남기고 싶을 때는 아래 SQL을 검토한 뒤 실행합니다.

```sql
delete from public.message_logs
where provider = 'demo'
  and provider_message_id like 'demo-operations-%';

delete from public.attendance_records
where note like '운영 데모:%';

delete from public.student_schedules
where memo like '운영 데모:%';

delete from public.followups
where student_id in (
  select id from public.students where parent_phone like '01088%'
);

delete from public.students
where parent_phone like '01088%';

delete from public.classes
where name in (
  '중1 수학 기본반',
  '중1 영어 내신반',
  '중2 수학 A반',
  '중2 영어 독해반',
  '중3 수학 심화반',
  '중3 영어 문법반',
  '고1 영어 내신반',
  '고1 수학 개념반'
);
```

## 운영 주의

- 실제 DB에 destructive SQL을 자동 실행하지 않습니다.
- schema 불일치 오류가 나면 앱 코드를 수정하기 전에 migration 적용 여부를 먼저 확인합니다.
- seed는 파일럿 검증 데이터입니다. 실제 학원 데이터 입력 전에는 seed 실행 범위를 명확히 분리합니다.
- `seed-demo-operations.sql`은 실제 학원 데이터가 들어간 DB에서 실행하지 않습니다.
