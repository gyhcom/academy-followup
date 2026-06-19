# 실제 구조 데이터 운영 전환 실행표 - 2026-06

이 문서는 T-501 실제 구조 데이터 운영 전환 검증을 실제로 실행할 때 사용하는 순서표입니다. destructive SQL은 자동 실행하지 않고, Supabase SQL Editor에서 사람이 Preview 결과를 확인한 뒤 실행합니다.

## 1. 실행 목적

- 200명 seed/demo 데이터가 아니라 실제 운영과 가까운 1~2개 반, 20~30명 구조로 앱을 확인합니다.
- 실제 학부모 번호를 넣기 전에는 테스트 번호 또는 원장 승인된 샘플 번호만 사용합니다.
- `sms_dry_run=true`, `allow_assistant_send=false`, `NEXT_PUBLIC_BACKEND_API_URL` 미설정 상태를 유지합니다.

## 2. 사용할 파일

| 용도 | 파일 |
| --- | --- |
| 운영 구조 원장 확인용 전체 표 | [operations-real-data-template-2026-06.csv](./operations-real-data-template-2026-06.csv) |
| 앱 학생 CSV 일괄 등록용 | [operations-real-data-student-import-template-2026-06.csv](./operations-real-data-student-import-template-2026-06.csv) |
| 정리 전 Preview/Cleanup/Verify SQL | [operations-pre-reset-checklist-2026-06.md](./operations-pre-reset-checklist-2026-06.md) |
| 운영 전환 기준 | [operations-real-data-transition-2026-06.md](./operations-real-data-transition-2026-06.md) |

주의: 앱의 학생 CSV 일괄 등록은 학생/반/연락처/공유동의만 저장합니다. 수업 요일/시간은 학생 CSV가 아니라 관리 > 수업에서 반 공통 스케줄로 따로 등록합니다.

## 3. 사전 확인

Supabase SQL Editor에서 아래를 먼저 확인합니다.

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

정상 기준:

- `sms_dry_run = true`
- `allow_assistant_send = false`
- `parent_phone_masking = true`

계정 기준:

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

중단 기준:

- 원장/선생님/보조 선생님 계정이 없거나 inactive
- `sms_dry_run=false`
- `allow_assistant_send=true`
- 실제 개인정보가 seed/demo 정리 대상에 섞여 있음

## 4. DB 정리 순서

1. [operations-pre-reset-checklist-2026-06.md](./operations-pre-reset-checklist-2026-06.md)의 Preview SQL만 실행합니다.
2. 삭제 대상이 200명 seed/demo 기준과 맞는지 확인합니다.
3. 예상과 다르면 Cleanup을 실행하지 않습니다.
4. 예상과 맞으면 사람이 Supabase SQL Editor에서 Cleanup SQL을 실행합니다.
5. Verify SQL로 아래 기준을 확인합니다.

정리 후 기대값:

| 항목 | 기대값 |
| --- | ---: |
| seed/demo 학생 | 0 |
| seed/demo 반 | 0 |
| active 학생 중 스케줄 미등록 | 0 또는 실제 데이터 투입 전이면 0 |
| profiles | 유지 |
| academy_settings | 유지 |
| message_templates | 유지 |

## 5. 앱 입력 순서

### 5.1 반 생성

관리 > 수업에서 아래 반을 먼저 생성합니다.

| 반 | 과목 | 학년 | 담당 |
| --- | --- | --- | --- |
| 중2 수학 A반 | 수학 | 중2 | UAT 담당선생님 |
| 중3 영어 B반 | 영어 | 중3 | 테스트 선생님 |

반 이름은 학생 CSV의 `반` 값과 정확히 같아야 합니다.

### 5.2 학생 CSV 일괄 등록

관리 > 학생 > CSV 일괄 등록에서 아래 파일 내용을 붙여넣거나 파일로 선택합니다.

- [operations-real-data-student-import-template-2026-06.csv](./operations-real-data-student-import-template-2026-06.csv)

기대값:

- 전체 30명
- 등록 가능 30명
- 확인 필요 0명
- 중복이 이미 있으면 중복 학생은 제외

