# 운영 데이터 정리 전 선행 점검 - 2026-06

이 문서는 200명 seed/demo 데이터를 실제 운영 데이터로 전환하기 전에 확인할 안전 점검 기준입니다. 아래 SQL은 사람이 Supabase SQL Editor에서 직접 실행하는 용도이며, 반드시 `Preview -> Cleanup -> Verify` 순서로 진행합니다.

## 1. 점검 목적

- 200명 seed/demo 데이터를 지우더라도 계정, 학원 설정, 문자 템플릿, 권한 정책은 보존합니다.
- 실제 운영 데이터 20~30명 투입 직후 홈, 출석, 문자, 관리 흐름을 바로 확인할 수 있게 기준 DB를 정리합니다.
- destructive SQL은 자동 실행하지 않고, Preview 결과가 예상과 맞을 때만 사람이 Cleanup SQL을 실행합니다.

## 2. 정리 전 기준 스냅샷

2026-06 운영 전환 전 확인된 파일럿 기준값:

| 항목 | 기준값 |
| --- | ---: |
| 전체 학생 | 200 |
| active 학생 | 200 |
| pilot 학생 | 200 |
| 전체 반 | 20 |
| pilot 반 | 20 |
| active 스케줄 | 580 |
| pilot 정규 스케줄 | 580 |
| active 학생 중 스케줄 미등록 | 0 |

정리 전 권장 백업:

- 관리 > 리포트에서 학생 목록 CSV 다운로드
- 출석 기록 CSV 다운로드
- 문자/연락 기록 CSV 다운로드
- 감사 로그 CSV 다운로드
- 개인정보가 이미 들어간 DB라면 정리 전 별도 백업 여부를 원장이 확인

## 3. 보존/삭제 대상

### 삭제하지 않는 대상

| 대상 | 이유 |
| --- | --- |
| `auth.users` | 로그인 계정 원본 |
| `profiles` | 원장/선생님/보조 선생님 권한 연결 |
| `academies`의 더배움 학원 row | 워크스페이스 자체 |
| `academy_settings`의 더배움 설정 | `sms_dry_run`, `allow_assistant_send`, 중복 방지 설정 |
| `message_templates` | 실제 운영 시작 때 바로 사용할 문자 템플릿 |
| `platform_admins` | 슈퍼어드민 권한 |

### 삭제 후보

| 대상 | 기준 |
| --- | --- |
| 200명 seed 학생/반 | `md5('pilot-200-student-*')`, `md5('pilot-200-class-*')` |
| 학생 스케줄 | seed 학생/반 기준 스케줄 |
| 출석 기록 | seed 학생/반 기준 기록 |
| followups/message logs | seed 학생 기준 연락 기록/문자 로그 |
| 공유 코드/공유 링크 | seed 학생 또는 seed 공유 학원 기준 |
| 수동 타 학원 수업 demo 데이터 | `pilot-200-manual-*` UUID 기준 |
| seed 공유 학원 | `pilot-200-shared-academy-*` UUID 기준 |
| seed/test 감사 로그 | seed/demo 문구 또는 seed 학생/반 entity 기준 |

## 4. Production 환경 안전 확인

정리 전 아래 상태를 확인합니다.

| 확인 항목 | 기준 |
| --- | --- |
| Vercel backend URL | Production에 `NEXT_PUBLIC_BACKEND_API_URL` 미설정 |
| Spring Boot | Production 미연결, 로컬 검증만 사용 |
| SMS 설정 | `academy_settings.sms_dry_run=true` |
| Assistant 발송 | `academy_settings.allow_assistant_send=false` |
| SOLAPI | 실제 학부모 번호 발송 전 테스트 번호 1건 검증 전까지 미사용 |

환경/설정 확인 SQL:

```sql
select
  academy_item.id,
  academy_item.name,
  academy_item.slug,
  settings.sms_dry_run,
  settings.allow_assistant_send,
  settings.duplicate_guard_minutes,
  settings.parent_phone_masking
from public.academies academy_item
left join public.academy_settings settings on settings.academy_id = academy_item.id
where academy_item.id = '11111111-1111-4111-8111-111111111111';
```

계정/권한 확인 SQL:

```sql
select
  email,
  name,
  role,
  status,
  academy_id
from public.profiles
where academy_id = '11111111-1111-4111-8111-111111111111'
order by role, email;
```

## 5. 실제 데이터 투입 준비

정리 전에 실제 운영 CSV 템플릿을 먼저 준비합니다.

필수 필드:

- 학생명
- 학교
- 학년
- 소속 반
- 학부모 연락처
- 학생 연락처
- 수업 요일
- 수업 시작 시간
- 수업 종료 시간
- 담당 선생님
- 타 학원 스케줄 공유 동의 여부

