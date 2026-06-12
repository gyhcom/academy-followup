# Spring Boot 전환 운영 기준

이 문서는 Academy Follow-up의 Spring Boot 전환 기준입니다. 목적은 전체 재작성이나 즉시 API 교체가 아니라, 2026년 6월 중순까지 사용자가 직접 유지보수할 수 있는 Java/Spring 기반 백엔드 경계를 만들고, 7월 13일 전 파일럿 운영을 흔들지 않는 방식으로 API를 점진 이전하는 것입니다.

## 1. 전환 목적

- Next.js는 화면, 모바일 UX, 로그인 UI, 라우팅, 빠른 문구/버튼 수정을 담당합니다.
- Spring Boot는 권한, 리포트, 감사 로그, 문자, 출석/보강, 관리 도메인 API를 담당할 백엔드 경계를 만듭니다.
- 전환 목표는 “파일럿 MVP를 다시 만드는 것”이 아니라 “AI 의존도가 낮아져도 Java/Spring 코드로 직접 유지보수 가능한 구조”를 확보하는 것입니다.
- 파일럿 안정성이 Spring 전환보다 우선입니다. 운영 중인 기능을 깨뜨릴 가능성이 있으면 Next.js 구현을 유지합니다.

## 2. 목표 아키텍처

```text
사용자 브라우저
  └─ Vercel / Next.js frontend
      ├─ 화면, Supabase 로그인, 빠른 UX 변경
      ├─ 기존 Next.js /api fallback
      └─ Railway / Spring Boot backend 호출
             ├─ 인증/권한 컨텍스트
             ├─ read-only report API
             └─ 이후 audit/message/attendance API 점진 이전

Supabase
  ├─ Auth
  └─ PostgreSQL
```

- Frontend: Vercel + Next.js 유지
- Backend: 로컬 Spring Boot 우선, Railway + Spring Boot 배포는 결제 후 진행
- DB/Auth: Supabase 유지
- API 전환 방식: Spring API 우선 호출 + Next.js fallback 유지
- Spring 이관 완료 범위: 운영 API 전체를 Spring Boot에 추가했고 기존 Next.js API fallback을 유지합니다.
- Next.js 전용으로 남은 `/api/auth/redirect-target`는 로그인 UI helper이며 Spring 운영 API 전환 대상에서 제외합니다.
- 배포 상태: Railway 결제 전까지 Production에는 `NEXT_PUBLIC_BACKEND_API_URL`을 설정하지 않습니다.

## 3. frontend/backend 책임 경계

Frontend가 계속 담당합니다.

- 화면 구성과 모바일 UX
- 로그인 화면과 Supabase browser session 관리
- 하단 탭, 홈, 출석, 문자, 관리 화면
- 파일럿 중 빠르게 바뀌는 문구와 CTA
- Spring API 장애 시 Next.js API fallback

Backend가 점진적으로 담당합니다.

- 공통 인증/권한 컨텍스트
- 원장/관리자/선생님/보조 선생님 권한 검증
- 리포트, 감사 로그, 문자, 출석/보강 도메인 로직
- 서버 전용 secret을 사용하는 API
- 운영 로그와 에러 응답 표준화

## 4. API 이관 원칙

- read-only 또는 low-risk API부터 이관합니다.
- 운영 API는 Spring Boot에 추가 완료했습니다.
- 쓰기 API, 문자 발송 API, 출석/보강 핵심 API도 Spring에 추가했지만, 운영 리스크를 줄이기 위해 각 단계에서 Next.js fallback을 유지합니다.
- Spring API 응답 shape는 기존 Next.js API와 동일하게 유지합니다.
- 기존 Next.js API는 바로 삭제하지 않고 fallback으로 남깁니다.
- API 하나당 이슈 1개, 브랜치 1개, PR 1개로 진행합니다.

### 4.1 API 위험도 분류