### 5.3 반 공통 스케줄 등록

관리 > 수업에서 반별 공통 스케줄을 등록합니다.

| 반 | 요일 | 시간 | 기대 등록 건수 |
| --- | --- | --- | ---: |
| 중2 수학 A반 | 월/수/금 | 16:30-18:00 | 12명 x 3요일 = 36 |
| 중3 영어 B반 | 화/목 | 19:00-20:30 | 18명 x 2요일 = 36 |

정상 기대값:

- 전체 학생 30명
- 전체 반 2개
- active 학생 중 스케줄 미등록 0명
- active 스케줄 72건

## 6. 투입 후 확인 SQL

```sql
select
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111') as total_students,
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111' and status = 'active') as active_students,
  (select count(*) from public.classes where academy_id = '11111111-1111-4111-8111-111111111111') as total_classes,
  (select count(*) from public.student_schedules where academy_id = '11111111-1111-4111-8111-111111111111' and is_active = true) as active_schedules,
  (
    select count(*)
    from public.students student_item
    where student_item.academy_id = '11111111-1111-4111-8111-111111111111'
      and student_item.status = 'active'
      and not exists (
        select 1
        from public.student_schedules schedule_item
        where schedule_item.student_id = student_item.id
          and schedule_item.academy_id = student_item.academy_id
          and schedule_item.is_active = true
      )
  ) as active_students_without_schedule,
  (select count(*) from public.profiles where academy_id = '11111111-1111-4111-8111-111111111111' and status = 'active') as active_members;
```

반별 확인:

```sql
select
  class_item.name as class_name,
  count(distinct student_item.id) as student_count,
  count(schedule_item.id) filter (where schedule_item.is_active = true) as active_schedule_count
from public.classes class_item
left join public.students student_item on student_item.class_id = class_item.id
left join public.student_schedules schedule_item on schedule_item.student_id = student_item.id
where class_item.academy_id = '11111111-1111-4111-8111-111111111111'
group by class_item.id, class_item.name
order by class_item.name;
```

## 7. 앱 검증 체크리스트

owner:

- 홈에서 오늘 수업과 문자 대상 수가 30명 구조 기준으로 보임
- 출석부 달력에서 수업 있는 날짜의 수업/학생/미체크 count가 실제 구조와 맞음
- 날짜 상세의 `수업`, `학생`, `미체크`, `지각`, `결석` 필터가 동작함
- 오늘 처리에서 도착/지각/결석/확인 필요 저장 가능
- 문자 탭에서 개별 문자 기록 저장과 테스트 발송 dry-run 가능
- 전체문자 대상 수가 30명 기준으로 보임
- 관리 > 리포트 CSV 다운로드 가능
- 최근 변경 이력에 등록/스케줄 변경이 남음

teacher:

- 담당 반 학생만 보임
- PC 출석부에서 학생 row 확인과 출석 체크 가능
- 전화번호 원문 비노출

assistant:

- 담당 반 학생만 보임
- 연락 기록 저장 가능
- 테스트 발송 버튼은 권한 안내와 함께 제한
- 관리 메뉴 미노출

## 8. 결과 기록 양식

| 항목 | 결과 |
| --- | --- |
| 실행일 | 2026-06-__ |
| 실행자 |  |
| DB 정리 Preview 결과 |  |
| Cleanup 실행 여부 | 실행 / 미실행 |
| 학생 수 |  |
| 반 수 |  |
| active 스케줄 수 |  |
| 스케줄 미등록 학생 수 |  |
| owner 확인 | 통과 / 실패 |
| teacher 확인 | 통과 / 실패 |
| assistant 확인 | 통과 / 실패 |
| dry-run 테스트 발송 | 통과 / 실패 / 미실행 |
| 중단/후속 이슈 |  |

## 9. 다음 단계

T-501이 통과하면 T-310 SOLAPI 테스트 번호 제한 발송으로 넘어갑니다.

T-501 중 실패하면 실제 발송으로 넘어가지 않고, 실패 항목을 별도 후속 이슈로 분리합니다.