초기 투입 기준:

- 반 1~2개
- 학생 20~30명
- 선생님 1~3명
- 스케줄 미등록 학생 0명 목표
- 실제 발송은 계속 `sms_dry_run=true` 상태에서 화면/기록 먼저 검증

## 6. Preview SQL

먼저 삭제 대상 숫자만 확인합니다. 이 SQL은 데이터를 변경하지 않습니다.

```sql
with
target_academy as (
  select '11111111-1111-4111-8111-111111111111'::uuid as id
),
pilot_students as (
  select md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
),
pilot_classes as (
  select md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
),
pilot_external_academies as (
  select md5('pilot-200-manual-external-academy-' || seq_value::text)::uuid as id
  from generate_series(1, 4) as seqs(seq_value)
),
pilot_external_classes as (
  select md5('pilot-200-manual-external-class-' || seq_value::text)::uuid as id
  from generate_series(1, 6) as seqs(seq_value)
),
pilot_shared_academies as (
  select md5('pilot-200-shared-academy-' || seq_value::text)::uuid as id
  from generate_series(1, 3) as seqs(seq_value)
),
pilot_followups as (
  select id
  from public.followups
  where student_id in (select id from pilot_students)
     or academy_id in (select id from pilot_shared_academies)
),
pilot_message_logs as (
  select id
  from public.message_logs
  where followup_id in (select id from pilot_followups)
     or provider_message_id like 'pilot-200-%'
),
pilot_audit_logs as (
  select id
  from public.audit_logs
  where academy_id = (select id from target_academy)
    and (
      summary ilike '%pilot%'
      or summary ilike '%파일럿%'
      or summary ilike '%seed%'
      or entity_id in (select id from pilot_students)
      or entity_id in (select id from pilot_classes)
    )
)
select
  (select count(*) from public.students where academy_id = (select id from target_academy)) as current_students,
  (select count(*) from public.students where id in (select id from pilot_students)) as delete_pilot_students,
  (select count(*) from public.classes where academy_id = (select id from target_academy)) as current_classes,
  (select count(*) from public.classes where id in (select id from pilot_classes)) as delete_pilot_classes,
  (select count(*) from public.student_schedules where student_id in (select id from pilot_students) or class_id in (select id from pilot_classes) or academy_id in (select id from pilot_shared_academies)) as delete_student_schedules,
  (select count(*) from public.attendance_records where student_id in (select id from pilot_students) or class_id in (select id from pilot_classes)) as delete_attendance_records,
  (select count(*) from public.followups where id in (select id from pilot_followups)) as delete_followups,
  (select count(*) from public.message_logs where id in (select id from pilot_message_logs)) as delete_message_logs,
  (select count(*) from public.student_share_tokens where student_id in (select id from pilot_students) or academy_id in (select id from pilot_shared_academies)) as delete_share_tokens,
  (select count(*) from public.student_schedule_links where source_student_id in (select id from pilot_students) or target_student_id in (select id from pilot_students) or source_academy_id in (select id from pilot_shared_academies) or target_academy_id in (select id from pilot_shared_academies)) as delete_schedule_links,
  (select count(*) from public.student_external_class_enrollments where student_id in (select id from pilot_students) or external_academy_class_id in (select id from pilot_external_classes)) as delete_external_enrollments,
  (select count(*) from public.external_academy_classes where id in (select id from pilot_external_classes)) as delete_external_classes,
  (select count(*) from public.external_academies where id in (select id from pilot_external_academies)) as delete_external_academies,
  (select count(*) from public.academies where id in (select id from pilot_shared_academies)) as delete_shared_academies,
  (select count(*) from public.audit_logs where id in (select id from pilot_audit_logs)) as delete_seed_audit_logs,
  (select count(*) from public.profiles where academy_id = (select id from target_academy)) as keep_profiles,
  (select count(*) from public.message_templates where academy_id = (select id from target_academy)) as keep_message_templates;
```

Preview 기대 방향:

- `delete_pilot_students = 200`
- `delete_pilot_classes = 20`
- `delete_student_schedules = 580` 이상일 수 있음
- `keep_profiles`, `keep_message_templates`는 0이 아니어야 함
- 실제 개인정보가 섞인 DB라면 Preview 결과 확인 후 Cleanup을 중단합니다.

## 7. Cleanup SQL

Preview 결과가 예상과 맞을 때만 실행합니다. 이 SQL은 200명 seed/demo 운영 데이터만 정리하고, 로그인 계정/프로필/더배움 학원/설정/문자 템플릿은 삭제하지 않습니다.

