# Spring Boot 전환 계획

## 1. 전환 목적

Spring Boot 전환은 파일럿 MVP를 빠르게 다시 만드는 작업이 아니라, 장기 유지보수와 B2B SaaS 확장을 위한 백엔드 경계 분리입니다.

목표는 Next.js를 화면/UX 중심으로 유지하고, 복잡한 권한, 감사 로그, 리포트, 문자 발송, 출석/보강 도메인 로직을 점진적으로 백엔드 서비스로 옮기는 것입니다.

## 2. Spring Boot로 옮기기 좋은 영역

- report
- audit log
- message preview
- message send
- permission check
- attendance/makeup domain logic

우선순위는 read-only 또는 low-risk API부터 시작합니다. 실제 문자 발송과 출석/보강 핵심 로직은 충분한 테스트와 운영 피드백 이후 검토합니다.

## 3. 당분간 Next.js에 남길 영역

- 화면
- 모바일 UX
- 라우팅
- 로그인 UI
- 관리 화면 UI
- 파일럿 중 빠르게 바뀌는 문구/버튼/흐름

## 4. 초기 Spring Boot 범위

- health check
- actuator
- Supabase 연결 설정 skeleton
- report read-only API skeleton
- local setup document

초기 skeleton은 기존 Next.js API를 대체하지 않습니다. 병렬로 띄우고, 안전한 조회 API부터 검증합니다.

## 5. 하지 않을 것

- 기존 API 즉시 제거
- Supabase Auth 제거
- 출석/문자/보강 전체 재작성
- Next.js를 Spring Boot static으로 서빙
- 파일럿 안정화 전 대규모 백엔드 전환

## 6. 추천 패키지 구조

```text
com.academyfollowup.api
├─ global
│  ├─ config
│  ├─ error
│  ├─ response
│  └─ security
├─ academy
├─ member
├─ attendance
├─ message
├─ report
└─ audit
```

## 7. 첫 번째 Spring Boot 이슈 후보

### T-630 Spring Boot backend skeleton 추가

목표:

- `apps/backend`에 최소 Spring Boot 프로젝트를 추가합니다.
- health check, actuator, Supabase 설정 skeleton, local setup 문서를 구성합니다.
- 기존 Next.js 앱과 배포 흐름을 깨지 않습니다.

제외:

- 기존 API 이전
- Supabase Auth 교체
- 실제 문자 발송 전환
- 출석/보강 도메인 재작성

완료 기준:

- `GET /health`와 actuator health가 로컬에서 응답합니다.
- 기존 Next.js `/api/*`는 계속 frontend 앱이 담당합니다.
- Spring Boot는 아직 Vercel 배포 대상에 포함하지 않습니다.

### T-631 Supabase JWT/권한 컨텍스트 설계

T-630 다음 단계에서는 Spring Boot에서 Supabase JWT를 검증하고 `academy_id`, `role`, `user_id`를 조회하는 권한 컨텍스트를 설계합니다.

### T-632 read-only API 첫 이관

첫 API 이관은 리포트/감사 로그 같은 조회 중심 API에서 시작합니다. 출석/문자/보강 핵심 쓰기 로직은 마지막에 검토합니다.
