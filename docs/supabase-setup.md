# Supabase 적용 순서

이 문서는 실제 Supabase DB와 repo의 schema/migration/seed 상태가 어긋나지 않게 하기 위한 운영 순서입니다.

## 적용 순서

1. Supabase SQL Editor에서 `supabase/schema.sql` 또는 아직 적용하지 않은 `supabase/migrations/*.sql`을 먼저 실행합니다.
2. 아래 확인 SQL로 필수 컬럼이 있는지 확인합니다.
3. `supabase/seed.sql`을 실행해 MVP 최소 데이터를 넣습니다.
4. `/app`에서 학생, 스케줄, 출석부 화면이 열리는지 확인합니다.
5. 많은 학생 수로 모바일/스크롤 테스트가 필요할 때만 `supabase/seed-volume.sql`을 추가 실행합니다.

## 필수 컬럼 확인

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'students'
  and column_name in ('student_phone');
```

결과에 `student_phone`이 없으면 `supabase/migrations/20260508020000_add_message_recipient_selection.sql` 또는 최신 `supabase/schema.sql`이 실제 DB에 반영되지 않은 상태입니다.

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

## 운영 주의

- 실제 DB에 destructive SQL을 자동 실행하지 않습니다.
- schema 불일치 오류가 나면 앱 코드를 수정하기 전에 migration 적용 여부를 먼저 확인합니다.
- seed는 파일럿 검증 데이터입니다. 실제 학원 데이터 입력 전에는 seed 실행 범위를 명확히 분리합니다.