```sql
do $$
declare
  target_academy uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  pilot_student_ids uuid[];
  pilot_class_ids uuid[];
  pilot_external_academy_ids uuid[];
  pilot_external_class_ids uuid[];
  pilot_shared_academy_ids uuid[];
  pilot_followup_ids uuid[];
begin
  select array_agg(md5('pilot-200-student-' || seq_value::text)::uuid)
  into pilot_student_ids
  from generate_series(1, 200) as seqs(seq_value);

  select array_agg(md5('pilot-200-class-' || seq_value::text)::uuid)
  into pilot_class_ids
  from generate_series(1, 20) as seqs(seq_value);

  select array_agg(md5('pilot-200-manual-external-academy-' || seq_value::text)::uuid)
  into pilot_external_academy_ids
  from generate_series(1, 4) as seqs(seq_value);

  select array_agg(md5('pilot-200-manual-external-class-' || seq_value::text)::uuid)
  into pilot_external_class_ids
  from generate_series(1, 6) as seqs(seq_value);

  select array_agg(md5('pilot-200-shared-academy-' || seq_value::text)::uuid)
  into pilot_shared_academy_ids
  from generate_series(1, 3) as seqs(seq_value);

  select coalesce(array_agg(id), array[]::uuid[])
  into pilot_followup_ids
  from public.followups
  where student_id = any(pilot_student_ids)
     or academy_id = any(pilot_shared_academy_ids);

  raise notice 'cleanup pilot students %, classes %, followups %',
    coalesce(array_length(pilot_student_ids, 1), 0),
    coalesce(array_length(pilot_class_ids, 1), 0),
    coalesce(array_length(pilot_followup_ids, 1), 0);

  delete from public.message_logs
  where followup_id = any(pilot_followup_ids)
     or provider_message_id like 'pilot-200-%';

  update public.attendance_records
  set followup_id = null,
      updated_at = now()
  where followup_id = any(pilot_followup_ids);

  delete from public.attendance_records
  where student_id = any(pilot_student_ids)
     or class_id = any(pilot_class_ids);

  delete from public.student_share_tokens
  where student_id = any(pilot_student_ids)
     or academy_id = any(pilot_shared_academy_ids);

  delete from public.student_schedule_links
  where source_student_id = any(pilot_student_ids)
     or target_student_id = any(pilot_student_ids)
     or source_academy_id = any(pilot_shared_academy_ids)
     or target_academy_id = any(pilot_shared_academy_ids);

  delete from public.student_external_class_enrollments
  where student_id = any(pilot_student_ids)
     or external_academy_class_id = any(pilot_external_class_ids);

  delete from public.external_academy_classes
  where id = any(pilot_external_class_ids);

  delete from public.external_academies
  where id = any(pilot_external_academy_ids);

  delete from public.student_schedules
  where student_id = any(pilot_student_ids)
     or class_id = any(pilot_class_ids)
     or academy_id = any(pilot_shared_academy_ids);

  delete from public.followups
  where id = any(pilot_followup_ids)
     or student_id = any(pilot_student_ids);

  delete from public.audit_logs
  where academy_id = target_academy
    and (
      summary ilike '%pilot%'
      or summary ilike '%파일럿%'
      or summary ilike '%seed%'
      or entity_id = any(pilot_student_ids)
      or entity_id = any(pilot_class_ids)
    );

  delete from public.students
  where id = any(pilot_student_ids)
     or academy_id = any(pilot_shared_academy_ids);

  delete from public.classes
  where id = any(pilot_class_ids)
     or academy_id = any(pilot_shared_academy_ids);

  delete from public.academy_settings
  where academy_id = any(pilot_shared_academy_ids);

  delete from public.academies
  where id = any(pilot_shared_academy_ids);

  raise notice 'pilot seed cleanup completed';
end $$;
```

실행 전 주의:

- `auth.users`, `profiles`, 더배움 `academies`, 더배움 `academy_settings`, 더배움 `message_templates`, `platform_admins`는 정리 대상이 아닙니다.
- 실제 개인정보가 이미 들어간 DB에는 실행하지 않습니다.
- Preview 결과가 기대와 다르면 Cleanup을 실행하지 않습니다.

## 8. Verify SQL

Cleanup 후 기준값을 확인합니다.