| API | 현재 위치 | Spring 상태 | 위험도 | 운영 기준 |
| --- | --- | --- | --- | --- |
| `GET /api/health/supabase` | Next.js + Spring | Spring 추가 | Low | 공개 health check. 운영 연결 전 Supabase 접근 상태 확인용입니다. |
| `GET /api/auth/context` | Spring | Spring 완료 | Low | Supabase token 기반 workspace context 검증용입니다. |
| `GET /api/reports/summary` | Next.js + Spring | Spring 완료 + frontend fallback | Low | 관리 리포트 요약. owner/manager만 허용합니다. |
| `GET /api/audit/logs` | Next.js + Spring | Spring 완료 + frontend fallback | Low | 최근 변경 이력 조회. owner/manager만 허용합니다. |
| `GET /api/message-templates` | Next.js + Spring | Spring 추가 | Low | 템플릿 조회. owner/manager만 허용합니다. 현재 화면 목록은 SSR Supabase 조회를 유지합니다. |
| `PATCH /api/message-templates` | Next.js + Spring | Spring 추가 + frontend fallback | Medium | 템플릿 저장. owner/manager만 허용하고 audit log를 남깁니다. |
| `PATCH /api/academy-settings` | Next.js + Spring | Spring 추가 + frontend fallback | Medium | 운영 설정 저장. owner/manager만 허용하고 audit log를 남깁니다. |
| `POST /api/messages/preview` | Next.js + Spring | Spring 추가 + frontend fallback | Low | 문자 초안 미리보기. 담당 반 권한 검증을 유지합니다. |
| `POST /api/bulk-messages/preview` | Next.js + Spring | Spring 추가 + frontend fallback | Low | 전체문자 대상/중복 제외 count 미리보기. owner/manager만 허용합니다. |
| `GET /api/reports/export` | Next.js + Spring | Spring 추가 + frontend fallback | Medium | CSV/개인정보 포함 옵션은 Spring 우선 다운로드 후 기존 Next API fallback으로 유지합니다. |
| `GET/POST /api/followups` | Next.js + Spring | Spring 추가 + frontend fallback | High | 연락 기록 조회/저장 API입니다. 문자 발송 전 단계로 Spring에 이전하고 fallback을 유지합니다. |
| `GET/POST/PATCH /api/attendance` | Next.js + Spring | Spring 추가 + frontend fallback | High | 수업 중 출석 조회/저장 핵심 API입니다. 담당 반 권한과 상태 저장 규칙을 유지합니다. |
| `POST/PATCH /api/students`, `/api/classes`, `/api/student-schedules` | Next.js + Spring | Spring 추가 + frontend fallback | High | 실제 운영 데이터 수정 API입니다. 단건 저장을 Spring에 추가하고 fallback을 유지합니다. |
| `POST /api/students/bulk`, `POST /api/student-schedules/bulk` | Next.js + Spring | Spring 추가 + frontend fallback | High | CSV 학생 일괄 등록과 반 공통 스케줄 등록 API입니다. 운영 데이터 대량 변경이므로 Spring 우선 호출 후 Next.js fallback을 유지합니다. |
| `POST /api/external-academy-classes` | Next.js + Spring | Spring 추가 + frontend fallback | High | 수동 타 학원 수업 연결/해제 API입니다. owner/manager만 허용하고 audit log를 유지합니다. |
| `GET/POST /api/student-schedule-sharing` | Next.js + Spring | Spring 추가 + frontend fallback | High | 학원 간 수동 공유 코드/연결/해제와 공유 일정 조회 API입니다. 실제 학원명 비공개 정책을 유지합니다. |
| `GET/POST/PATCH /api/members` | Next.js + Spring | Spring 추가 + frontend fallback | High | Auth/profile 생성·수정 API입니다. Spring에 추가하고 기존 Next.js fallback을 유지합니다. |
| `POST /api/messages/send` | Next.js + Spring | Spring 추가 + frontend fallback | High | 개별 문자 발송/로그 API입니다. dry-run, 중복 차단, SOLAPI 실발송 경로를 Spring에 추가하고 fallback을 유지합니다. |
| `POST /api/bulk-messages/send` | Next.js + Spring | Spring 추가 + frontend fallback | High | 전체문자 발송 API입니다. 대상 산정, 중복 수신자 제외, dry-run/실발송 로그 저장을 Spring에 추가하고 fallback을 유지합니다. |
| `/api/platform/academies` | Next.js + Spring | Spring 추가 + frontend fallback | High | 플랫폼 관리자/학원 생성·상태 관리 API입니다. 플랫폼 전용 인증을 분리하고 fallback을 유지합니다. |

