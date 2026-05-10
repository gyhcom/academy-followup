# 시스템 아키텍처

## 1. 설계 목표

Academy Follow-up은 처음에는 더배움프라임영수학원 파일럿으로 시작하지만, 구조는 여러 학원이 독립적으로 사용하는 B2B SaaS를 전제로 합니다.

핵심 설계 목표:

- 학원별 데이터가 섞이지 않아야 합니다.
- 플랫폼 관리자와 학원 내부 관리자를 분리해야 합니다.
- 로그인한 사용자는 자기 학원 워크스페이스로 들어가야 합니다.
- 문자 발송은 서버에서만 수행해야 합니다.
- 실제 문자 발송 전 dry-run으로 전체 흐름을 검증할 수 있어야 합니다.

## 2. 권한 계층

권한은 두 층으로 분리합니다.

### 플랫폼 권한

플랫폼 권한은 SaaS 운영자인 우리 쪽 권한입니다.

- `platform_admins`
- 특정 학원 소속 권한이 아님
- 전체 학원 목록, 장애 확인, 고객지원, 요금제 조정에 사용

초기 역할:

- `super_admin`: 전체 운영자

### 학원 내부 권한

학원 내부 권한은 특정 `academy_id` 안에서만 의미가 있습니다.

- `owner`: 원장
- `manager`: 실장/관리자
- `teacher`: 정규 선생님
- `assistant`: 보조 선생님

초기 MVP에서는 `owner`, `teacher`를 먼저 구현하고, `manager`, `assistant`는 확장 여지를 남깁니다.

## 3. 테넌트 모델

학원 하나가 하나의 테넌트입니다.

```text
academies
  -> academy_settings
  -> profiles
  -> classes
  -> students
  -> message_templates
  -> followups
  -> message_logs
```

모든 운영 데이터에는 `academy_id`가 들어갑니다.

유지보수 원칙:

- 새 테이블이 학원 운영 데이터라면 기본적으로 `academy_id`를 둡니다.
- Route Handler에서 사용자의 `profile.academy_id`와 요청 대상 데이터의 `academy_id`를 비교합니다.
- RLS 정책도 같은 기준으로 추가합니다.

## 4. 학원 워크스페이스

`academies`는 워크스페이스 식별과 브랜딩을 담당합니다.

주요 필드:

- `name`: 학원명
- `slug`: URL/식별용 문자열
- `owner_user_id`: 학원 소유자
- `plan`: 요금제
- `status`: 사용 상태
- `category`: 학원 유형
- `logo_url`: 로고
- `brand_color`: 대표 색상
- `naver_place_id`: 네이버 플레이스 ID
- `sender_name`: 문자 발신명
- `sender_phone`: 문자 발신번호

## 5. 학원 설정

`academy_settings`는 운영 중 바뀔 수 있는 설정을 담당합니다.

초기 필드:

- `sms_dry_run`: 실제 문자 발송 차단 여부
- `allow_assistant_send`: 보조 선생님 발송 허용 여부
- `duplicate_guard_minutes`: 중복 발송 경고 시간
- `parent_phone_masking`: 학부모 전화번호 마스킹 여부

`academies`와 `academy_settings`를 분리한 이유:

- 학원 식별/브랜딩 정보와 운영 정책을 분리하기 위해
- 설정 옵션이 늘어나도 `academies`가 비대해지는 것을 막기 위해
- 나중에 설정 화면을 별도로 만들기 쉽게 하기 위해

## 6. 문자 발송 경계

문자 발송은 반드시 서버 경유로만 실행합니다.

```text
Client
  -> /api/messages/preview
  -> /api/messages/send
  -> SOLAPI
```

클라이언트에는 아래 값을 노출하지 않습니다.

- `SOLAPI_API_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- 실제 발송 provider 응답 원본 중 민감한 값

## 7. 데이터 접근 흐름

로그인 후 기본 흐름:

1. Supabase Auth에서 user 확인
2. `profiles`에서 사용자의 `academy_id`, `role` 조회
3. `academies`에서 학원 워크스페이스 조회
4. `academy_settings`에서 운영 설정 조회
5. role에 따라 화면/액션 제한

플랫폼 관리자 흐름:

1. Supabase Auth에서 user 확인
2. `platform_admins`에 등록되어 있는지 확인
3. 등록되어 있으면 플랫폼 관리자 콘솔 접근 허용

## 8. 구현 원칙

- DB 스키마 변경은 티켓 단위로 커밋합니다.
- 권한 로직은 화면에만 두지 않고 서버/API에서도 검증합니다.
- MVP에서 쓰지 않는 역할도 DB enum에는 남기되, UI에서는 필요한 것부터 노출합니다.
- 코드 주석은 "무엇을 하는지"보다 "왜 이렇게 나눴는지"에 집중합니다.

