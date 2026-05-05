# 기술 설계서

## 1. 목표

Academy Follow-up은 여러 학원이 가입해 사용할 수 있는 멀티테넌트 SaaS로 설계합니다.

첫 구현 목표는 아래입니다.

> 더배움프라임영수학원 파일럿에서 선생님이 학생별 팔로업 문자를 생성/발송하고, 원장이 발송 기록을 확인할 수 있게 한다.

## 2. 아키텍처

```text
사용자 브라우저
  -> Next.js 웹앱
  -> Next.js Route Handler / Server Action
  -> Supabase Auth
  -> Supabase Postgres
  -> SOLAPI SMS/LMS API
```

## 3. 기술 스택

- Frontend: Next.js, TypeScript, Tailwind CSS
- UI: shadcn/ui, lucide-react
- Backend: Next.js Route Handlers, Server Actions
- Database: Supabase Postgres
- Auth: Supabase Auth
- Hosting: Vercel
- SMS/LMS: SOLAPI
- Error Tracking: Sentry
- Analytics: PostHog 또는 자체 이벤트 테이블
- DNS/Domain: Cloudflare

초기에는 AWS EC2, Kubernetes, 자체 문자 발송 서버를 사용하지 않습니다.

## 4. 배포 환경

### Local

- 로컬 개발
- `SMS_DRY_RUN` 기본 활성화
- 실제 문자 발송 금지

### Preview

- Vercel Preview Deployment
- GitHub PR 또는 브랜치별 확인
- Supabase 개발 프로젝트 사용
- 실제 문자 발송은 기본 차단

### Production

- Vercel Production Deployment
- Supabase Production 프로젝트 사용
- SOLAPI 실제 발송 가능
- 환경변수는 Vercel에 등록

## 5. 환경변수

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER_PHONE=

SMS_DRY_RUN=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

원칙:

- `SUPABASE_SERVICE_ROLE_KEY`, `SOLAPI_API_SECRET`은 클라이언트로 노출하지 않습니다.
- 실제 문자 발송은 서버 라우트에서만 수행합니다.
- 로컬과 Preview에서는 기본적으로 `SMS_DRY_RUN=true`를 유지합니다.

## 6. 멀티테넌트 원칙

모든 주요 데이터는 `academy_id`로 분리합니다.

핵심 테이블:

```text
platform_admins
academies
academy_settings
profiles
classes
students
message_templates
followups
message_logs
```

원칙:

- 사용자는 하나의 `academy_id`에 속합니다.
- 원장/관리자/선생님은 자기 학원 데이터만 볼 수 있습니다.
- Route Handler와 DB 정책 모두 `academy_id`를 기준으로 검증합니다.
- 나중에 여러 학원/지점 확장을 고려하되, 초기에는 한 사용자가 한 학원에만 속한다고 가정합니다.
- 플랫폼 관리자는 `platform_admins`에서 별도로 관리하며 특정 학원 소속 권한과 분리합니다.

## 7. 권한

초기 권한은 4개입니다.

- 플랫폼 권한:
  - `super_admin`: 전체 학원/운영 상태를 확인하는 SaaS 관리자
- `owner`: 원장, 전체 관리
- `manager`: 실장/관리자, 대부분의 운영 관리
- `teacher`: 담당 반/학생 관리 및 발송
- `assistant`: 체크/초안 작성 중심, 발송 권한은 학원 설정에 따라 제한 가능

초기 MVP에서는 `owner`, `teacher`를 먼저 구현하고, `manager`, `assistant`는 DB enum과 UI 확장 여지를 남깁니다.

## 8. DB 설계

실제 초기 스키마는 [supabase/schema.sql](../supabase/schema.sql)에 둡니다.

권한/테넌트 분리 배경은 [시스템 아키텍처](./architecture.md)에 둡니다.

### platform_admins

SaaS 전체를 운영하는 플랫폼 관리자입니다.

- `user_id`
- `role`
- `created_at`

### academies

학원 워크스페이스입니다.

- `id`
- `name`
- `slug`
- `owner_user_id`
- `plan`
- `status`
- `category`
- `logo_url`
- `brand_color`
- `naver_place_id`
- `sender_name`
- `sender_phone`
- `created_at`

### academy_settings

학원별 운영 설정입니다.

- `academy_id`
- `sms_dry_run`
- `allow_assistant_send`
- `duplicate_guard_minutes`
- `parent_phone_masking`
- `created_at`
- `updated_at`

### profiles

Supabase Auth 사용자와 학원 권한을 연결합니다.

- `id`
- `academy_id`
- `email`
- `name`
- `role`
- `created_at`

### classes

반 정보입니다.