오늘 기준 “Spring 전환 완료”는 기존 Next.js API 삭제가 아니라, 운영 API를 Spring Boot에 추가하고 frontend에서 Spring 우선 호출 + Next.js fallback을 유지하는 상태를 의미합니다. Railway 실제 배포와 Production backend URL 연결은 결제 및 smoke test 이후 별도 승인으로 진행합니다.

### T-643 Attendance API 이관 결과

- Spring Boot에 `GET /api/attendance?date=YYYY-MM-DD`와 `PATCH/POST /api/attendance`를 추가했습니다.
- 기존 Next.js 출석 API는 삭제하지 않고 fallback으로 유지합니다.
- 권한은 기존 정책과 동일합니다.
  - `owner/manager`: 학원 전체 출석 기록 조회/수정 가능
  - `teacher/assistant`: 본인이 담당한 반의 출석 기록만 조회/수정 가능
- 저장 규칙은 기존 Next.js API와 동일하게 유지합니다.
  - 학생/반/날짜/수업 시간/상태/메모 검증
  - 비활성 학생 수정 차단
  - 학생이 선택한 반에 속하지 않으면 차단
  - `pending`은 `checked_at/arrived_at` 초기화
  - `present/late/makeup`은 `arrived_at` 기록
- Frontend는 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고, 실패하거나 env가 없으면 기존 Next.js API로 fallback합니다.
- Production Vercel에는 계속 `NEXT_PUBLIC_BACKEND_API_URL`을 설정하지 않습니다.

### T-644 학생/반/스케줄 API 이관 결과

- Spring Boot에 단건 관리 API를 추가했습니다.
  - `POST/PATCH /api/classes`
  - `POST/PATCH /api/students`
  - `POST/PATCH /api/student-schedules`
- 기존 Next.js API는 삭제하지 않고 fallback으로 유지합니다.
- Frontend 관리 화면과 보강 등록 흐름은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 우선 호출합니다.
- 학생 저장 시 기존 자동 공유 동기화 기준을 유지합니다.
  - 양쪽 동의 확인
  - 이름/학교/학년/전화번호 일치
  - 기존 active 링크 중 불일치 링크 revoke
  - 신규 일치 학생 active 링크 생성
- 스케줄 저장 권한은 기존과 동일합니다.
  - `owner/manager`: 전체 학생 스케줄 관리 가능
  - `teacher/assistant`: 담당 반 학생 스케줄만 관리 가능
- bulk API는 T-649에서 별도로 Spring에 추가했습니다.
  - `POST /api/students/bulk`
  - `POST /api/student-schedules/bulk`

### T-645 Members API 이관 결과

- Spring Boot에 `GET/POST/PATCH /api/members`를 추가했습니다.
- 기존 Next.js API는 삭제하지 않고 fallback으로 유지합니다.
- Supabase Auth Admin REST를 Spring에서 호출합니다.
  - 생성: Auth user 생성 후 `profiles` insert
  - profile 저장 실패 시 Auth user 삭제 rollback
  - 수정: Auth user metadata/email 수정 후 `profiles` update
- 권한과 보호 규칙은 기존과 동일합니다.
  - `owner/manager`만 구성원 조회/생성/수정 가능
  - 현재 로그인한 관리자 본인은 비활성화하거나 `teacher/assistant`로 낮출 수 없음
- Frontend 관리 화면은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 우선 호출하고, 실패하거나 env가 없으면 기존 Next.js API로 fallback합니다.

## 5. 인증/권한 정책

