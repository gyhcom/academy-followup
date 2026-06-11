# 현재 이슈 정리

이 문서는 현재 실행 카드와 후속 후보를 한눈에 보기 위한 요약입니다.  
상세 백로그는 [작업 티켓](../planning/tickets.md)을 기준으로 유지합니다.

| 티켓 | 상태 | 우선순위 | 목적 | 선행 조건 | 다음 액션 |
| --- | --- | --- | --- | --- | --- |
| T-617 파일럿 seed 적용 상태 정합성 점검 | 완료 | P0 | 200명 파일럿 기준 데이터 고정 | Supabase verify SQL 실행 | 정상화된 기준값 유지 |
| T-620 assistant 발송 제한 실계정 UAT | 완료 | P1 | 보조 선생님 발송 제한 확인 | assistant 계정 준비 | 운영 중 권한 회귀 확인 |
| T-619 전체문자 발송 전 대상/중복 제외 카운트 미리보기 | 완료 | P1 | 전체문자 전 대상/중복 제외 수 확인성 강화 | 200명 데이터 | 파일럿에서 원장 이해도 확인 |
| T-618 선생님/보조 홈 요약 담당 기준 정리 | 완료 | P1 | 담당 반 기준 오늘 할 일 표시 | 역할별 데이터 검증 | 운영 중 역할별 회귀 확인 |
| T-621 개발자식 용어 제거 | 완료 | P0 | `dry-run`, `pending`, `팔로업` 등 사용자 문구 정리 | UX 점검 문서 | 운영 중 새 문구 회귀 확인 |
| T-622 홈 상태 문구 통일 | 완료 | P1 | 홈의 문자 대상/미발송/완료 표현 통일 | T-621 방향 확정 | 운영 중 홈 문구 회귀 확인 |
| T-623 위험 동작 버튼 스타일/확인 문구 통일 | 완료 | P1 | 삭제/해제/발송/개인정보 포함 액션 실수 방지 | 현재 버튼 목록 점검 | 운영 중 위험 액션 회귀 확인 |
| T-624 빈 상태 문구 개선 | 완료 | P2 | 빈 화면에서 다음 행동 안내 | role별 빈 상태 확인 | 운영 중 빈 상태 문구 회귀 확인 |
| T-625 assistant 발송 버튼 권한 안내 개선 | 완료 | P2 | 보조 선생님 발송 제한을 버튼/문구에서 사전 안내 | T-620 실계정 UAT | 운영 중 assistant 권한 문구 회귀 확인 |
| T-628 docs 정리 및 monorepo 전환 준비 | 완료 | P1 | 문서 기준 정리와 구조 전환 준비 | 현재 docs 목록 점검 | 기준 문서 유지 |
| T-629 Next.js 앱 frontend 디렉터리 이동 | 완료 | P1 | monorepo 목표 구조로 프론트 이동 | T-628 완료 | Vercel frontend 기준 유지 |
| T-630 Spring Boot backend skeleton 추가 | 완료 | P1 | 백엔드 전환을 위한 최소 Spring Boot 앱 추가 | T-629 완료 | 로컬 backend 유지 |
| T-631 Spring Boot 인증/권한 컨텍스트 | 완료 | P1 | Supabase token 기반 사용자/학원/역할 컨텍스트 구성 | T-630 완료 | `/api/auth/context` smoke 유지 |
| T-632 report summary API 첫 이관 | 완료 | P1 | `GET /api/reports/summary`를 Spring Boot로 우선 이전 | T-631 완료 | 로컬 Spring API와 기존 Next API 숫자 회귀 확인 |
| T-633 Railway 배포 준비 | 보류 | P1 | `apps/backend`를 Railway 서비스로 배포 가능하게 설정 | T-632 로컬 검증 | Railway 결제 전까지 보류 |
| T-634 Frontend-Spring 로컬 연동 | 완료 | P1 | 로컬 frontend에서 Spring report API 우선 호출 및 fallback 구성 | T-632 | `NEXT_PUBLIC_BACKEND_API_URL`은 로컬에서만 사용 |
| T-635 로컬 Spring 검증 루틴 | 완료 | P1 | AI 도움 없이 로컬 Spring 검증을 반복할 수 있게 문서/스크립트 제공 | T-632 | 검증 루틴 유지 |
| T-636 로컬 Spring 전환 소스 정리 | 완료 | P1 | 다음 API 이관 전 Supabase REST/fallback 패턴 정리 | T-635 | 공통 client/helper 기반 유지 |
| T-637 Spring audit logs 조회 API 이관 | 완료 | P1 | 최근 변경 이력 조회를 Spring Boot read-only API로 이전 | T-636 | 로컬 Spring 우선 호출과 SSR fallback 유지 |

## 현재 원칙

- GitHub Issue는 실제 실행 카드입니다.
- 문서만으로 끝나는 판단은 `docs/active`에 남기고, 구현이 필요할 때만 GitHub Issue를 만듭니다.
- 6월 중순까지 Spring Boot 전환을 시작할 수 있도록 구조 변경은 작게, API 이전은 `report summary`부터 순차적으로 진행합니다.
- Frontend는 Vercel, Spring Boot backend는 Railway를 기준으로 배포합니다.
- Railway 결제와 배포는 보류하고, 우선 로컬 Spring Boot로 API 이전과 fallback을 검증합니다.
- Spring API는 기존 Next.js API fallback을 유지한 상태에서만 production에 연결합니다.
- 로컬 Spring 소스는 다음 API 이관 전 공통 Supabase REST client와 frontend fallback helper를 기준으로 정리합니다.
- 7월 13일 전까지는 파일럿 운영 개선과 안정화를 우선합니다.
