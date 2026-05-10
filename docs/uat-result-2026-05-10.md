# UAT 점검 결과 - 2026-05-10

대상 브랜치: `main`

기준 문서: `docs/uat-checklist.md`

## 요약

로컬 코드 기준 빌드, 타입, 린트, 비로그인 라우팅, 비로그인 API 차단, Supabase 연결 상태를 점검했습니다.

점검 중 일부 POST/PATCH API가 비로그인 상태에서 `401`보다 요청값 검증 `400`을 먼저 반환하는 문제가 발견되어, 인증 확인을 요청 본문 검증보다 먼저 수행하도록 수정했습니다.

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
| 로그인/세션 | 부분 통과 | `/login`, 비로그인 차단은 통과. 실제 테스트 계정 로그인은 계정 정보 필요 |
| 학원 워크스페이스 | 확인 필요 | 인증 후 화면이라 테스트 계정으로 확인 필요 |
| 출석부 | 확인 필요 | API 보호는 통과. 상태 변경/새로고침 유지는 로그인 후 확인 필요 |
| 문자 초안 | 확인 필요 | API 보호는 통과. 초안 생성/수정은 로그인 후 확인 필요 |
| 수신자 선택 | 확인 필요 | 코드/스키마 필드는 존재. 실제 UI 동작은 로그인 후 확인 필요 |
| dry-run 발송 | 확인 필요 | `academy_settings.sms_dry_run` 필드는 존재. 실제 기록 생성은 로그인 후 확인 필요 |
| 학생 히스토리 | 확인 필요 | `followups.recipient_type` 코드/마이그레이션은 존재. 실제 DB 적용 여부 확인 필요 |
| 보강 스케줄 | 확인 필요 | API 보호는 통과. 달력/중복 방지는 로그인 후 확인 필요 |
| 원장 운영 확인 | 확인 필요 | 인증 후 화면이라 테스트 계정으로 확인 필요 |
| 권한 분리 | 확인 필요 | 권한 helper는 코드에 반영. 원장/선생님/보조 선생님 계정별 실사용 확인 필요 |
| 모바일 사용성 | 확인 필요 | 이번 세션에서 브라우저 스크린샷 도구 사용 불가 |
| 태블릿/PC 사용성 | 확인 필요 | 이번 세션에서 브라우저 스크린샷 도구 사용 불가 |
| 보안/개인정보 | 부분 통과 | 비로그인 API 401, 전화번호 마스킹 코드 확인. 타 학원 데이터 접근은 다계정 테스트 필요 |
| 파일럿 전 최종 확인 | 확인 필요 | 실제 Supabase DB 필수 컬럼 확인 필요 |

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

특히 이전에 `column followups.recipient_type does not exist` 오류가 있었기 때문에, `docs/supabase-setup.md`의 컬럼 확인 SQL을 한 번 실행하는 것이 필요합니다.

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