- Supabase Auth는 유지합니다.
- Frontend는 Supabase access token을 `Authorization: Bearer ...`로 Spring API에 전달합니다.
- Spring Boot는 토큰에서 user를 확인하고, `profiles`에서 `academy_id`, `role`, `status`를 조회해 권한 컨텍스트를 만듭니다.
- 서비스 role key는 서버 전용이며 browser에 노출하지 않습니다.
- `owner`, `manager`만 운영 리포트 API를 볼 수 있습니다.
- `teacher`, `assistant`는 담당 반/학생 중심 API만 후속으로 허용합니다.
- 권한 실패는 `403`, 로그인 누락은 `401`, 환경 설정 누락은 `500`으로 명확히 응답합니다.

## 6. fallback/rollback 정책

- Frontend는 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 우선 호출합니다.
- Spring API 호출 실패 또는 backend URL 미설정 시 기존 Next.js API로 fallback합니다.
- 운영 중 문제가 생기면 Vercel에서 `NEXT_PUBLIC_BACKEND_API_URL`을 제거해 즉시 Next.js API로 되돌립니다.
- Spring API 이관 PR은 기존 Next.js API 삭제를 포함하지 않습니다.
- rollback은 DB migration 없이 가능해야 합니다.

## 7. 환경변수/secret 관리

Vercel frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` 서버 전용
- `NEXT_PUBLIC_BACKEND_API_URL` public 값이며 backend base URL만 포함

Railway backend:

- `SPRING_PROFILES_ACTIVE=railway`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_ORIGIN`
- 필요 시 후속으로 `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD`

원칙:

- `SUPABASE_SERVICE_ROLE_KEY`는 Vercel server-side와 Railway backend에만 둡니다.
- browser 노출 금지입니다.
- `.env.example`에는 값이 아니라 이름과 용도만 남깁니다.
- Railway와 Vercel 환경변수는 환경별로 분리합니다.

## 8. 배포 환경 구분

Local:

- Frontend: `npm run dev --workspace apps/frontend`
- Backend: `cd apps/backend && ./gradlew bootRun`
- Backend URL: `http://localhost:8080`

Preview:

- Frontend: Vercel Preview
- Backend: Railway 서비스 또는 로컬 Spring Boot 검증
- API fallback이 가능해야 합니다.

Production:

- Frontend: Vercel Production
- Backend: Railway 결제 전까지 연결하지 않습니다.
- Spring API 이관 전에는 `NEXT_PUBLIC_BACKEND_API_URL`을 비워도 앱이 동작해야 합니다.

## 9. 모니터링/로그

- Spring Boot는 `/health`와 `/actuator/health`를 제공합니다.
- Railway 로그에서 요청 실패, 권한 실패, Supabase 연결 실패를 확인할 수 있어야 합니다.
- 로그에는 학생/학부모 전화번호 원문, message body 전문, service role key를 남기지 않습니다.
- API 실패 응답은 사용자에게 필요한 한국어 메시지를 내려주되, 내부 detail은 서버 로그에만 남깁니다.
- 첫 단계에서는 별도 APM을 붙이지 않고 Railway logs + Vercel logs로 운영합니다.

## 10. 비용/리소스 기준

- Railway backend는 최소 리소스로 시작합니다.
- 파일럿 기간에는 1개 backend service만 운영합니다.
- DB는 Supabase 기존 프로젝트를 사용합니다.
- 비용이 증가하는 작업은 실제 SMS 발송, 별도 queue, 별도 cache, APM 도입 순으로 후속 검토합니다.
- 200명 파일럿 기준에서 read-only report API가 안정적으로 동작하는 것을 1차 기준으로 봅니다.

## 11. 이슈별 완료 기준

### T-630 Spring Boot backend skeleton 추가

- `apps/backend`에 Spring Boot 프로젝트가 있습니다.
- `GET /health`와 `/actuator/health`가 로컬에서 응답합니다.
- 기존 Next.js `/api/*`는 계속 frontend 앱이 담당합니다.
- Spring Boot는 아직 Vercel 배포 대상에 포함하지 않습니다.

### T-631 Supabase 인증/권한 컨텍스트

