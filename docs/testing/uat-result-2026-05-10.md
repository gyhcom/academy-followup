# UAT 점검 결과 - 2026-05-10

대상 브랜치: `main`

기준 문서: `docs/testing/uat-checklist.md`

## 요약

로컬 코드 기준 빌드, 타입, 린트, 비로그인 라우팅, 비로그인 API 차단, Supabase 연결 상태를 점검했습니다.

점검 중 일부 POST/PATCH API가 비로그인 상태에서 `401`보다 요청값 검증 `400`을 먼저 반환하는 문제가 발견되어, 인증 확인을 요청 본문 검증보다 먼저 수행하도록 수정했습니다.

이후 `owner@test.com` 테스트 계정으로 로그인해 원장 운영 흐름을 추가 점검했습니다. UAT용 반 3개, 학생 30명, 스케줄 32개를 더미 데이터로 생성했고, 담당 선생님/보조 선생님 UAT 계정도 생성했습니다.

## 자동 점검 결과

| 항목 | 결과 | 메모 |
| --- | --- | --- |
| `npm run lint` | 통과 | ESLint 오류 없음 |
| `npx tsc --noEmit` | 통과 | 타입 오류 없음 |
| `npm run build` | 통과 | Next.js 프로덕션 빌드 성공 |
| `git diff --check` | 통과 | 공백 오류 없음 |
| `/` 랜딩 페이지 | 통과 | HTTP 200, 가격/서비스 문구 렌더링 확인 |
| `/login` 로그인 페이지 | 통과 | HTTP 200, 이메일/비밀번호 폼 확인 |
| 비로그인 `/app` 접근 | 통과 | `/login`으로 307 리다이렉트 |
| Supabase health API | 통과 | `/api/health/supabase` 200, connected |
| 비로그인 API 차단 | 통과 | 주요 보호 API 모두 401 반환 |
| 원장 로그인 | 통과 | `owner@test.com`으로 `/app` 진입 확인 |
| 학원 워크스페이스 | 통과 | 학원명, 원장 권한, 반/학생 목록 표시 확인 |
| 출석 상태 변경 | 통과 | 출석/지각/결석/확인 필요/보강 상태 저장 확인 |
| 문자 초안/수정 | 통과 | 결석/보강 문자 초안 표시와 textarea 수정 가능 상태 확인 |
| dry-run 발송 | 통과 | 실제 문자 없이 followup/message log 기록 생성 확인 |
| 중복 발송 방지 | 통과 | 같은 학생/사유/수신자 발송 시 409 차단 확인 |
| 학생 히스토리 | 통과 | 최신 팔로업이 최신순으로 표시됨 |
| 보강 스케줄 등록 | 통과 | 날짜/시간 선택 후 1회성 보강 등록 확인 |
| 보강 중복 방지 | 통과 | 같은 학생/날짜/시간 보강 등록 시 409 차단 확인 |
| 권한 분리 | 통과 | 원장/선생님/보조 선생님 화면 노출 차이 확인 |
| 반응형 overflow | 통과 | 390px, iPad 세로/가로, PC 폭에서 문서 가로 overflow 없음 |

## 비로그인 API 확인 결과

아래 API는 비로그인 상태에서 모두 `{"error":"로그인이 필요합니다."}`와 `401`을 반환하는 것을 확인했습니다.

- `GET /api/attendance?date=2026-05-10`
- `GET /api/followups`
- `POST /api/classes`
- `PATCH /api/classes`
- `POST /api/students`
- `PATCH /api/students`
- `POST /api/student-schedules`
- `PATCH /api/student-schedules`
- `POST /api/student-schedules/bulk`
- `PATCH /api/attendance`
- `POST /api/followups`
- `POST /api/messages/preview`
- `POST /api/messages/send`
- `PATCH /api/academy-settings`

## 체크리스트별 판정

| 영역 | 상태 | 판단 |
| --- | --- | --- |
| 로그인/세션 | 통과 | 원장 계정 로그인, 비로그인 차단 확인 |
| 학원 워크스페이스 | 통과 | 학원명, 권한, 반/학생 목록 확인 |
| 출석부 | 통과 | 날짜, 수업 시간, 상태 변경, 저장 확인 |
| 문자 초안 | 통과 | 사유별 초안, 학원명/학생명/선생님명 치환, 본문 수정 확인 |
| 수신자 선택 | 통과 | 학부모/학생/학부모+학생 선택 UI 확인. 학생 번호 미등록 시 안내 확인 |
| dry-run 발송 | 통과 | followup, message log 저장 확인. 실제 문자 비용 없음 |
| 학생 히스토리 | 통과 | 최신순 정렬과 상태 표시 확인 |
| 보강 스케줄 | 통과 | 달력, 날짜/시간 선택, 자동 등록, 중복 방지 확인 |
| 원장 운영 확인 | 통과 | 오늘 미처리 보드와 연락 필요 학생 표시 확인 |
| 권한 분리 | 통과 | 원장 관리 탭 표시, 선생님 관리 탭 미표시, 보조 선생님 배정 반 없음 확인 |
| 모바일 사용성 | 통과 | 390px 스크린샷 및 가로 overflow 없음 |
| 태블릿/PC 사용성 | 통과 | iPad 세로/가로, PC 폭에서 가로 overflow 없음 |
| 보안/개인정보 | 부분 통과 | 비로그인 API 401, 전화번호 마스킹 확인. 타 학원 데이터 접근은 별도 학원 계정 필요 |
| 파일럿 전 최종 확인 | 확인 필요 | 실제 Supabase DB 필수 컬럼 확인 필요 |