- `id`
- `academy_id`
- `name`
- `subject`
- `grade_label`
- `teacher_id`
- `created_at`

### students

학생과 학부모 연락처입니다.

- `id`
- `academy_id`
- `class_id`
- `name`
- `school_name`
- `grade_label`
- `parent_name`
- `parent_phone`
- `status`
- `created_at`

### message_templates

학원별 문자 템플릿입니다.

- `id`
- `academy_id`
- `reason`
- `title`
- `body`
- `is_active`
- `created_at`

### followups

학생별 팔로업 업무 단위입니다.

- `id`
- `academy_id`
- `student_id`
- `class_id`
- `teacher_id`
- `reason`
- `message_body`
- `status`
- `sent_at`
- `created_at`

### message_logs

실제 발송 결과 로그입니다.

- `id`
- `academy_id`
- `followup_id`
- `provider`
- `provider_message_id`
- `recipient_phone`
- `status`
- `error_message`
- `created_at`

## 9. 문자 발송 프로세스

1. 선생님이 학생과 사유를 선택
2. 서버가 사용자 권한과 `academy_id`를 확인
3. 서버가 학생, 학원, 템플릿 정보를 조회
4. 템플릿에 학생명/학원명/선생님명을 반영
5. 미리보기 반환
6. 사용자가 문구를 확인하고 발송 클릭
7. 서버가 동일 학생/동일 사유/같은 날짜 중복 발송 여부 확인
8. `followups`에 발송 요청 기록 생성
9. `SMS_DRY_RUN`이면 실제 발송 없이 dry-run 응답 저장
10. 실제 발송이면 SOLAPI 호출
11. `message_logs` 저장
12. `followups.status`, `sent_at` 갱신

## 10. API 초안

초기 API는 작게 시작합니다.

```text
POST /api/messages/preview
POST /api/messages/send
GET  /api/followups/today
GET  /api/students?classId=
```

현재 구현된 API:

```text
POST /api/messages/send
```

## 11. 안전장치

- 발송 전 미리보기 필수
- 하루 동일 학생/동일 사유 중복 발송 경고
- 모든 발송 로그 저장
- 원장/관리자만 템플릿 수정 가능
- 학부모 전화번호 마스킹 옵션
- 권한 없는 반/학생 접근 차단
- 로컬/Preview는 실제 문자 발송 기본 차단
- 발송 실패 시 에러 메시지 저장

## 12. 구현 순서

### Phase 1: 데모 UI

- 학원 브랜딩 화면
- 오늘의 팔로업 카드
- 학생 리스트
- 사유 선택
- 문자 미리보기

### Phase 2: Supabase 연결

- Supabase 프로젝트 생성
- `schema.sql` 적용
- 더배움프라임영수학원 seed 데이터
- 로그인
- 사용자 profile 연결

### Phase 3: 실제 데이터 화면

- 반 목록 조회
- 학생 목록 조회
- 팔로업 생성
- 발송 기록 조회
- 오늘의 팔로업 대시보드

### Phase 4: 문자 발송

- SOLAPI 계정/발신번호 설정
- dry-run / production 분리
- 실제 SMS/LMS 발송
- 발송 결과 로그 저장

### Phase 5: 파일럿 운영

- 선생님 2~3명 계정 생성
- 반 2개, 학생 30명 내외로 테스트
- 2주 사용 기록 확인
- 템플릿/화면 흐름 수정

## 13. 데이터 보안

이 서비스는 학생 이름과 학부모 전화번호를 다루므로 개인정보 최소 수집 원칙을 적용합니다.

- 학생 이름, 반, 학부모 전화번호 외 정보는 초기에는 최소화합니다.
- 학부모 전화번호는 화면에서 마스킹 옵션을 제공합니다.
- 발송 로그는 학원 내부 운영 목적으로만 사용합니다.
- RLS 정책으로 학원 간 데이터 접근을 차단합니다.
- 관리자 기능에는 권한 확인을 반드시 둡니다.

## 14. Vercel 배포 흐름

```text
local main
  -> GitHub main
  -> Vercel Production build
  -> academy-followup.vercel.app
```

나중에 커스텀 도메인을 붙이면 Cloudflare에서 DNS를 관리합니다.



## 15. 작업 티켓 연결

구현 순서는 [작업 티켓](./tickets.md)을 기준으로 관리합니다.

다음 우선순위:

1. T-103 Supabase 프로젝트 연결
2. T-201 로그인 화면 구현
3. T-202 학원 생성 플로우 구현
4. T-203 파일럿 학원 seed 데이터 추가

Supabase 연결 절차는 [Supabase 연결 가이드](./supabase-setup.md)를 따릅니다.