- Spring Boot가 Supabase access token으로 로그인 사용자를 식별합니다.
- `profiles` 기반 `academy_id`, `role`, `status` 컨텍스트를 구성합니다.
- owner/manager 전용 권한 helper가 있습니다.
- teacher/assistant 권한 실패가 `403`으로 검증됩니다.

### T-632 report summary API 첫 이관

- Spring Boot에 `GET /api/reports/summary`가 추가됩니다.
- 기존 Next.js 응답 shape와 동일합니다.
- owner/manager는 성공, teacher/assistant는 `403`입니다.
- 200명 파일럿 데이터 기준 숫자가 기존 Next.js API와 일치합니다.
- Railway 배포 전에는 로컬 `http://localhost:8080`에서 먼저 검증합니다.

### T-633 Railway 배포 준비

- Railway에서 `apps/backend` root directory 기준으로 빌드/실행됩니다.
- Railway public URL에서 `/health`와 `/actuator/health`가 응답합니다.
- backend 환경변수 목록과 설정 절차가 README에 있습니다.
- Railway 결제 전까지 실제 배포는 보류합니다.
- 배포 준비 기준은 [Railway Spring Backend 배포 준비 체크리스트](./railway-backend-deployment-readiness.md)를 따릅니다.

### T-634 Frontend-Spring 연동

- 로컬 또는 Vercel frontend가 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring report API를 호출합니다.
- 실패 시 기존 Next.js report API로 fallback합니다.
- Vercel env 제거만으로 rollback 가능합니다.
- Railway 배포 전에는 로컬 frontend에서만 `NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080`으로 검증합니다.

### T-637 Spring audit logs 조회 API 이관

- 최근 변경 이력 `GET /api/audit/logs`가 Spring Boot에서 제공됩니다.
- owner/manager만 조회할 수 있고 teacher/assistant는 `403`입니다.
- frontend는 Spring 우선 호출 후 기존 Next.js SSR/상태로 fallback합니다.
- Production에는 backend URL을 설정하지 않아 기존 Next.js 기준을 유지합니다.

### T-638 Spring 전환 완료 기준 문서화

- 현재 Next.js API를 위험도별로 분류했습니다.
- 오늘 완료 기준을 전체 이전이 아니라 `Spring 기반/인증/리포트/이력/저위험 API 이관 + fallback 유지`로 고정했습니다.
- 문자 발송, 출석 저장, 학생/반/구성원 수정 API는 high-risk로 분류해 파일럿 안정화 전까지 Next.js에 유지합니다.

### T-639 저위험 Spring API 추가 이관

- Spring Boot에 `GET /api/health/supabase`를 추가했습니다.
- Spring Boot에 `GET /api/message-templates`를 추가했습니다.
- Spring Boot에 `POST /api/messages/preview`를 추가했습니다.
- Spring Boot에 `POST /api/bulk-messages/preview`를 추가했습니다.
- frontend 문자/출석 미리보기와 전체문자 대상 미리보기는 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고 실패 시 기존 Next.js API로 fallback합니다.
- 관리 화면 템플릿 목록은 현재 SSR Supabase 조회 구조를 유지하며, Spring `GET /api/message-templates`는 운영 가능한 backend endpoint로 먼저 준비했습니다.

### T-640 운영 설정/문자 템플릿 저장 API 이관

- Spring Boot에 `PATCH /api/message-templates`를 추가했습니다.
- Spring Boot에 `PATCH /api/academy-settings`를 추가했습니다.
- 두 API 모두 owner/manager만 허용합니다.
- 두 API 모두 저장 성공 후 `audit_logs`에 최근 변경 이력을 남깁니다.
- frontend 관리 화면은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고 실패 시 기존 Next.js API로 fallback합니다.

### T-641 reports/export CSV API 이관

- Spring Boot에 `GET /api/reports/export`를 추가했습니다.
- 학생 목록, 출석 기록, 문자 기록, 변경 이력 CSV 컬럼은 기존 Next.js API와 동일하게 유지합니다.
- 기본 다운로드는 전화번호 마스킹이며, `includePrivate=true`일 때만 원문을 포함합니다.
- owner/manager만 허용하고 teacher/assistant는 `403`입니다.
- frontend 관리 > 리포트의 CSV 다운로드는 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고 실패 시 기존 Next.js API로 fallback합니다.
- Production에는 backend URL을 설정하지 않아 기존 Next.js API 기준을 유지합니다.

