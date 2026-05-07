# 기술 설계서

## 1. 목표

Academy Follow-up은 여러 학원이 가입해 사용할 수 있는 멀티테넌트 SaaS로 설계합니다.

첫 구현 목표는 아래입니다.

> 더배움프라임영수학원 파일럿에서 선생님과 원장이 반별 출석부를 체크하고, 결석/지각/보강 같은 팔로업 문자를 학생 스케줄과 연결해 생성·기록할 수 있게 한다.

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
student_schedules
attendance_records
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

### student_schedules

학생별 주간 반복 스케줄과 외부 일정을 관리하는 테이블입니다.

- `id`
- `academy_id`
- `student_id`
- `class_id`
- `teacher_id`
- `schedule_type`: `regular_class`, `makeup`, `external`, `consultation`
- `schedule_date`: 날짜 지정 1회 일정인 경우 사용
- `day_of_week`: 0~6
- `start_time`
- `end_time`
- `subject`
- `title`
- `memo`
- `is_active`
- `source_followup_id`: 보강 문자 발송 후 자동 등록된 일정이면 연결되는 팔로업 ID
- `created_at`
- `updated_at`

제약과 조회 기준:

- `day_of_week`는 0=일요일, 1=월요일, ... 6=토요일로 저장합니다.
- `start_time < end_time` 제약으로 잘못된 시간 범위를 막습니다.
- 학생 상세 화면은 `student_id, day_of_week, start_time` 인덱스를 기준으로 조회합니다.
- 날짜 지정 일정은 `student_id, schedule_date, start_time` 인덱스를 기준으로 조회합니다.
- 원장용 전체 주간표는 `academy_id, day_of_week, start_time` 인덱스를 기준으로 조회합니다.
- `class_id`, `teacher_id`는 선택 연결입니다. 외부 일정은 반 없이 저장할 수 있습니다.
- 같은 학생, 같은 날짜, 같은 시간대의 활성 보강 일정은 중복 등록하지 않습니다.

초기에는 외부 캘린더 라이브러리 없이 앱 내부 월간 달력과 직접 시간 입력으로 날짜별 보강을 지원합니다.
날짜가 없는 일정은 주간 반복, 날짜가 있는 일정은 1회성 일정으로 처리합니다.

보강 스케줄링 구현 경계:

- `makeup-scheduling.ts`: 날짜 계산, 월간 달력 셀 생성, 날짜별 스케줄 필터링, 보강 후보 생성 담당 도메인 클래스
- `makeup-calendar-panel.tsx`: 월간 달력 UI와 시간 입력 UI
- `operations-board.tsx`: 선택 학생/문자/팔로업 상태 연결

React 컴포넌트 안에 날짜 계산 규칙을 직접 쌓지 않고, `MakeupSchedulePlanner`에서 한 번 관리합니다.

### attendance_records

날짜/반/수업 시간 기준 출석부 기록입니다.

- `id`
- `academy_id`
- `student_id`
- `class_id`
- `teacher_id`
- `attendance_date`
- `scheduled_start_time`
- `scheduled_end_time`
- `status`: `pending`, `present`, `late`, `absent`, `makeup`, `excused`, `needs_check`
- `checked_at`
- `arrived_at`
- `note`
- `followup_id`
- `created_at`
- `updated_at`

제약과 조회 기준:

- 한 학생은 같은 `academy_id, student_id, class_id, attendance_date, scheduled_start_time` 조합에 하나의 출석 기록만 가집니다.
- 선생님용 출석부는 `academy_id, class_id, attendance_date, scheduled_start_time` 기준으로 조회합니다.
- 원장/데스크 현황은 `academy_id, attendance_date, status` 기준으로 집계합니다.
- 16:00 수업에서 16:10 미도착, 16:15 도착 같은 예외를 처리할 수 있게 `needs_check`, `late`, `arrived_at`을 분리합니다.
- 결석/지각 문자 발송 기록은 `followup_id`로 연결하되, 문자 발송 전 상태 수정이 가능해야 합니다.

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

## 10. 화면/라우트 구조

초기 화면은 파일럿 시연과 실제 로그인 흐름을 분리합니다.

```text
/        공개 데모 화면
/login   Supabase Auth 이메일/비밀번호 로그인
/app     로그인 후 학원 운영 보드
```

