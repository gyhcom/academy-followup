# 현재 로드맵

## 1. 현재 상태

- Next.js + Supabase 기반 MVP 구현 완료
- 200명 파일럿 seed 기준 데이터 정합성 정상화 완료
- 모바일 390px 기준 UAT와 UX 점검 문서화 완료
- 원장/선생님/보조 선생님 계정 기준 권한 검증 진행
- 장기적으로 Spring Boot 백엔드 중심 구조 전환 검토 중

## 2. 단기 목표

- 현재 MVP 안정화
- 파일럿 기준 데이터와 Production 상태 확인
- 기존 PR/이슈 정리
- 문서 기준 정리
- `frontend/backend/supabase/docs` 구조 전환 준비

## 3. 중기 목표

- Next.js 앱을 `frontend/academy-followup-web`로 이동
- Spring Boot API를 `backend/academy-followup-api`로 추가
- IntelliJ에서 루트 프로젝트 기준으로 관리 가능하게 정리
- report, audit, message preview 같은 read 또는 low-risk API부터 Spring Boot로 분리 검토

## 4. 장기 목표

- Spring Boot를 핵심 백엔드로 사용
- Next.js는 화면/UX 중심으로 유지
- Supabase는 PostgreSQL/Auth 기반으로 유지하거나 점진적 대체 검토
- 출석/문자/보강/권한/감사 로그/리포트 도메인을 백엔드 중심으로 정리

## 5. 하지 않을 것

- 당장 전체 재작성
- 기존 Next.js API 즉시 제거
- Supabase Auth 즉시 제거
- 운영 화면을 Spring Boot에 직접 종속
- 고객 피드백 없이 대규모 기능 추가