### T-642 연락 기록 followups API 이관

- Spring Boot에 `GET /api/followups?studentId=...`를 추가했습니다.
- Spring Boot에 `POST /api/followups`를 추가했습니다.
- 기존 Next.js API와 같은 응답 shape를 유지합니다.
- owner/manager는 학원 전체 학생, teacher/assistant는 담당 반 학생만 접근할 수 있습니다.
- 연락 기록 저장 시 비활성 학생, 잘못된 사유/수신자, 2000byte 초과 본문, 결석/지각이 아닌 출석 기록 연결을 차단합니다.
- 출석 기록 ID가 있으면 연락 기록 저장 후 `attendance_records.followup_id`를 연결합니다.
- frontend 문자/출석/학생 상세 화면은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고 실패 시 기존 Next.js API로 fallback합니다.

### T-646 개별 문자 발송 API 이관

- Spring Boot에 `POST /api/messages/send`를 추가했습니다.
- 기존 Next.js API는 삭제하지 않고 fallback으로 유지합니다.
- 요청/응답 shape는 기존과 동일합니다.
  - 요청: `{ "followupId": "..." }`
  - 응답: `{ dryRun, message, recipientPhone, recipientCount, followupId }`
- 기존 운영 안전장치를 유지합니다.
  - `academy_settings.sms_dry_run=true`이면 실제 SOLAPI 발송 없이 `message_logs.status=dry_run`을 저장합니다.
  - 같은 학생/사유/수신자에 최근 `sent` 기록이 있으면 `409 duplicate`로 차단합니다.
  - `duplicate_guard_minutes`가 없으면 기존과 같이 1440분을 사용합니다.
  - 2000byte 초과 본문은 발송 전에 차단합니다.
- 권한은 기존 Next.js 정책과 동일합니다.
  - `owner/manager`: 전체 가능
  - `teacher`: 담당 반 연락 기록만 가능
  - `assistant`: 담당 반이면서 `allow_assistant_send=true`일 때만 가능
- 실제 발송 경로는 SOLAPI 환경변수(`SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_PHONE`)가 필요합니다.
- frontend 문자/출석 화면은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고, Spring 5xx/네트워크 실패 또는 URL 미설정 시 기존 Next.js API로 fallback합니다.
- Production에는 backend URL을 설정하지 않아 기존 Next.js API 기준을 유지합니다.

### T-647 전체문자 발송 API 이관

- Spring Boot에 `POST /api/bulk-messages/send`를 추가했습니다.
- 기존 Next.js API는 삭제하지 않고 fallback으로 유지합니다.
- 요청/응답 shape는 기존과 동일합니다.
  - 요청: `{ targetType, classId, gradeLabel, recipientType, messageBody, excludeDuplicateRecipients }`
  - 응답: `{ dryRun, message, targetStudentCount, candidateRecipientCount, recipientCount, duplicateExcludedCount }`
- 대상 산정은 Spring preview API와 같은 규칙을 사용합니다.
  - 전체/반/학년 필터
  - 학부모/학생/둘 다 수신자 선택
  - 전화번호 정규화
  - 중복 수신자 제외 옵션
- 기존 운영 안전장치를 유지합니다.
  - `academy_settings.sms_dry_run=true`이면 실제 SOLAPI 발송 없이 `message_logs.status=dry_run`을 저장합니다.
  - 발송 전 전체문자 followup을 생성하고, 발송/dry-run 후 `followups.status=sent`와 `sent_at`을 저장합니다.
  - 2000byte 초과 본문은 발송 전에 차단합니다.
- 권한은 기존 Next.js 정책과 동일하게 `owner/manager`만 허용합니다.
- frontend 전체문자 화면은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고, Spring 5xx/네트워크 실패 또는 URL 미설정 시 기존 Next.js API로 fallback합니다.
- Production에는 backend URL을 설정하지 않아 기존 Next.js API 기준을 유지합니다.