`/app` 내부 주요 소스:

```text
src/app/app/page.tsx              서버 데이터 조회와 권한별 workspace 데이터 구성
src/app/app/app-workspace.tsx     운영 보드/관리 탭 전환 shell
src/app/app/operations-board.tsx  선생님 팔로업 운영 보드
src/app/app/operations-schedule.tsx 선택 학생 주간 스케줄 패널
src/app/app/management-home.tsx   관리 홈 상태와 저장 핸들러
src/app/app/student-directory.tsx 학생 검색/필터/상세 패널
src/app/app/management-forms.tsx  반/학생/스케줄 입력 폼
src/app/app/management-common.tsx 관리 화면 공통 UI
src/app/app/management-utils.ts   관리 화면 정렬/라벨/스케줄 helper
src/app/app/management-types.ts   관리 화면 공유 타입
```

원칙:

- `/app`은 서버에서 Supabase 세션을 확인하고, 비로그인 사용자는 `/login`으로 보냅니다.
- 로그인 후 `profiles.academy_id`를 기준으로 해당 학원 워크스페이스를 조회합니다.
- 아직 프로필이 연결되지 않은 사용자는 학원 생성/초대 플로우로 연결할 수 있게 빈 상태를 보여줍니다.
- 세션 쿠키 갱신은 Next.js proxy에서 처리합니다.

## 11. API 초안

초기 API는 작게 시작합니다.

```text
POST /api/messages/preview
POST /api/messages/send
GET  /api/followups/today
GET  /api/students?classId=
```

현재 구현된 API:

```text
POST /api/classes
PATCH /api/classes
POST /api/students
PATCH /api/students
POST /api/student-schedules
PATCH /api/student-schedules
POST /api/messages/preview
POST /api/messages/send
POST /api/followups
GET  /api/attendance
POST /api/attendance
PATCH /api/attendance/:id
GET  /api/health/supabase
```

## 12. 안전장치

- 발송 전 미리보기 필수
- 하루 동일 학생/동일 사유 중복 발송 경고
- 모든 발송 로그 저장
- 원장/관리자만 템플릿 수정 가능
- 학부모 전화번호 마스킹 옵션
- 권한 없는 반/학생 접근 차단
- 로컬/Preview는 실제 문자 발송 기본 차단
- 발송 실패 시 에러 메시지 저장
- 출석부의 `needs_check` 상태는 자동 문자 발송 대상이 아니라 확인 대기 대상
- 결석/지각 문자는 출석 상태 선택 후에도 미리보기와 확인 단계를 거침

## 13. 구현 순서

### 완료된 기반

- 공개 데모 UI
- GitHub/Vercel Production 배포
- Supabase schema/seed 적용
- Supabase SSR client/proxy 구성
- Production 환경변수 연결
- 로그인/로그아웃
- 테스트 계정 profile/academy 연결
- 앱 내부 운영/관리 탭 분리
- 반 등록/수정 API와 관리 화면 폼
- 학생 등록/수정 API와 관리 화면 폼
- 학생별 주간 스케줄 DB 모델
- 학생별 주간 스케줄 등록/수정 API와 관리 화면 폼
- 학생 관리 리스트/상세 패널과 시간 중심 정렬/필터
- 운영 보드 선택 학생 주간 스케줄 패널
- 보강 후보 시간 선택과 보강 안내 문자 초안
- 저장된 팔로업 기준 dry-run 발송 API와 message log 저장
- 학생별 최근 팔로업 히스토리 API와 운영 보드 패널
- 출석부 DB 모델과 수업 세션 기준
- 반별 출석부 화면과 `/api/attendance` 조회/저장 API
- 출석부 결석/지각 문자 초안과 팔로업 연결
- 원장/데스크 오늘 출석 현황과 연락 대상 목록

### 다음 구현 순서

1. 학부모/학생 수신자 선택
2. 스케줄 일괄 등록과 개인 스케줄 추가
3. 서버 기준 중복 발송 차단
4. 원장/선생님 권한 테스트
5. SOLAPI 실제 SMS 발송 테스트

## 14. 제품 기능 범위와 기술 경계

