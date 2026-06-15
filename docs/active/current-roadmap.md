# 현재 로드맵

## 1. 현재 상태

- Next.js + Supabase 기반 MVP 구현 완료
- 200명 파일럿 seed 기준 데이터 정합성 정상화 완료
- 모바일 390px 기준 UAT와 UX 점검 문서화 완료
- 원장/선생님/보조 선생님 계정 기준 권한 검증 진행
- Spring Boot 운영 API 코드 전환 완료, Railway 배포 준비 단계

## 2. 단기 목표

- 6월 중순까지 Spring Boot 전환 코드를 운영 API 기준으로 완료하고 배포 준비 문서화
- Next.js 앱은 `apps/frontend`, Spring Boot는 `apps/backend`로 분리 완료
- 200명 seed 검증에서 실제 구조 데이터 20~30명 운영 전환 검증으로 이동
- SOLAPI 테스트 번호 1건 제한 발송 준비
- PC 홈/관리 콘솔은 선생님 PC 사용을 고려한 업무형 레이아웃으로 개선 완료
- 기존 PR/이슈 정리
- 문서 기준 정리

## 3. 중기 목표

- Next.js 앱을 `apps/frontend`에서 안정화
- Spring Boot API를 `apps/backend`에 추가 완료
- IntelliJ에서 루트 프로젝트 기준으로 관리 가능하게 정리
- Railway 결제 후 Spring Boot backend를 배포하고 Vercel frontend와 제한적으로 연결
- 실제 운영 데이터는 20~30명부터 투입하고, dry-run 검증 후 테스트 번호 1건 발송으로 확대

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
- Railway 결제 전 Production에 Spring backend URL 연결
- 테스트 번호 검증 전 실제 학부모 번호 문자 발송