### T-648 플랫폼 학원 관리 API 이관

- Spring Boot에 `GET /api/platform/academies`와 `POST /api/platform/academies`를 추가했습니다.
- 기존 Next.js API는 삭제하지 않고 fallback으로 유지합니다.
- 플랫폼 API는 일반 학원 workspace 인증과 분리합니다.
  - `/api/platform/**`는 `profiles`가 없어도 접근 가능한 플랫폼 전용 인증을 사용합니다.
  - Supabase access token으로 user id를 확인한 뒤 `platform_admins.user_id` 존재 여부를 검증합니다.
- 학원 생성 흐름은 기존 Next.js 정책과 동일합니다.
  - slug 중복 검사
  - Supabase Auth owner 계정 생성
  - `academies` 생성
  - `academy_settings.sms_dry_run=true` 기본 생성
  - owner `profiles` 생성
  - 초기 설정 실패 시 Auth user와 academy를 rollback합니다.
- 학원 상태/플랜 수정은 기존과 동일하게 `action=update_status`로 처리합니다.
- frontend 플랫폼 콘솔은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고, Spring 5xx/네트워크 실패 또는 URL 미설정 시 기존 Next.js API로 fallback합니다.
- Production에는 backend URL을 설정하지 않아 기존 Next.js API 기준을 유지합니다.

### T-649 남은 운영 API 이관

- Spring Boot에 남은 운영 API를 추가했습니다.
  - `POST /api/students/bulk`
  - `POST /api/student-schedules/bulk`
  - `POST /api/external-academy-classes`
  - `GET/POST /api/student-schedule-sharing`
- 기존 Next.js API는 삭제하지 않고 fallback으로 유지합니다.
- 학생 CSV 일괄 등록은 반명 매칭, 전화번호 정규화, 파일 내 중복/기존 학생 중복 제외, 공유 동의 자동 링크 동기화를 유지합니다.
- 반 공통 스케줄 일괄 등록은 담당 반 권한, 담당 선생님 검증, 동일 시간 중복 skip, audit log 기록을 유지합니다.
- 수동 타 학원 수업 연결/해제는 owner/manager만 허용하고 audit log를 유지합니다.
- 학원 간 스케줄 공유는 수동 공유 코드 생성/연결/해제와 연결 일정 조회를 Spring에 추가했습니다. 상대 학원명은 기존 정책대로 `연결 학원 N`처럼 익명으로 반환합니다.
- Frontend 관리/학생 상세/보강 화면은 `NEXT_PUBLIC_BACKEND_API_URL`이 있을 때 Spring API를 먼저 호출하고, Spring 5xx/네트워크 실패 또는 URL 미설정 시 기존 Next.js API로 fallback합니다.
- `/api/auth/redirect-target`는 로그인 화면의 Next.js server helper라 Spring 전환 대상 운영 API에서 제외합니다.
- Production에는 backend URL을 설정하지 않아 기존 Next.js API 기준을 유지합니다.

### T-650 Spring 전환 배포 준비 완료

- Spring 전환 상태를 “코드/API 이관 완료 + 로컬 검증 가능 + Railway 배포 준비 완료 + Production 미연결”로 고정합니다.
- Railway Root Directory, 필수 환경변수, health/auth/report/message smoke test, Vercel 연결/rollback 절차를 문서화했습니다.
- Production에는 아직 `NEXT_PUBLIC_BACKEND_API_URL`을 설정하지 않습니다.
- 실제 Railway 결제/배포와 Vercel Production 연결은 별도 승인 후 진행합니다.

## 12. 하지 않을 것

- 기존 Next.js API 즉시 제거
- 전체 API 일괄 이전
- Supabase Auth 제거
- Supabase DB를 다른 DB로 이전
- Next.js를 Spring Boot static resource로 서빙
- 실제 문자 발송 로직을 fallback 없이 전환
- 출석/보강 쓰기 로직을 검증 없이 전환
- 파일럿 안정화 전 대규모 도메인 재작성