## 로그인 UAT 상세 결과

테스트 데이터:

- UAT 반 3개
- UAT 학생 30명
- UAT 스케줄 32개
- `sms_dry_run=true`
- 담당 선생님 계정: `uat-teacher@test.com`
- 보조 선생님 계정: `uat-assistant@test.com`

확인한 흐름:

1. 원장 계정 로그인 후 `/app` 진입
2. 운영 탭에서 학원명, 원장 권한, 반 10개, 학생 35명 표시 확인
3. 출석 탭에서 2026-05-10 기준 수업 3개와 학생 30명 표시 확인
4. UAT 중2 수학 A반 학생 5명 상태를 출석/지각/결석/확인 필요/보강으로 각각 변경
5. 오늘 출석 요약이 출석 1, 지각 1, 결석 1, 확인 필요 1, 보강 1로 반영되는지 확인
6. 결석 학생 문자 초안 생성, 학부모 수신자, 학생 연락처 미등록 안내 확인
7. 팔로업 저장 후 dry-run 발송 완료 확인
8. 같은 학생/사유/수신자 유형으로 중복 발송 시 409 차단 확인
9. 보강 달력에서 2026-05-10 18:00-19:00 후보 선택
10. 보강 문자 저장, dry-run 발송, 1회성 보강 스케줄 등록 확인
11. 같은 학생/날짜/시간으로 보강 재등록 시 409 차단 확인
12. 학생 히스토리에 최신 팔로업이 최신순으로 쌓이는지 확인
13. 담당 선생님은 배정된 UAT 반 3개만 보고 관리 탭이 숨겨지는지 확인
14. 보조 선생님은 배정 반이 없어 운영 데이터가 노출되지 않는지 확인

반응형 확인:

- 390 x 844: 가로 overflow 없음
- 768 x 1024: 가로 overflow 없음
- 1024 x 768: 가로 overflow 없음
- 1440 x 1000: 가로 overflow 없음

스크린샷은 `.local/uat/` 아래에 저장했습니다.

## 실제 DB 확인 필요 항목

코드와 마이그레이션 파일에는 아래 항목이 존재합니다. 다만 실제 Supabase 운영 DB에 적용됐는지는 Supabase SQL Editor에서 확인해야 합니다.

- `students.student_phone`
- `followups.recipient_type`
- `message_logs.recipient_type`
- `profiles.status`
- `profiles.phone`
- `academy_settings.sms_dry_run`
- `academy_settings.allow_assistant_send`
- `academy_settings.duplicate_guard_minutes`

이번 UAT에서 `followups.recipient_type`, `message_logs.recipient_type`, `students.student_phone`, `academy_settings` 기반 흐름은 실제로 동작했습니다. 다만 파일럿 전에는 `docs/engineering/supabase-setup.md`의 컬럼 확인 SQL을 한 번 더 실행해 운영 DB 상태를 기록하는 것이 좋습니다.

## 다음 UAT에 필요한 준비물

- 원장 테스트 계정 1개
- 담당 선생님 테스트 계정 1개
- 보조 선생님 테스트 계정 1개
- 학생 30명 내외 더미 데이터
- 반 3개 이상
- `sms_dry_run=true` 확인
- 모바일 실기기 또는 브라우저 모바일 뷰

## 다음 확인 순서

1. 원장 계정으로 로그인
2. `/app` 학원명/권한/반/학생 목록 확인
3. 출석부 날짜, 반, 수업 시간 선택
4. 학생 상태를 출석/지각/결석/확인 필요/보강으로 변경
5. 문자 초안 생성, 수신자 선택, 본문 수정
6. dry-run 발송 후 followup/message log 저장 확인
7. 학생 히스토리 최신순 확인
8. 보강 날짜/시간 선택과 중복 방지 확인
9. 선생님/보조 선생님 계정으로 권한 차이 확인
10. 모바일 390px, iPad 세로/가로, PC 폭에서 화면 깨짐 확인