```sql
with
target_academy as (
  select '11111111-1111-4111-8111-111111111111'::uuid as id
),
pilot_students as (
  select md5('pilot-200-student-' || seq_value::text)::uuid as id
  from generate_series(1, 200) as seqs(seq_value)
),
pilot_classes as (
  select md5('pilot-200-class-' || seq_value::text)::uuid as id
  from generate_series(1, 20) as seqs(seq_value)
),
pilot_shared_academies as (
  select md5('pilot-200-shared-academy-' || seq_value::text)::uuid as id
  from generate_series(1, 3) as seqs(seq_value)
)
select
  (select count(*) from public.students where id in (select id from pilot_students)) as remaining_pilot_students,
  (select count(*) from public.classes where id in (select id from pilot_classes)) as remaining_pilot_classes,
  (select count(*) from public.student_schedules where student_id in (select id from pilot_students) or class_id in (select id from pilot_classes) or academy_id in (select id from pilot_shared_academies)) as remaining_pilot_schedules,
  (select count(*) from public.attendance_records where student_id in (select id from pilot_students) or class_id in (select id from pilot_classes)) as remaining_pilot_attendance,
  (select count(*) from public.followups where student_id in (select id from pilot_students) or academy_id in (select id from pilot_shared_academies)) as remaining_pilot_followups,
  (select count(*) from public.message_logs where provider_message_id like 'pilot-200-%') as remaining_pilot_message_logs,
  (select count(*) from public.academies where id in (select id from pilot_shared_academies)) as remaining_shared_seed_academies,
  (select count(*) from public.profiles where academy_id = (select id from target_academy)) as keep_profiles,
  (select count(*) from public.academy_settings where academy_id = (select id from target_academy)) as keep_academy_settings,
  (select count(*) from public.message_templates where academy_id = (select id from target_academy)) as keep_message_templates,
  (select sms_dry_run from public.academy_settings where academy_id = (select id from target_academy)) as sms_dry_run,
  (select allow_assistant_send from public.academy_settings where academy_id = (select id from target_academy)) as allow_assistant_send;
```

정상 기대값:

- `remaining_pilot_students = 0`
- `remaining_pilot_classes = 0`
- `remaining_pilot_schedules = 0`
- `remaining_pilot_attendance = 0`
- `remaining_pilot_followups = 0`
- `remaining_pilot_message_logs = 0`
- `remaining_shared_seed_academies = 0`
- `keep_profiles > 0`
- `keep_academy_settings = 1`
- `keep_message_templates > 0`
- `sms_dry_run = true`
- `allow_assistant_send = false`

Orphan 확인 SQL:

```sql
select
  (select count(*)
   from public.students student_item
   left join public.classes class_item on class_item.id = student_item.class_id
   where student_item.academy_id = '11111111-1111-4111-8111-111111111111'
     and student_item.class_id is not null
     and class_item.id is null) as students_with_missing_class,
  (select count(*)
   from public.student_schedules schedule_item
   left join public.students student_item on student_item.id = schedule_item.student_id
   where schedule_item.academy_id = '11111111-1111-4111-8111-111111111111'
     and student_item.id is null) as schedules_with_missing_student,
  (select count(*)
   from public.attendance_records attendance_item
   left join public.students student_item on student_item.id = attendance_item.student_id
   where attendance_item.academy_id = '11111111-1111-4111-8111-111111111111'
     and student_item.id is null) as attendance_with_missing_student,
  (select count(*)
   from public.followups followup_item
   left join public.students student_item on student_item.id = followup_item.student_id
   where followup_item.academy_id = '11111111-1111-4111-8111-111111111111'
     and student_item.id is null) as followups_with_missing_student;
```

## 9. 중단 기준

아래 중 하나라도 발생하면 운영 전환을 중단하고 원인을 먼저 확인합니다.

- Preview에서 삭제 대상 학생/반 수가 기대와 크게 다름
- `keep_profiles = 0`
- `keep_academy_settings = 0`
- `keep_message_templates = 0`
- `sms_dry_run = false`
- `allow_assistant_send = true`
- 실제 개인정보가 들어간 학생이 삭제 대상에 포함됨
- Verify 후 orphan count가 0이 아님

## 10. 정리 후 앱 확인

정리 후 실제 데이터 투입 전에는 빈 상태가 정상입니다.

정리 직후 확인:

- owner 로그인 가능
- 관리 탭 접근 가능
- 문자 템플릿 유지
- 정책에서 `테스트 발송`, `보조 선생님 발송 제한` 상태 확인
- 리포트/이력 화면이 비어도 오류 없이 보임

실제 데이터 20~30명 투입 후 확인:

- 관리: 학생/반/스케줄 수 확인
- 홈: 오늘 일정과 미발송 수 확인
- 출석: 수업 선택과 도착/지각/예외 저장 확인
- 문자: 개별 문자, 전체문자, 중복 제외 count 확인
- assistant: 연락 기록 저장 가능, 테스트 발송 권한 안내/비활성 유지

## 11. 최종 결론

운영 전환 전에는 **검토 후 수정**으로 진행합니다.

- Preview SQL 결과가 기준과 맞으면 Cleanup SQL 실행 가능
- Cleanup 후 Verify SQL 기준이 모두 맞으면 실제 운영 CSV 20~30명 투입
- 실제 학부모 번호 발송은 T-310 테스트 번호 제한 발송 검증 후 별도 승인