랜딩과 메뉴는 학원 운영 SaaS의 큰 범위를 보여주지만, 구현은 아래 경계로 나눕니다.

### 즉시 구현 영역

- 팔로업 기록 저장
- 반 등록/수정
- 학생 등록/수정
- 학생별 주간 스케줄
- 반별 출석부
- 결석/지각 문자 연결
- 보강 문자 생성
- dry-run 발송 로그
- 학생별 히스토리
- 오늘의 팔로업 집계
- 선생님 기본 관리

### 구조만 준비할 영역

- 수납/청구
- 다지점 관리
- 카카오 알림톡
- 구글 캘린더 수준의 복잡한 일정 관리
- 플랫폼 관리자 콘솔
- 결제/구독

### 기술 원칙

- 모든 기능은 `academy_id`를 기준으로 테넌트 분리합니다.
- 앱 내부 메뉴는 기능이 늘어나도 `운영`, `관리`, `설정`으로 분리합니다.
- 모바일에서는 선생님 작업 흐름을 우선하고, PC에서는 원장/관리자 확인 화면을 우선합니다.
- 스케줄 기능은 먼저 주간 반복 시간표로 제한하고, 날짜별 예외/드래그 앤 드롭 캘린더는 검증 후 확장합니다.
- 제품 목업이나 랜딩 애니메이션은 실제 업무 UI와 분리하되, 같은 정보 구조를 사용합니다.

### 파일럿 전 필수 테스트

- 비로그인 사용자의 `/app` 접근 차단
- 원장 계정 로그인 후 전체 반/학생 조회
- 선생님 계정 로그인 후 담당 반 중심 조회
- dry-run 발송 시 실제 문자 비용 미발생
- 발송 기록 저장
- 중복 발송 경고
- 학부모 전화번호 마스킹
- 모바일/태블릿/PC 주요 화면 overflow 점검
- 비로그인 주요 API 401 확인

### 실제 문자 발송 전제

- SOLAPI 계정/발신번호 설정
- dry-run / production 분리
- 실제 SMS/LMS 발송
- 발송 결과 로그 저장

### 파일럿 운영

- 선생님 2~3명 계정 생성
- 반 2개, 학생 30명 내외로 테스트
- 2주 사용 기록 확인
- 템플릿/화면 흐름 수정

## 14. 데이터 보안

이 서비스는 학생 이름과 학부모 전화번호를 다루므로 개인정보 최소 수집 원칙을 적용합니다.

- 학생 이름, 반, 학부모 전화번호 외 정보는 초기에는 최소화합니다.
- 학부모 전화번호는 화면에서 마스킹 옵션을 제공합니다.
- 발송 로그는 학원 내부 운영 목적으로만 사용합니다.
- RLS 정책으로 학원 간 데이터 접근을 차단합니다.
- 관리자 기능에는 권한 확인을 반드시 둡니다.

## 15. 디자인/접근성 기준

화면 설계 기준은 [디자인 원칙](./design-principles.md)에 둡니다.

핵심 기준:

- 업무 흐름은 한 화면 안에서 끝냅니다.
- 클릭 영역은 최소 44px, 가능하면 48px 이상으로 유지합니다.
- 텍스트와 배경 대비는 WCAG 2.2 AA 수준을 목표로 합니다.
- 오류/상태는 색상만으로 표현하지 않고 텍스트와 아이콘을 같이 사용합니다.
- 반/학생/문자 작업 패널은 키보드 Tab 순서가 실제 업무 순서와 같아야 합니다.

## 16. Vercel 배포 흐름

```text
local main
  -> GitHub main
  -> Vercel Production build
  -> academy-followup.vercel.app
```

나중에 커스텀 도메인을 붙이면 Cloudflare에서 DNS를 관리합니다.



## 17. 작업 티켓 연결

구현 순서는 [작업 티켓](./tickets.md)을 기준으로 관리합니다.

다음 우선순위:

1. T-223 학부모/학생 수신자 선택
2. T-222 스케줄 일괄 등록과 개인 스케줄 추가
3. T-309 서버 기준 중복 발송 차단
4. T-312 원장/선생님 권한 테스트
5. T-310 SOLAPI 실제 발송

Supabase 연결 절차는 [Supabase 연결 가이드](./supabase-setup.md)를 따릅니다.
