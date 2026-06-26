# Academy Follow-up 문서 인덱스

Academy Follow-up 문서는 `현재 의사결정 기준`과 `과거 참고 기록`을 구분해서 관리합니다.
새 작업을 시작할 때는 먼저 `active` 문서를 보고, 상세 근거가 필요할 때 `testing`, `product`, `engineering` 문서를 확인합니다.

## 1. 지금 먼저 봐야 할 문서

- [현재 로드맵](./active/current-roadmap.md)
- [현재 이슈 정리](./active/current-issues.md)
- [파일럿 상태](./active/pilot-status.md)
- [운영 전환 릴리즈 체크리스트](./testing/operations-release-readiness-2026-06.md)
- [원장 요구사항 완료/미완료 정리](./testing/director-requirements-status-2026-06.md)
- [실제 구조 데이터 운영 전환 검증](./testing/operations-real-data-transition-2026-06.md)
- [SOLAPI 테스트 번호 제한 발송 준비](./testing/solapi-test-number-readiness-2026-06.md)
- [Monorepo 전환 계획](./architecture/monorepo-transition-plan.md)
- [Spring Boot 전환 계획](./architecture/spring-boot-transition-plan.md)
- [Railway Backend 배포 준비 체크리스트](./architecture/railway-backend-deployment-readiness.md)

## 2. 현재 운영/파일럿 기준 문서

- [200명 운영형 데이터 모바일 파일럿 UAT](./testing/pilot-mobile-uat-200-students-2026-06.md)
- [파일럿 seed 적용 상태 정합성 점검](./testing/pilot-seed-consistency-2026-06.md)
- [모바일 UX/버튼/문구 점검](./testing/mobile-ux-polish-review-2026-06.md)
- [운영 전환 릴리즈 체크리스트](./testing/operations-release-readiness-2026-06.md)
- [원장 요구사항 완료/미완료 정리](./testing/director-requirements-status-2026-06.md)
- [운영 데이터 정리 전 선행 점검](./testing/operations-pre-reset-checklist-2026-06.md)
- [실제 구조 데이터 운영 전환 검증](./testing/operations-real-data-transition-2026-06.md)
- [SOLAPI 테스트 번호 제한 발송 준비](./testing/solapi-test-number-readiness-2026-06.md)
- [파일럿 릴리즈 체크리스트](./testing/pilot-release-checklist-2026-05-29.md)
- [원장 파일럿 체크리스트](./testing/director-pilot-checklist-2026-05-31.md)
- [선생님 파일럿 체크리스트](./testing/teacher-pilot-checklist-2026-05-31.md)

## 3. 제품화/기획 문서

- [제품화 점검 보고서](./productization-review.md)
- [제품 기획서](./product/product-plan.md)
- [벤치마킹 기반 기능 맵](./product/benchmark-feature-map.md)
- [한국 경쟁 서비스 리서치](./product/competitive-research-kr.md)
- [가격 및 무료 정책 전략](./product/pricing-strategy.md)

## 4. 아키텍처 문서

- [현재 시스템 아키텍처](./engineering/architecture.md)
- [기술 설계서](./engineering/technical-plan.md)
- [권한 정책](./engineering/role-permissions.md)
- [Supabase 연결 가이드](./engineering/supabase-setup.md)
- [Monorepo 전환 계획](./architecture/monorepo-transition-plan.md)
- [Spring Boot 전환 계획](./architecture/spring-boot-transition-plan.md)
- [Railway Backend 배포 준비 체크리스트](./architecture/railway-backend-deployment-readiness.md)

## 5. 테스트/UAT 기록

`docs/testing`에는 기능별 검수 결과와 UAT 기록을 보관합니다. 날짜가 붙은 결과 문서는 과거 실행 증거이며, 현재 의사결정 기준은 `docs/active` 문서에서 요약합니다.

주요 기준 문서:

- [200명 운영형 데이터 모바일 파일럿 UAT](./testing/pilot-mobile-uat-200-students-2026-06.md)
- [파일럿 seed 정합성](./testing/pilot-seed-consistency-2026-06.md)
- [assistant 발송 제한 UAT](./testing/assistant-send-permission-uat-2026-06.md)
- [모바일 UX 점검](./testing/mobile-ux-polish-review-2026-06.md)
- [실제 구조 데이터 운영 전환 검증](./testing/operations-real-data-transition-2026-06.md)
- [SOLAPI 테스트 번호 제한 발송 준비](./testing/solapi-test-number-readiness-2026-06.md)

## 6. archive 문서

- [Archive 안내](./archive/2026-06/README.md)
- `archive`는 더 이상 현재 기준은 아니지만 히스토리 보존이 필요한 문서를 둡니다.
- 현재는 링크 안정성을 우선해 기존 문서를 대량 이동하지 않고, 오래된 문서의 성격을 이 README에서 명확히 구분합니다.

## 7. 문서 관리 규칙

- 현재 의사결정 기준 문서는 `docs/active`에 둡니다.
- 아키텍처 변경 기준은 `docs/architecture`에 둡니다.
- 테스트/UAT 결과는 `docs/testing`에 둡니다.
- 제품화/기획 검토는 `docs/product` 또는 루트 제품화 문서에 둡니다.
- 더 이상 현재 기준이 아닌 문서는 삭제하지 말고 `docs/archive/YYYY-MM`로 이동합니다.
- 같은 내용을 새 문서로 계속 만들지 말고, 현재 기준 문서를 업데이트합니다.
- GitHub Issue는 실제 실행 카드이고, `docs/planning/tickets.md`는 전체 백로그입니다.
