# 실제 구조 데이터 운영 전환 검증 - 2026-06

이 문서는 200명 seed/demo 검증 이후, 친구 학원 실제 운영 구조를 반 1~2개와 학생 20~30명으로 먼저 전환해 확인하는 기준입니다. 실제 개인정보를 넣기 전에는 원장 확인을 받고, 처음에는 `sms_dry_run=true` 상태를 유지합니다.

## 1. 목적

- 200명 seed는 부하/UX 검증용으로 보고, 실제 운영 데이터와 분리합니다.
- 실제 학원 구조 기준으로 홈, 출석, 문자, 관리, 리포트, 이력이 막히지 않는지 확인합니다.
- 실데이터 투입 직후 스케줄 미등록, 권한 누락, 전화번호 노출, 문자 오발송 위험을 찾습니다.

## 2. 실행 순서

1. 운영 전환 전 DB 정리 기준을 확인합니다.
   - [운영 데이터 정리 전 선행 점검](./operations-pre-reset-checklist-2026-06.md)의 Preview SQL을 먼저 실행합니다.
   - seed/demo 삭제는 Preview 결과가 예상과 맞을 때만 진행합니다.
2. 실제 CSV 템플릿을 원장과 확인합니다.
   - 기준 파일: [operations-real-data-template-2026-06.csv](./operations-real-data-template-2026-06.csv)
   - 실제 개인정보가 부담되면 이름/전화번호만 테스트값으로 바꾼 동일 구조 CSV로 먼저 검증합니다.
3. 반 1~2개, 학생 20~30명만 먼저 등록합니다.
4. 학생 수, 반 수, 스케줄 미등록 수를 SQL과 앱에서 확인합니다.
5. owner/teacher/assistant 계정으로 주요 흐름을 확인합니다.
6. dry-run 기록까지 정상 확인한 뒤 SOLAPI 테스트 번호 제한 발송으로 넘어갑니다.

## 3. CSV 필드 기준

| 필드 | 필수 | 기준 |
| --- | --- | --- |
| 학생명 | 필수 | 실제 이름 또는 테스트 이름 |
| 학교 | 권장 | 학교명을 모르면 빈 값 가능 |
| 학년 | 필수 | `중1`, `중2`, `중3`, `고1`, `고2`, `무학년` 등 |
| 소속 반 | 필수 | 앱에 등록할 반명과 동일 |
| 학부모명 | 권장 | 모르면 `학부모`로 입력 가능 |
| 학부모 연락처 | 필수 | 실제 운영 전 원장 확인 필요 |
| 학생 연락처 | 선택 | 없으면 빈 값 |
| 수업 요일 | 필수 | `월수금`, `화목`, `토`, `월,수`처럼 입력 |
| 수업 시작 시간 | 필수 | `HH:MM` |
| 수업 종료 시간 | 필수 | `HH:MM` |
| 담당 선생님 | 필수 | `profiles.name` 또는 원장이 식별 가능한 이름 |
| 타 학원 스케줄 공유 동의 여부 | 필수 | `동의`, `미동의`, 빈 값 중 하나 |
| 상태 | 필수 | 시작은 `재원` |

## 4. 투입 후 확인 SQL

아래 SQL은 실제 데이터 투입 후 count만 확인합니다. 데이터를 변경하지 않습니다.

```sql
select
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111') as total_students,
  (select count(*) from public.students where academy_id = '11111111-1111-4111-8111-111111111111' and status = 'active') as active_students,
  (select count(*) from public.classes where academy_id = '11111111-1111-4111-8111-111111111111') as total_classes,
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

정상 기대값:

- `total_students`는 첫 투입 범위인 20~30명
- `total_classes`는 1~2개
- `active_students_without_schedule = 0`
- `active_members`는 owner/teacher/assistant 운영 계정 수와 일치

## 5. 앱 확인 기준

owner:

- 홈에서 오늘 학원 일정과 문자 대상 수가 실제 데이터 기준으로 보입니다.
- 출석 탭에서 수업 선택 후 도착, 지각, 결석, 확인 필요, 보강 저장이 됩니다.
- 문자 탭에서 개별 문자와 전체문자 대상/중복 제외 count가 맞습니다.
- 관리 탭에서 학생, 반, 스케줄, 담당 선생님, 공유 동의 상태를 확인할 수 있습니다.
- 리포트 CSV와 최근 변경 이력이 오류 없이 열립니다.

teacher:

- 담당 반 학생만 보입니다.
- PC에서 학생 확인과 출석 체크가 어렵지 않습니다.
- 전화번호 원문이 노출되지 않습니다.

assistant:

- 담당 반 학생만 보입니다.
- 연락 기록 저장은 가능하되 테스트 발송은 제한 안내가 보입니다.
- 관리 탭은 계속 숨겨집니다.

## 6. 중단 기준

- 실제 개인정보가 seed/demo 삭제 대상에 섞여 있음
- 스케줄 미등록 학생이 1명 이상 남음
- teacher/assistant에게 전화번호 원문이 노출됨
- assistant가 `allow_assistant_send=false`에서 테스트 발송 가능
- 전체문자 대상 count가 실제 학생 수와 다름
- `sms_dry_run=false` 상태로 실제 학부모 번호 발송 가능

## 7. 다음 단계

- dry-run 검증이 끝나면 [SOLAPI 테스트 번호 제한 발송 준비](./solapi-test-number-readiness-2026-06.md)로 넘어갑니다.
- 테스트 번호 1건 실제 수신 확인 전에는 학부모 번호로 실제 발송하지 않습니다.
